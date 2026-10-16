import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=new URL("../",import.meta.url);
const apiSource=await readFile(new URL("functions/api/[[path]].js",root),"utf8");
const {onRequest}=await import("data:text/javascript;base64,"+Buffer.from(apiSource).toString("base64"));
const origin="https://homologacao.saluz-loja.pages.dev";
const env={SUPABASE_URL:"https://db.example.supabase.co",SUPABASE_ANON_KEY:"anon-test",SUPABASE_SERVICE_ROLE_KEY:"service-test"};
const id="a925783f-af70-4cea-986f-a3b105c03562";
const bannerId="765e92c0-ef9a-4c57-889b-c32211e91b8c";
const banner={
 id:bannerId,placement:"home_before_new",style:"editorial",eyebrow:"PRESENTES",
 title:"Uma novidade especial",description:"Organize com carinho",
 button_label:"Conhecer",link:"./colecao-kits-presentes.html",image_url:"https://images.example.com/banner.jpg",
 mobile_image_url:"",active:true,starts_at:"",ends_at:""
};
function mock(){
 const calls=[];
 const fetch=async(input,options={})=>{
  const url=String(input);
  calls.push({url,method:options.method||"GET",body:options.body});
  if(url.includes("/auth/v1/user"))return new Response(JSON.stringify({id}),{status:200});
  if(url.includes("saluz_admins"))return new Response(JSON.stringify([{user_id:id}]),{status:200});
  if(url.includes("saluz_site_content")&&url.includes("select=revision"))return new Response('[{"revision":0}]',{status:200});
  if(url.includes("saluz_site_content")&&url.includes("select=published")&&!url.includes("draft"))
    return new Response(JSON.stringify([{published:{banners:[banner]},draft:{hidden:true}}]),{status:200});
  if(url.includes("saluz_site_content")&&options.method==="PATCH")return new Response(JSON.stringify([
   {draft:JSON.parse(options.body).draft,published:{},revision:1}
  ]),{status:200});
  throw Error("Unexpected upstream request "+url);
 };
 return {fetch,calls};
}
async function run(path,method,body,mockFetch,authorized=true){
 const before=globalThis.fetch;globalThis.fetch=mockFetch;
 try{
  const headers={"origin":origin,"content-type":"application/json"};
  if(authorized)headers.cookie="__Host-saluz_session=test";
  const req=new Request(origin+"/api/"+path,{method,headers,body:method==="GET"?undefined:JSON.stringify(body)});
  return await onRequest({request:req,env});
 }finally{globalThis.fetch=before;}
}
test("Campanhas: a vitrine publica tem somente dados publicados",async()=>{
 const {fetch}=mock();
 const r=await run("site-content","GET",undefined,fetch,false);
 assert.equal(r.status,200);
 const json=await r.json();
 assert.deepEqual(json.content.banners,[banner]);
 assert.equal(json.content.hidden,undefined);
 assert.equal(json.content.draft,undefined);
});
test("Campanhas: acesso ao rascunho exige sessao",async()=>{
 const {fetch}=mock();
 const r=await run("admin/site-content","GET",undefined,fetch,false);
 assert.equal(r.status,401);
});
test("Campanhas: salva banners validos mantendo somente pagina existente",async()=>{
 const {fetch,calls}=mock();
 const r=await run("admin/site-content","PUT",{revision:0,draft:{hero_title:"SALUZ",banners:[banner]}},fetch);
 assert.equal(r.status,200);
 const saved=JSON.parse(calls.find(x=>x.method==="PATCH").body).draft;
 assert.equal(saved.banners[0].link,"./colecao-kits-presentes.html");
 assert.equal(saved.banners[0].active,true);
 assert.equal(saved.hero_title,"SALUZ");
});
for(const [label,field,value] of [
 ["link externo","link","https://exemplo-inseguro.com"],
 ["pagina nova","link","./campanha-nova.html"],
 ["local fora do site","placement","nova_pagina"],
 ["HTML inserido","title","<script>alert(1)</script>"],
 ["imagem insegura","image_url","javascript:alert(1)"],
 ["data invalida","starts_at","2026-99-99"],
 ["termino anterior ao inicio","starts_at","2026-11-04T00:00:00.000Z"]
]){
 test("Campanhas rejeitam "+label,async()=>{
  const {fetch,calls}=mock();
  const b={...banner,[field]:value};
  if(label==="termino anterior ao inicio")b.ends_at="2026-11-01T00:00:00.000Z";
  const r=await run("admin/site-content","PUT",{revision:0,draft:{banners:[b]}},fetch);
  assert.equal(r.status,400);
  assert.ok(!calls.some(c=>c.method==="PATCH"),"Nenhum rascunho deve ser gravado");
 });
}
test("Campanhas: rejeitar mais de 24 banners",async()=>{
 const {fetch}=mock();
 const banners=Array.from({length:25},(_,i)=>({...banner,id:crypto.randomUUID(),title:"Campanha "+i}));
 const r=await run("admin/site-content","PUT",{revision:0,draft:{banners}},fetch);
 assert.equal(r.status,400);
});
test("Campanhas: impedir alteracoes sem sessao",async()=>{
 const {fetch}=mock();
 const r=await run("admin/site-content","PUT",{revision:0,draft:{banners:[banner]}},fetch,false);
 assert.equal(r.status,401);
});
test("Campanhas: atualizacao de rascunho requer versao atual",async()=>{
 const {fetch}=mock();
 const r=await run("admin/site-content","PUT",{revision:8,draft:{banners:[banner]}},fetch);
 assert.equal(r.status,409);
});
test("Campanhas: formatos de scripts sao validos",()=>{
 for(const file of ["saluz-campaigns.js","saluz-site-content.js","saluz-studio.js","admin.js","functions/api/[[path]].js"]){
  const path=fileURLToPath(new URL(file,root));
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path],{stdio:"pipe"}),file);
 }
});
test("Campanhas: painel contem edicao, agendamento e ofertas",async()=>{
 const html=await readFile(new URL("admin.html",root),"utf8");
 assert.match(html,/data-tab="campaigns"/);
 assert.match(html,/name="starts_at" type="datetime-local"/);
 assert.match(html,/data-market-upload="mobile_image_url"/);
 assert.match(html,/id="offers-list"/);
 assert.doesNotMatch(html,/criar nova página|adicionar nova página/i);
});
