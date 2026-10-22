import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {detectImageType,prepareMedia,moveToTrash} from "../cloudflare/storage/r2-media.mjs";
import {publicProducts,publishedSiteContent,calculateCart,storageSummary} from "../cloudflare/d1/repository.mjs";
test("migracao D1 contem todas tabelas, sem sintaxe PostgreSQL",async()=>{
 const sql=await readFile(new URL("../cloudflare/d1/0001_initial.sql",import.meta.url),"utf8");
 for(const name of ["saluz_admins","saluz_products","saluz_orders","saluz_events","saluz_site_content","saluz_login_limits","saluz_media","saluz_media_references","saluz_audit_log"])
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS "+name),name);
 assert.doesNotMatch(sql,/\bjsonb\b|\bplpgsql\b|\bcreate extension\b/i);
});
test("R2 valida assinatura da imagem e proibe producao durante migracao",async()=>{
 const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
 assert.equal(detectImageType(bytes),"image/png");
 await assert.rejects(prepareMedia({bytes,claimedType:"image/jpeg",purpose:"banner",environment:"dev"}));
 await assert.rejects(prepareMedia({bytes,claimedType:"image/png",purpose:"banner",environment:"production"}));
 const p=await prepareMedia({bytes,claimedType:"image/png",purpose:"banner",environment:"staging"});
 assert.match(p.r2_key,/^staging\/banner\/[0-9a-f]{64}\.png$/);
});
test("consultas D1 parametrizadas e conversao do json",async()=>{
 let query="",args;
 const db={prepare(sql){query=sql;return {bind(...a){args=a;return {async all(){return {results:[{id:"test",variants:'[{"stock":2}]',is_active:1,is_featured:0}]}}}}}}};
 const rows=await publicProducts(db,{category:"Nécessaires",page:1,limit:5});
 assert.equal(rows.products[0].variants[0].stock,2);
 assert.match(query,/category=\?/);assert.deepEqual(args,["Nécessaires",6,0]);
 await assert.rejects(publicProducts(db,{category:"qualquer' OR 1=1"}));
});
test("D1 subtotal ignora qualquer preco enviado pelo navegador",async()=>{
 const id="90000000-0000-4000-8000-000000000001";
 const db={prepare:()=>({bind:()=>({first:async()=>({id,name:"Teste",price_cents:8990,variants:'[{"color":"Rosa","size":"Único","stock":5}]',is_active:1,is_featured:0})})})};
 const result=await calculateCart(db,[{id,color:"Rosa",size:"Único",quantity:2,price_cents:1}]);
 assert.equal(result.subtotal_cents,17980);assert.equal(result.payment_enabled,false);
});
test("estatisticas marcam estimativa e nao inventam quota",async()=>{
 const db={prepare(sql){return sql.includes("GROUP BY")?{all:async()=>({results:[]})}:{first:async()=>({files:0,bytes:0})}}};
 const summary=await storageSummary(db);assert.equal(summary.percent_of_quota,null);assert.equal(summary.estimated,true);
});
test("exclusao nunca e fisica e requer confirmacao e falta de vinculos",async()=>{
 let changes=0,audits=0;
 const db={prepare(sql){return {bind(){return {run:async()=>{if(sql.startsWith("UPDATE"))return {meta:{changes}};audits++;return {success:true};}}}}}};
 const ids={mediaId:"90000000-0000-4000-8000-000000000001",adminId:"90000000-0000-4000-8000-000000000002"};
 await assert.rejects(moveToTrash({db,...ids,confirmed:false}));
 await assert.rejects(moveToTrash({db,...ids,confirmed:true}));
 changes=1;
 const res=await moveToTrash({db,...ids,confirmed:true});
 assert.equal(res.physicalDeletion,false);assert.equal(audits,1);
});


test("KV valida imagens de até 500 KB e isolamento entre ambientes",async()=>{
 const {validateAndNameImage,imageMime}=await import("../cloudflare/storage/kv-media.mjs");
 const sample=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
 assert.equal(imageMime(sample),"image/png");
 const result=await validateAndNameImage({bytes:sample,claimedType:"image/png",environment:"staging",purpose:"banner"});
 assert.match(result.key,/^staging\/banner\/[0-9a-f]{64}\.png$/);
 await assert.rejects(validateAndNameImage({bytes:sample,claimedType:"image/jpeg",environment:"staging",purpose:"banner"}));
 await assert.rejects(validateAndNameImage({bytes:new Uint8Array(500001),claimedType:"image/png",environment:"staging",purpose:"banner"}));
 await assert.rejects(validateAndNameImage({bytes:sample,claimedType:"image/png",environment:"production",purpose:"banner"}));
});
