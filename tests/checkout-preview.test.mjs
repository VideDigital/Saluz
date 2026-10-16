import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const code=await readFile(new URL("../functions/api/[[path]].js",import.meta.url),"utf8");
const {onRequest}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const validId="f31e8a5b-c790-4f64-8b68-ce220784c101";
const preview="https://homologacao.saluz-loja.pages.dev";
const production="https://usesaluz.com.br";
const env={SUPABASE_URL:"https://demo.invalid",SUPABASE_ANON_KEY:"anon-test",SUPABASE_SERVICE_ROLE_KEY:"secret-test",CHECKOUT_ENABLED:"false"};
const cart=[{id:validId,color:"Rosa",size:"Único",quantity:2}];
function fetchMock(url){
 if(String(url).includes("/rest/v1/saluz_products?")){
  return Promise.resolve(new Response(JSON.stringify([{id:validId,name:"Necessaire",price_cents:8900,variants:[{color:"Rosa",size:"Único",stock:3}]}]),{status:200}));
 }
 throw Error("Unexpected outbound call: "+url);
}
async function endpoint(base,path,init={}){
 const before=globalThis.fetch;globalThis.fetch=fetchMock;
 try{
  const request=new Request(base+path,{...init,headers:{"origin":base,"content-type":"application/json",...(init.headers||{})}});
  return onRequest({request,env});
 }finally{globalThis.fetch=before;}
}
test("homologacao informa apenas preview, nao ativa o checkout",async()=>{
 const result=await endpoint(preview,"/api/status");
 assert.deepEqual(await result.json(),{configured:true,checkout_enabled:false,orders_locked:true,checkout_preview:true});
});
test("dominio oficial continua totalmente bloqueado",async()=>{
 const result=await endpoint(production,"/api/status");
 assert.equal((await result.json()).checkout_preview,false);
 const charge=await endpoint(production,"/api/checkout",{method:"POST",body:JSON.stringify({items:cart})});
 assert.equal(charge.status,503);
 const previewRoute=await endpoint(production,"/api/checkout/quote",{method:"POST",body:JSON.stringify({items:cart})});
 assert.notEqual(previewRoute.status,200);
});
test("carrinho e precos sao obtidos somente do servidor",async()=>{
 const r=await endpoint(preview,"/api/checkout/quote",{method:"POST",body:JSON.stringify({items:[{...cart[0],unit_price_cents:1}],postal_code:"01310930"})});
 assert.equal(r.status,200);
 const q=await r.json();
 assert.equal(q.items[0].line_total_cents,17800);
 assert.equal(q.subtotal_cents,17800);
 assert.equal(q.total_cents,null);
 assert.equal(q.payment_enabled,false);
 assert.equal(q.shipping_cents,null);
});
test("rejeita sacola duplicada e quantidade maior que estoque",async()=>{
 const dup=await endpoint(preview,"/api/checkout/quote",{method:"POST",body:JSON.stringify({items:[cart[0],cart[0]]})});
 assert.equal(dup.status,400);
 const depleted=await endpoint(preview,"/api/checkout/quote",{method:"POST",body:JSON.stringify({items:[{...cart[0],quantity:10}]})});
 assert.equal(depleted.status,400);
});
test("CEP invalido nao vira cotacao de frete inventada",async()=>{
 const r=await endpoint(preview,"/api/checkout/quote",{method:"POST",body:JSON.stringify({items:cart,postal_code:"12"})});
 assert.equal(r.status,400);
});
test("interface nao captura cartao e nao contem falso QR Pix",async()=>{
 const html=await readFile(new URL("../loja.html",import.meta.url),"utf8");
 const js=await readFile(new URL("../loja.js",import.meta.url),"utf8");
 assert.match(html,/payment-preview-dialog/);
 assert.match(html,/payment-preview-finish" disabled/);
 assert.match(js,/payment_enabled!==false/);
 assert.doesNotMatch(html,/name="card_number"|name="cvv"/);
});
