import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source=await readFile(new URL("../functions/api/[[path]].js",import.meta.url),"utf8");
const { onRequest }=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const env={SUPABASE_URL:"https://example.supabase.co",SUPABASE_ANON_KEY:"anon-test",SUPABASE_SERVICE_ROLE_KEY:"service-test"};
test("Conteudo publicado e visivel sem expor o rascunho",async()=>{
 const original=globalThis.fetch;
 try{
   globalThis.fetch=async url=>{
     assert.match(String(url),/saluz_site_content.*select=published/);
     return new Response(JSON.stringify([{published:{top_bar:"Aviso publicado"}}]),{status:200});
   };
   const request=new Request("https://test.pages.dev/api/site-content");
   const response=await onRequest({request,env});
   assert.equal(response.status,200);
   assert.deepEqual(await response.json(),{content:{top_bar:"Aviso publicado"}});
 }finally{globalThis.fetch=original;}
});
test("Editor nao mostra conteudo privado sem sessao administrativa",async()=>{
 const request=new Request("https://test.pages.dev/api/admin/site-content");
 const response=await onRequest({request,env});
 assert.equal(response.status,401);
});
test("Editor bloqueia alteracao sem sessao administrativa",async()=>{
 const request=new Request("https://test.pages.dev/api/admin/site-content",{method:"PUT",headers:{"origin":"https://test.pages.dev","content-type":"application/json"},body:JSON.stringify({revision:0,draft:{hero_title:"Invalido"}})});
 const response=await onRequest({request,env});
 assert.equal(response.status,401);
});
test("Editor recusa envio de dados de outra origem",async()=>{
 const request=new Request("https://test.pages.dev/api/admin/site-content",{method:"PUT",headers:{"origin":"https://site-malicioso.test","content-type":"application/json"},body:"{}"});
 const response=await onRequest({request,env});
 assert.equal(response.status,403);
});