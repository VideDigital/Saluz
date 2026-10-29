import test from "node:test";
import assert from "node:assert/strict";
import {quoteCartD1,quoteRequestD1,reserveOrderD1} from "../cloudflare/d1/orders.mjs";
import {readFileSync} from "node:fs";
const id="d0110000-0000-4000-8000-000000000105";
const orderId="6dd24613-62cb-44e2-ab64-f80e08470e52";
const host="https://homologacao.saluz-loja.pages.dev";
const item={id,color:"Neutro",size:"Kit",quantity:2};
function db(stock=4,price=15990){
 const history=[];
 return {history,prepare(sql){
   history.push(sql);
   return {bind(...args){
     return {all:async()=>({results:[{id,name:"Kit Autocuidado",price_cents:price,
        variants:JSON.stringify([{color:"Neutro",size:"Kit",stock}])}]}),run:async()=>({success:true})};
   }};
 },batch:async statements=>{history.push("batch:"+statements.length);return statements.map(()=>({success:true}))}};
}
const request=(base=host,body={items:[item],postal_code:"01310930"})=>new Request(base+"/api/migration-orders/quote",{
 method:"POST",headers:{"content-type":"application/json","origin":base},body:JSON.stringify(body)
});
test("cotação D1 usa preço do banco, não preço enviado pelo navegador",async()=>{
 const d=db();
 const q=await quoteCartD1(d,{items:[{...item,price_cents:1}],postal_code:"01310930"});
 assert.equal(q.subtotal_cents,31980);
 assert.equal(q.shipping_cents,null);
 assert.equal(q.total_cents,null);
 assert.equal(q.payment_enabled,false);
 assert.equal(q.items[0].unit_price_cents,15990);
 assert.match(d.history[0],/saluz_products WHERE is_active=1/);
});
test("quantidade maior que estoque e itens repetidos são rejeitados",async()=>{
 await assert.rejects(quoteCartD1(db(1),{items:[item]}),/Estoque/);
 await assert.rejects(quoteCartD1(db(),{items:[item,item]}),/repetidas/);
 await assert.rejects(quoteCartD1(db(),{items:[{...item,quantity:0}]}),/inválida/);
});
test("API só existe em homologação; não depende de segredo Supabase",async()=>{
 const d=db(),r=await quoteRequestD1({request:request(),env:{SALUZ_D1_PREVIEW:d}});
 assert.equal(r.status,200);assert.equal((await r.json()).subtotal_cents,31980);
 assert.equal((await quoteRequestD1({request:request("https://usesaluz.com.br"),env:{SALUZ_D1_PREVIEW:d}})).status,404);
 assert.equal((await quoteRequestD1({request:request(),env:{}})).status,503);
});
test("reserva interna nunca aceita frete ainda não validado",async()=>{
 await assert.rejects(reserveOrderD1({db:db(),orderId,cart:{items:[item]},customer:{},
  shippingCents:0}),/Frete/);
});
test("reserva interna exige dados validados e prepara lote transacional",async()=>{
 const d=db(),c={customer_name:"Cliente Exemplo",customer_email:"cliente@example.invalid",
 customer_phone:"11999999999",customer_cpf:"12345678901",postal_code:"01310930",
 address_line:"Rua de Teste",address_number:"1",neighborhood:"Centro",city:"São Paulo",state:"SP"};
 const result=await reserveOrderD1({db:d,orderId,cart:{items:[item]},customer:c,shippingCents:500,
  shippingVerified:true});
 assert.equal(result.total_cents,32480);assert.equal(result.payment_enabled,false);
 assert.ok(d.history.includes("batch:2"));
});
test("pontos de entrada pagos permanecem desativados e nenhum D1 é inserido diretamente no navegador",()=>{
 const gateway=readFileSync("functions/api/[[path]].js","utf8");
 assert.match(gateway,/route\[0\]==="migration-orders"/);
 assert.match(gateway,/return error\("Pedidos desativados/);
 const shop=readFileSync("loja.js","utf8");
 assert.doesNotMatch(shop,/MP_ACCESS_TOKEN/);
});

test("a UI usa endpoint D1 somente na homologação; produção mantém a rota atual",()=>{
 const source=readFileSync("loja.js","utf8");
 assert.match(source,/window\.saluzD1PreviewEnabled\?"\/api\/migration-orders\/quote":"\/api\/checkout\/quote"/);
 const gateway=readFileSync("functions/api/[[path]].js","utf8");
 assert.ok(gateway.indexOf('if(route[0]==="migration-orders"')<gateway.indexOf("if (!ready(env))"));
});
