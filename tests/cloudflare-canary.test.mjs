import test from "node:test";
import assert from "node:assert/strict";
import {onRequestGet as health} from "../functions/api/migration-health.js";
import {onRequestGet as catalog} from "../functions/api/migration-catalog.js";
const stage="https://homologacao.saluz-loja.pages.dev";
const production="https://usesaluz.com.br";
const database={
 prepare(sql){
   if(sql.includes("COUNT"))return {first:async()=>({
     product_count:0,active_products:0,registered_images:0,content_rows:1
   })};
   return {bind:()=>({all:async()=>({results:[]})})};
 }
};
const media={get:async()=>null};
test("migração isolada não responde como produção",async()=>{
 for(const f of [health,catalog]){
  const r=await f({request:new Request(production+"/api/migration-health"),env:{
   SALUZ_D1_PREVIEW:database,SALUZ_MEDIA_PREVIEW:media
  }});
  assert.equal(r.status,404);
 }
});
test("sem bindings staging falha fechado, pagamentos continuam desativados",async()=>{
 const r=await health({request:new Request(stage+"/api/migration-health"),env:{}});
 assert.equal(r.status,503);
 const body=await r.json();assert.equal(body.payments_enabled,false);
});
test("diagnóstico confirma D1 e KV sem mostrar pedidos ou administradores",async()=>{
 const response=await health({request:new Request(stage+"/api/migration-health"),env:{
  SALUZ_D1_PREVIEW:database,SALUZ_MEDIA_PREVIEW:media
 }});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.deepEqual(data.counts,{products:0,active_products:0,registered_images:0});
 assert.equal(data.ready,true);
 assert.equal(data.payments_enabled,false);
 assert.equal(response.headers.get("x-robots-tag"),"noindex, nofollow");
 assert.equal(JSON.stringify(data).includes("customer_email"),false);
});
test("catálogo experimental nunca publica pedidos, preços do navegador ou checkout",async()=>{
 const response=await catalog({request:new Request(stage+"/api/migration-catalog?page=1&limit=12"),env:{
  SALUZ_D1_PREVIEW:database
 }});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.source,"D1 staging");
 assert.equal(data.payments_enabled,false);
 assert.deepEqual(data.products,[]);
});
test("catálogo experimental valida paginação",async()=>{
 const response=await catalog({request:new Request(stage+"/api/migration-catalog?page=-1"),env:{
  SALUZ_D1_PREVIEW:database
 }});
 assert.equal(response.status,400);
});
