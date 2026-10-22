import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {onAdminRequest,onPublicMediaGet} from "../cloudflare/d1/staging-admin.mjs";

const base="https://homologacao.saluz-loja.pages.dev";
const build=(path,options={})=>new Request(base+"/api/migration-admin/"+path,options);
const validProduct=raw=>({name:raw.name,description:raw.description||"",category:raw.category,
 image_url:raw.image_url||"",price_cents:raw.price_cents,original_price_cents:raw.original_price_cents??null,
 variants:raw.variants||[],is_active:!!raw.is_active,is_featured:!!raw.is_featured,updated_at:new Date().toISOString()});
const prod={name:"Nécessaire teste",description:"Teste D1",category:"Nécessaires",image_url:"",
 price_cents:7900,original_price_cents:null,variants:[{color:"Rosa",size:"Único",stock:3,image_url:""}],
 is_active:false,is_featured:false};
test("rotas de migração não funcionam no domínio de produção",async()=>{
 const db={prepare(){throw Error("Should never access DB")}};
 const r=await onAdminRequest({request:new Request("https://usesaluz.com.br/api/migration-admin/products"),
 env:{SALUZ_D1_PREVIEW:db,SALUZ_MEDIA_PREVIEW:{get(){}}},route:"products",validateProduct:validProduct});
 assert.equal(r.status,404);
});
test("sem bindings da Cloudflare, migração falha fechada",async()=>{
 const r=await onAdminRequest({request:build("products"),env:{},route:"products",validateProduct:validProduct});
 assert.equal(r.status,404);
});
test("criação D1 usa parâmetros e não publica no catálogo original",async()=>{
 const sqls=[];const db={prepare(sql){sqls.push(sql);return {bind(...params){return {
  run:async()=>({success:true,meta:{changes:1}}),
  first:async()=>({id:params[0],...prod,variants:JSON.stringify(prod.variants),is_active:0,is_featured:0,revision:0})
 }}}}};
 const r=await onAdminRequest({request:build("products",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(prod)}),
  env:{SALUZ_D1_PREVIEW:db,SALUZ_MEDIA_PREVIEW:{get(){}}},route:"products",validateProduct:validProduct});
 assert.equal(r.status,201);
 const body=await r.json();assert.equal(body.product.is_active,false);
 assert.ok(sqls.some(x=>x.includes("INSERT INTO saluz_products")&&x.includes("?")));
 assert.equal(body.product.name,"Nécessaire teste");
});
test("revisão de produto evita sobrescrita silenciosa",async()=>{
 const db={prepare(sql){return {bind(){return {run:async()=>({meta:{changes:0}})}}}}};
 const r=await onAdminRequest({request:build("products/90000000-0000-4000-8000-000000000001",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...prod,revision:3})}),
  env:{SALUZ_D1_PREVIEW:db,SALUZ_MEDIA_PREVIEW:{get(){}}},route:"products/90000000-0000-4000-8000-000000000001",validateProduct:validProduct});
 assert.equal(r.status,409);
});
test("rascunho editorial não é publicado automaticamente",async()=>{
 let q="";
 const db={prepare(sql){q=sql;return {bind(){return {run:async()=>({meta:{changes:1}})}}}}};
 const r=await onAdminRequest({request:build("content",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({revision:0,draft:{hero_title:"Teste"}})}),
  env:{SALUZ_D1_PREVIEW:db,SALUZ_MEDIA_PREVIEW:{get(){}}},route:"content",validateProduct:validProduct});
 assert.equal(r.status,200);assert.equal((await r.json()).published,false);
 assert.ok(q.includes("SET draft"));assert.ok(!q.includes("SET published"));
});
test("proxy e gateway exigem autenticação antes de chamar o laboratório",async()=>{
 const source=(await readFile(new URL("../functions/api/[[path]].js",import.meta.url),"utf8"));
 const idx=source.indexOf('if(route[0]==="migration-admin")');
 assert.ok(idx>0);
 const sub=source.slice(idx,idx+420);
 assert.match(sub,/await isAdmin\(request,env\)/);
 assert.match(sub,/onAdminRequest/);
 const proxy=await readFile(new URL("../admin-deploy/functions/api/[[path]].js",import.meta.url),"utf8");
 assert.match(proxy,/migration-admin/);
 assert.match(proxy,/migration-media/);
});
test("página de administração só anuncia o recurso na homologação",async()=>{
 const html=await readFile(new URL("../admin.html",import.meta.url),"utf8");
 assert.match(html,/migration-lab\.html/);
 const lab=await readFile(new URL("../migration-lab.html",import.meta.url),"utf8");
 assert.match(lab,/noindex/);
 assert.match(lab,/Somente homologação/);
});
test("sem media configurada o endpoint público não publica arquivo",async()=>{
 const r=await onPublicMediaGet({request:new Request(base+"/api/migration-media?key=staging/x"),env:{}});
 assert.equal(r.status,404);
});

test("edição real pelo painel D1 salva data do servidor e nova revisão sem updated_at do cliente",async()=>{
 const id="90000000-0000-4000-8000-000000000001";
 let updatedValues=null;
 const row={id,name:prod.name,description:prod.description,category:prod.category,image_url:"",
  price_cents:prod.price_cents,original_price_cents:null,variants:JSON.stringify(prod.variants),
  is_active:1,is_featured:0,revision:4};
 // A validação real devolve o produto normalizado, sem campo updated_at.
 const normalized=raw=>({...raw});
 const db={prepare(sql){
  return {bind(...values){
   if(sql.startsWith("UPDATE saluz_products")){
    updatedValues=values;
    return {run:async()=>({success:true,meta:{changes:1}})};
   }
   if(sql.startsWith("SELECT * FROM saluz_products")){
    return {first:async()=>row};
   }
   throw Error("Query inesperada: "+sql);
  }};
 }};
 const request=build("products/"+id,{
  method:"PATCH",headers:{"content-type":"application/json"},
  body:JSON.stringify({...prod,is_active:true,revision:3})
 });
 const result=await onAdminRequest({request,
  env:{SALUZ_D1_PREVIEW:db,SALUZ_MEDIA_PREVIEW:{get(){}}},route:"products/"+id,validateProduct:normalized});
 assert.equal(result.status,200);
 const saved=(await result.json()).product;
 assert.equal(saved.revision,4);
 assert.equal(saved.is_active,true);
 assert.equal(updatedValues.length,12);
 assert.ok(updatedValues.every(v=>v!==undefined),"D1 não aceita valor undefined");
 assert.equal(updatedValues[10],id);
 assert.equal(updatedValues[11],3);
 assert.equal(new Date(updatedValues[9]).toISOString(),updatedValues[9]);
});
