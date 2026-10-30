import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {storeHealthD1} from "../cloudflare/d1/store-health.mjs";
import {onAdminRequest} from "../cloudflare/d1/staging-admin.mjs";
const date="2026-10-30T15:00:00.000Z",time=Date.parse(date);
const uuid=n=>n+"0000000-0000-4000-8000-000000000001";
const makeProduct=({id="10000000-0000-4000-8000-000000000001",name="Organizador",active=1,
 featured=0,stocks=[4],price=10000,original=null}={})=>({
 id,name,category:"Nécessaires",image_url:"",is_active:active,is_featured:featured,
 price_cents:price,original_price_cents:original,
 variants:JSON.stringify(stocks.map((stock,i)=>({color:"Rosa",size:"T"+i,stock})))
});
const banner=(active,starts_at=null,ends_at=null)=>({active,starts_at,ends_at});
function mockDb(rows,content={}){
 const calls=[];
 const data={draft:JSON.stringify(content.draft||{}),
  published:JSON.stringify(content.published||{}),published_at:null};
 return {calls,
  prepare(sql){
   calls.push(sql);
   return {
    bind(...args){
     return {all:async()=>({results:rows.slice(args[1],args[1]+args[0])})};
    },
    first:async()=>data
   };
  }
 };
}
test("D1: resumo e vitrine compartilham saluz_products, sem Supabase ou escrita",async()=>{
 const rows=[
  makeProduct({id:"10000000-0000-4000-8000-000000000001",featured:1,stocks:[2,2],original:18000}),
  makeProduct({id:"20000000-0000-4000-8000-000000000001",active:0,stocks:[0]}),
  makeProduct({id:"30000000-0000-4000-8000-000000000001",stocks:[0]})
 ];
 const db=mockDb(rows,{
  draft:{hero_title:"Rascunho"},
  published:{hero_title:"Publicado",banners:[
   banner(true),banner(true,"2026-11-20T10:00:00Z"),
   banner(true,null,"2026-10-20T10:00:00Z"),banner(false)
  ]}
 });
 const result=await storeHealthD1(db,{now:time});
 assert.equal(result.source,"D1 staging");
 assert.equal(result.checkout_enabled,false);
 assert.deepEqual(result.counts,{total:3,active:2,hidden:1,featured:1,onSale:1,lowStock:1,outOfStock:1});
 assert.equal(result.lowStockItems.length,2);
 assert.deepEqual(result.lowStockItems.map(i=>i.stock),[4,0]);
 assert.equal(result.activeBanners,1);
 assert.equal(result.scheduledBanners,1);
 assert.equal(result.unpublished,true);
 assert.equal(result.updatedAt,date);
 assert.equal(result.truncated,false);
 assert.ok(db.calls.every(sql=>/^SELECT /.test(sql)));
 assert.ok(db.calls.every(sql=>!sql.includes("supabase")));
});
test("D1: exatamente 2000 itens completos vs 2001: resumo parcial é sinalizado",async()=>{
 for(const [count,truncated] of [[2000,false],[2001,true]]){
  const row=makeProduct();
  const db=mockDb(Array(count).fill(row));
  const result=await storeHealthD1(db);
  assert.equal(result.counts.total,Math.min(count,2000));
  assert.equal(result.truncated,truncated);
  assert.equal(db.calls.filter(sql=>sql.includes("FROM saluz_products")).length,10);
 }
});
test("D1: não mascara JSON de variantes, stock negativo ou conteúdo ausente",async()=>{
 const negative=makeProduct({stocks:[-1]});
 await assert.rejects(()=>storeHealthD1(mockDb([negative])),/Estoque D1 inválido/);
 const bad=makeProduct();bad.variants="{}";
 await assert.rejects(()=>storeHealthD1(mockDb([bad])),/Catálogo D1 inválido/);
 const db={prepare:sql=>({bind:()=>({all:async()=>({results:[]})}),first:async()=>null})};
 await assert.rejects(()=>storeHealthD1(db),/não inicializado/);
});
test("Rota real do laboratório só fornece o resumo sob hostname de staging",async()=>{
 const db=mockDb([makeProduct()]);
 const makeRequest=hostname=>new Request("https://"+hostname+"/api/migration-admin/store-health");
 const args={env:{SALUZ_D1_PREVIEW:db,SALUZ_MEDIA_PREVIEW:{get:async()=>null}},
  validateProduct:()=>{throw Error("Não pode ser invocado")}};
 const ok=await onAdminRequest({request:makeRequest("homologacao.saluz-loja.pages.dev"),route:"store-health",...args});
 assert.equal(ok.status,200);
 const json=await ok.json();
 assert.equal(json.counts.total,1);
 assert.equal(json.checkout_enabled,false);
 assert.equal(ok.headers.get("cache-control"),"no-store");
 const denied=await onAdminRequest({request:makeRequest("usesaluz.com.br"),route:"store-health",...args});
 assert.equal(denied.status,404);
 const post=await onAdminRequest({request:new Request("https://homologacao.saluz-loja.pages.dev/api/migration-admin/store-health",{method:"POST"}),route:"store-health",...args});
 assert.equal(post.status,404);
});
test("Roteador exige administrador antes de acessar migration-admin e proxy só aceita GET Preview",()=>{
 const main=readFileSync("functions/api/[[path]].js","utf8");
 const proxy=readFileSync("admin-deploy/functions/api/[[path]].js","utf8");
 const admin=readFileSync("saluz-professional.js","utf8");
 const index=main.indexOf('if(route[0]==="migration-admin")');
 const auth=main.indexOf('if(!(await isAdmin(request,env)))',index);
 const handler=main.indexOf('onAdminRequest({request,env',index);
 assert.ok(index>=0&&auth>index&&handler>auth);
 assert.match(proxy,/"migration-admin":new Set\(\["products","content","storage","upload","store-health"\]\)/);
 assert.match(proxy,/endpoint==="store-health"/);
 assert.match(proxy,/target!=="https:\/\/homologacao\.saluz-loja\.pages\.dev"/);
 assert.match(admin,/d1Preview\?"\/api\/migration-admin\/store-health":"\/api\/admin\/store-health"/);
 assert.match(admin,/Fonte: banco D1 de homologação/);
 assert.ok(!admin.includes('fetch("/api/admin/store-health"'));
});
