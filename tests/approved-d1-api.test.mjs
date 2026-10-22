import test from "node:test";
import assert from "node:assert/strict";
import {previewD1Requested,approvedProductsFromD1} from "../cloudflare/d1/approved-api.mjs";
const staging="https://homologacao.saluz-loja.pages.dev";
const production="https://usesaluz.com.br";
const a="a0a00000-0000-4000-8000-000000000001";
const b="a0a00000-0000-4000-8000-000000000002";
const sample=[
 {id:a,name:"Produto D1",price_cents:8790,original_price_cents:9990,variants:'[{"color":"Rosa","size":"Único","stock":3}]',is_active:1,is_featured:1},
 {id:b,name:"Produto B",price_cents:5990,original_price_cents:null,variants:"[]",is_active:1,is_featured:0}
];
const queries=[];
const db={prepare(sql){queries.push(sql);return {
 bind(...args){return {all:async()=>({results:sql.includes("id IN")?sample.filter(s=>args.includes(s.id)):sample.slice(0,args[0]||24)}),
 first:async()=>sample.find(s=>s.id===args[0])||null};},
 all:async()=>({results:sql.includes("is_featured=1")?[sample[0]]:sample})
 };}};
const get=async(route,path)=>approvedProductsFromD1({request:new Request(staging+path),env:{SALUZ_D1_PREVIEW:db},route});
test("D1 opt-in autorizado só no hostname exato da homologação",()=>{
 assert.equal(previewD1Requested(new Request(staging+"/api/products?source=d1")),true);
 for(const url of [production+"/api/products?source=d1",staging+"/api/products",
   "https://homologacao.saluz-loja.pages.dev.attacker.invalid/api/products?source=d1"])
   assert.equal(previewD1Requested(new Request(url)),false);
});
test("catálogo segue o mesmo contrato da vitrine aprovada",async()=>{
 const res=await get(["products"],"/api/products?source=d1&page=1&limit=24");
 const data=await res.json();
 assert.equal(res.status,200);assert.equal(data.configured,true);
 assert.equal(data.page,1);assert.equal(data.limit,24);assert.equal(data.products[0].is_active,true);
 assert.equal(data.products[0].price_cents,8790);
 assert.equal(data.products[0].variants[0].color,"Rosa");
 assert.equal(JSON.stringify(data).includes("payment_enabled"),false);
});
test("home entrega destaques e novidades sem duplicação",async()=>{
 const res=await get(["products","home"],"/api/products/home?source=d1");
 const data=await res.json();
 assert.deepEqual(data.featured.map(x=>x.id),[a]);assert.deepEqual(data.newest.map(x=>x.id),[b]);
});
test("favoritos são filtrados com consultas parametrizadas",async()=>{
 const res=await get(["products","favorites"],"/api/products/favorites?source=d1&ids="+a+","+b);
 const data=await res.json();
 assert.equal(data.products.length,2);
 assert.ok(queries.some(sql=>sql.includes("id IN (?,?)")));
 const fail=await get(["products","favorites"],"/api/products/favorites?source=d1&ids=' OR 1=1");
 assert.equal(fail.status,400);
});
test("detalhe exibe produto válido e rejeita UUID incorreto",async()=>{
 const product=await get(["products",a],"/api/products/"+a+"?source=d1");
 assert.equal((await product.json()).product.id,a);
 const invalid=await get(["products","abc"],"/api/products/abc?source=d1");
 assert.equal(invalid.status,404);
});
test("ausência do binding D1 não retorna dados Supabase no modo de testes",async()=>{
 const r=await approvedProductsFromD1({request:new Request(staging+"/api/products?source=d1"),env:{},route:["products"]});
 assert.equal(r.status,503);
});
