import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=new URL("../",import.meta.url);
const code=await readFile(new URL("functions/api/[[path]].js",root),"utf8");
const proxy=await readFile(new URL("admin-deploy/functions/api/[[path]].js",root),"utf8");
const {onRequest}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const env={SUPABASE_URL:"https://supabase.example.test",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"};
const origin="https://homologacao.saluz-loja.pages.dev";
const sample=[
  {id:"57b0d58a-49d8-4c24-b6c0-2ec1e6b91b29",name:"Nécessaire Rosa",category:"Nécessaires",is_active:true,is_featured:true,price_cents:7990,original_price_cents:9990,variants:[{stock:3}],image_url:""},
  {id:"2504123f-84ab-4995-a5cb-b04706cfa326",name:"Kit presente",category:"Kits e presentes",is_active:true,is_featured:false,price_cents:15000,original_price_cents:null,variants:[{stock:0}],image_url:""},
  {id:"a9f61729-285a-47d5-b444-b66ceafc79a0",name:"Porta joias",category:"Porta-joias",is_active:false,is_featured:false,price_cents:12900,original_price_cents:null,variants:[{stock:12}],image_url:""}
];
const adminId="65d03447-657f-4605-a1bf-36a8595167ae";
function backend(){
  const calls=[];
  const fakeFetch=async(input,opts={})=>{
    const url=String(input);calls.push({url,opts});
    if(url.includes("auth/v1/user"))return new Response(JSON.stringify({id:adminId}),{status:200});
    if(url.includes("saluz_admins"))return new Response(JSON.stringify([{user_id:adminId}]),{status:200});
    if(url.includes("saluz_products")&&url.includes("select=id,name"))return new Response(JSON.stringify(sample),{status:200});
    if(url.includes("saluz_site_content"))return new Response(JSON.stringify([{
      published:{banners:[{active:true},{active:true,starts_at:"2099-01-01T00:00:00.000Z"}]},
      draft:{banners:[]},published_at:"2026-10-01T00:00:00Z"
    }]),{status:200});
    if(url.includes("saluz_products")&&url.includes("name.ilike"))return new Response(JSON.stringify(sample.slice(0,1)),{status:200});
    throw Error("Unexpected upstream "+url);
  };
  return {calls,fakeFetch};
}
async function request(path,fetchFn,cookie=true){
  const before=globalThis.fetch;
  globalThis.fetch=fetchFn;
  try{
    const headers={origin};
    if(cookie)headers.cookie="__Host-saluz_session=valid-token";
    return await onRequest({request:new Request(origin+"/api/"+path,{headers}),env});
  }finally{globalThis.fetch=before;}
}
test("Resumo profissional exige autenticacao administrativa",async()=>{
  const {fakeFetch}=backend();
  const response=await request("admin/store-health",fakeFetch,false);
  assert.equal(response.status,401);
});
test("Resumo mostra catalogo e estoque sem dados de clientes",async()=>{
  const {fakeFetch}=backend();
  const response=await request("admin/store-health",fakeFetch);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.counts.total,3);
  assert.equal(data.counts.active,2);
  assert.equal(data.counts.hidden,1);
  assert.equal(data.counts.lowStock,1);
  assert.equal(data.counts.outOfStock,1);
  assert.equal(data.counts.onSale,1);
  assert.equal(data.activeBanners,1);
  assert.equal(data.scheduledBanners,1);
  assert.equal(data.unpublished,true);
  assert.deepEqual(data.lowStockItems.map(x=>x.stock),[3,0]);
  assert.ok(!JSON.stringify(data).includes("customer_email"));
});
test("Pesquisa remota filtra produtos sem aceitar sintaxe insegura",async()=>{
  const {fakeFetch,calls}=backend();
  const response=await request("admin/products?page=1&search="+encodeURIComponent("Nécessaire Rosa"),fakeFetch);
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.products.length,1);
  assert.ok(calls.some(c=>c.url.includes("or=")&&c.url.includes("name.ilike")));
});
test("Pesquisa rejeita parametros de filtros arbitrarios",async()=>{
  const {fakeFetch}=backend();
  const response=await request("admin/products?page=1&search="+encodeURIComponent("a*)") ,fakeFetch);
  assert.equal(response.status,400);
});
test("Proxy da aplicacao administrativa restringe o endpoint privado",()=>{
  assert.match(proxy,/site-content","store-health"/);
});
test("Scripts editados possuem sintaxe valida",()=>{
  for(const file of ["saluz-professional.js","admin.js","functions/api/[[path]].js","admin-deploy/functions/api/[[path]].js"]){
    assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",fileURLToPath(new URL(file,root))],{stdio:"pipe"}),file);
  }
});
test("Painel expõe os controles implementados",async()=>{
  const html=await readFile(new URL("admin.html",root),"utf8");
  for(const id of ["admin-quick-search","admin-search-suggestions","overview-health-kpis","overview-attention-list","health-refresh","product-export-csv"]){
    assert.ok(html.includes('id="'+id+'"'),"Elemento faltante: "+id);
  }
  assert.ok(html.indexOf("saluz-professional.css")>html.indexOf("saluz-campaigns.css"),"Novo tema deve ser o ultimo");
  assert.match(html,/data-tab="campaigns"/);
  assert.match(html,/data-tab="studio"/);
});
