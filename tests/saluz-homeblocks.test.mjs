import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const root=new URL("../",import.meta.url);
const src=await readFile(new URL("functions/api/[[path]].js",root),"utf8");
const {onRequest}=await import("data:text/javascript;base64,"+Buffer.from(src).toString("base64"));
const origin="https://homologacao.saluz-loja.pages.dev";
const env={SUPABASE_URL:"https://example.supabase.co",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"};
const admin="da295ce8-8d53-4ad4-87bd-e7d531014836";
async function update(draft){
 const orig=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,options={})=>{
  const path=String(input);
  calls.push({path,method:options.method||"GET",body:options.body});
  if(path.includes("/auth/v1/user"))return new Response(JSON.stringify({id:admin}),{status:200});
  if(path.includes("saluz_admins"))return new Response(JSON.stringify([{user_id:admin}]),{status:200});
  if(path.includes("select=revision"))return new Response('[{"revision":0}]',{status:200});
  if(options.method==="PATCH")return new Response(JSON.stringify([{draft:JSON.parse(options.body).draft,revision:1}]),{status:200});
  throw Error("Unexpected: "+path);
 };
 try{
  const res=await onRequest({env,request:new Request(origin+"/api/admin/site-content",{
   method:"PUT",headers:{origin, "content-type":"application/json",cookie:"__Host-saluz_session=test"},
   body:JSON.stringify({revision:0,draft})
  })});
  return {res,calls};
 }finally{globalThis.fetch=orig;}
}
test("Cards fixos: editar textos, fotos e destinos existentes",async()=>{
 const {res,calls}=await update({
  moment_label:"ROTINA",moment_title:"Organize tudo",
  moment_image_url:"https://example.com/img.jpg",
  moment_link1_title:"Presentes",moment_link1_href:"./colecao-kits-presentes.html",
  gift_title:"Presentear",gift_link:"#kits",
  kits_title:"Nossa seleção",kit1_title:"Uma rotina mais leve",
  kit1_link:"./colecao-autocuidado.html"
 });
 assert.equal(res.status,200);
 const saved=JSON.parse(calls.find(c=>c.method==="PATCH").body).draft;
 assert.equal(saved.gift_link,"#kits");
 assert.equal(saved.moment_link1_href,"./colecao-kits-presentes.html");
 assert.equal(saved.kit1_title,"Uma rotina mais leve");
});
test("Cards fixos: rejeitar pagina nao existente",async()=>{
 const {res,calls}=await update({kit2_link:"./nova-pagina.html"});
 assert.equal(res.status,400);
 assert.equal(calls.some(c=>c.method==="PATCH"),false);
});
test("Cards fixos: rejeitar HTML em chamada",async()=>{
 const {res,calls}=await update({gift_title:"<svg onload=alert(1)>"});
 assert.equal(res.status,400);
 assert.equal(calls.some(c=>c.method==="PATCH"),false);
});
test("Cards fixos: disponibilidade no editor sem criar paginas",async()=>{
 const html=await readFile(new URL("admin.html",root),"utf8");
 assert.match(html,/data-studio-section="homeblocks"/);
 assert.match(html,/name="moment_image_url"/);
 assert.match(html,/name="gift_image_url"/);
 assert.match(html,/name="kit3_link"/);
 assert.doesNotMatch(html,/adicionar nova página|criar nova página/i);
});
