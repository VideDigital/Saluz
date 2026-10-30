import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {handleStagingContent} from "../cloudflare/d1/staging-content.mjs";
import {validateSiteContent} from "../cloudflare/d1/content-validation.mjs";

const host="https://homologacao.saluz-loja.pages.dev";
const banner={
 id:"765e92c0-ef9a-4c57-889b-c32211e91b8c",
 placement:"home_before_new",style:"editorial",eyebrow:"PRESENTES",
 title:"Uma novidade especial",description:"Organize com carinho",
 button_label:"Conhecer",link:"./colecao-kits-presentes.html",
 image_url:"https://images.example.com/banner.jpg",mobile_image_url:"",
 active:true,starts_at:"",ends_at:""
};
function dbMock(init={draft:{},published:{},revision:0,updated_at:null,published_at:null}){
 const data={...init},queries=[],writes=[];
 return {queries,writes,state:data,
 prepare(sql){
  queries.push(sql);
  return {
   first:async()=>({...data,draft:JSON.stringify(data.draft),published:JSON.stringify(data.published)}),
   bind(...args){
    return {run:async()=>{
     writes.push({sql,args});
     const suppliedRevision=args.at(-1);
     if(suppliedRevision!==data.revision)return {meta:{changes:0}};
     const now=args.length===3?args[1]:args[0];
     if(sql.includes("published=draft")){data.published=structuredClone(data.draft);data.published_at=args[0];}
     else if(sql.includes("draft=published"))data.draft=structuredClone(data.published);
     else data.draft=JSON.parse(args[0]);
     data.revision++;
     data.updated_at=now;
     return {meta:{changes:1}};
    }};
   }
  };
 }
 };
}
function req(method,route="",body,base=host){
 return new Request(base+"/api/migration-admin/"+(route||"content"),{
  method,
  headers:body?{"content-type":"application/json"}:{},
  body:body?JSON.stringify(body):undefined
 });
}
const call=(db,method,route,body,base)=>handleStagingContent({db,request:req(method,route,body,base),route:route||"content"});

test("GET retorna somente estado de conteúdo D1 e não escreve",async()=>{
 const db=dbMock();
 const r=await call(db,"GET");
 assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(result.source,"D1 staging");
 assert.equal(result.checkout_enabled,false);
 assert.deepEqual(result.content.draft,{});
 assert.equal(db.writes.length,0);
 assert.equal(r.headers.get("cache-control"),"no-store");
});
test("PUT grava draft com validação completa e revisões sem publicar",async()=>{
 const db=dbMock();
 const result=await call(db,"PUT","content",{revision:0,draft:{
  hero_title:"Uma loja da SALUZ",banners:[banner],instagram_url:"https://instagram.com/saluz",
  whatsapp_number:"(11) 99999-8888",promo_enabled:"no"
 }});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.content.revision,1);
 assert.equal(db.state.published_at,null);
 assert.deepEqual(db.state.published,{});
 assert.equal(db.state.draft.whatsapp_number,"11999998888");
 assert.equal(db.state.draft.banners[0].active,true);
 assert.ok(db.writes.every(x=>x.sql.includes("WHERE id=1 AND revision=?")));
});
test("POST publish aplica somente draft validado de forma atômica",async()=>{
 const db=dbMock();
 await call(db,"PUT","content",{revision:0,draft:{hero_title:"Publicado",banners:[banner]}});
 const r=await call(db,"POST","content/publish",{revision:1});
 assert.equal(r.status,200);
 assert.equal(db.state.revision,2);
 assert.equal(db.state.published.hero_title,"Publicado");
 assert.equal(db.state.published.banners[0].title,banner.title);
 assert.ok(db.state.published_at.endsWith("Z"));
 assert.ok(db.writes.at(-1).sql.includes("published=draft"));
});
test("POST discard volta para conteúdo publicado sem alterar publicação",async()=>{
 const db=dbMock({draft:{hero_title:"Alteração"},published:{hero_title:"Publicado"},revision:2,
  published_at:"2026-10-20T00:00:00.000Z"});
 const r=await call(db,"POST","content/discard",{revision:2});
 assert.equal(r.status,200);
 assert.equal(db.state.revision,3);
 assert.equal(db.state.draft.hero_title,"Publicado");
 assert.equal(db.state.published.hero_title,"Publicado");
 assert.equal(db.state.published_at,"2026-10-20T00:00:00.000Z");
});
test("nunca publica rascunho vazio ou anula o conteúdo publicado anterior",async()=>{
 const db=dbMock({draft:{},published:{hero_title:"Anterior"},revision:3});
 const r=await call(db,"POST","content/publish",{revision:3});
 assert.equal(r.status,409);
 assert.equal(db.writes.length,0);
 assert.equal(db.state.published.hero_title,"Anterior");
});
test("bloqueia atualizações de outra sessão sem sobrescrever conteúdo",async()=>{
 const db=dbMock({draft:{hero_title:"A"},published:{},revision:5});
 for(const [method,route,body] of [
  ["PUT","content",{revision:3,draft:{hero_title:"B"}}],
  ["POST","content/publish",{revision:3}],
  ["POST","content/discard",{revision:3}]
 ]){
  const r=await call(db,method,route,body);
  assert.equal(r.status,409);
 }
 assert.equal(db.writes.length,0);
 assert.equal(db.state.revision,5);
});
test("bloqueia HTML, páginas externas, banners inválidos e link malicioso sem escrever",async()=>{
 const db=dbMock();
 for(const data of [
  {hero_title:"<script>alert(1)</script>"},
  {hero_link:"https://evil.example"},
  {banners:[{...banner,link:"./pagina-inventada.html"}]},
  {banners:[{...banner,image_url:"javascript:alert(1)"}]},
  {banners:[{...banner,starts_at:"2026-99-99"}]},
  {banners:[{...banner,id:"não-uuid"}]},
  {banners:Array.from({length:25},()=>banner)},
  {dangerous_command:"DROP TABLE saluz_products"}
 ]){
  const r=await call(db,"PUT","content",{revision:0,draft:data});
  assert.equal(r.status,400);
 }
 assert.equal(db.writes.length,0);
});
test("preserva contrato de banner e campos editoriais do legado",()=>{
 const x=validateSiteContent({
  hero_title:"SALUZ",gift_link:"#kits",promo_enabled:"no",banners:[banner],
  moment_image_url:"https://images.example.com/p.jpg",
  kit1_title:"Kit novo",top_bar:"Organize"
 });
 assert.equal(x.hero_title,"SALUZ");
 assert.equal(x.banners[0].link,banner.link);
 assert.equal(x.gift_link,"#kits");
 assert.ok(Object.keys(x).length>30);
});
test("só responde no domínio de homologação e em rotas/métodos esperados",async()=>{
 const db=dbMock();
 for(const hostOrRoute of [
  {base:"https://usesaluz.com.br",method:"GET",route:"content"},
  {base:host,method:"DELETE",route:"content"},
  {base:host,method:"GET",route:"content/publish"}
 ]){
  const r=await call(db,hostOrRoute.method,hostOrRoute.route,undefined,hostOrRoute.base);
  assert.equal(r.status,404);
 }
 assert.equal(db.writes.length,0);
});
test("gateway privado mantém autorização prévia e proxy não expõe rotas em produção",()=>{
 const proxy=readFileSync("admin-deploy/functions/api/[[path]].js","utf8");
 const api=readFileSync("functions/api/[[path]].js","utf8");
 const d1=readFileSync("cloudflare/d1/staging-admin.mjs","utf8");
 const first=api.indexOf('if(route[0]==="migration-admin")');
 assert.ok(first>=0);
 assert.ok(api.indexOf('await isAdmin(request,env)',first)<api.indexOf('onAdminRequest({request,env',first));
 assert.match(proxy,/endpoint==="content"/);
 assert.match(proxy,/url\.hostname!=="homologacao\.saluz-admin\.pages\.dev"/);
 assert.match(proxy,/\["publish","discard"\]/);
 assert.match(d1,/handleStagingContent\(\{request,db,route\}\)/);
});
