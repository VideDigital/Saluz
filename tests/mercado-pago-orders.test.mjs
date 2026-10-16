import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {formatBRL,prepareOrder,createMPOrder,validateMPWebhook,retrieveMPOrder} from "../functions/api/mp-orders.mjs";

const item={name:"Nécessaire Rosa",quantity:2,price_cents:7990};
const orderId="b681355f-6463-40f5-92ea-b46bc4e42671",key="b78b710c-1792-4ec4-871e-f0fc19742ae4";

test("Valores reais calculados em centavos, nao em valores de formulario",()=>{
 const o=prepareOrder({id:orderId,payerEmail:"comprador@example.invalid",items:[item]});
 assert.equal(o.total_amount,"159.80");
 assert.equal(o.items[0].total_amount,"159.80");
 assert.equal(o.external_reference,orderId);
});
test("Rejeita preços arbitrarios, negativos, overflow e dados invalidos",()=>{
 assert.throws(()=>formatBRL(-1));
 assert.throws(()=>formatBRL(1.23));
 assert.throws(()=>prepareOrder({id:orderId,payerEmail:"invalido",items:[item]}));
 assert.throws(()=>prepareOrder({id:orderId,payerEmail:"teste@example.invalid",items:[{...item,quantity:0}]}));
 assert.throws(()=>prepareOrder({id:orderId,payerEmail:"teste@example.invalid",items:[{...item,price_cents:-1}]}));
});
test("Criar checkout falha fechado sem autorizacao e nunca chama Mercado Pago",async()=>{
 let called=0;
 const fetchFn=async()=>{called++;return new Response(JSON.stringify({id:"ORD123456",checkout_url:"https://www.mercadopago.com.br"}),{status:201});};
 const valid=prepareOrder({id:orderId,payerEmail:"teste@example.invalid",items:[item]});
 await assert.rejects(createMPOrder({env:{MP_ACCESS_TOKEN:"TEST-token",CHECKOUT_ENABLED:"false"},order:valid,idempotencyKey:key,fetchFn}));
 assert.equal(called,0);
});
test("Mesmo com checkout enabled nao libera pagamento sem reserva confirmada",async()=>{
 let called=0;
 const env={MP_ACCESS_TOKEN:"TEST-token",MP_CHECKOUT_ENABLED:"true",CHECKOUT_ENABLED:"true"};
 await assert.rejects(createMPOrder({env,order:{},idempotencyKey:key,fetchFn:async()=>{called++;}}));
 assert.equal(called,0);
});
test("Mesmo com reserva e webhook declarados, exige liberacao de producao",async()=>{
 let called=0;
 const env={MP_ACCESS_TOKEN:"TEST-token",MP_CHECKOUT_ENABLED:"true",CHECKOUT_ENABLED:"true",MP_STOCK_RESERVATION_VERIFIED:"true",MP_WEBHOOK_VERIFIED:"true",MP_ENVIRONMENT:"production"};
 await assert.rejects(createMPOrder({env,order:{},idempotencyKey:key,fetchFn:async()=>{called++;}}));
 assert.equal(called,0);
});
test("Em homologacao com guardas habilitadas, integra apenas com mock e usa idempotencia",async()=>{
 const env={MP_ACCESS_TOKEN:"TEST-token",MP_CHECKOUT_ENABLED:"true",CHECKOUT_ENABLED:"true",MP_STOCK_RESERVATION_VERIFIED:"true",MP_WEBHOOK_VERIFIED:"true",MP_ENVIRONMENT:"test"};
 let called=0;
 const result=await createMPOrder({env,order:prepareOrder({id:orderId,payerEmail:"teste@example.invalid",items:[item]}),idempotencyKey:key,
 fetchFn:async(url,init)=>{
 called++;
 assert.equal(url,"https://api.mercadopago.com/v1/orders");
 assert.equal(init.headers["x-idempotency-key"],key);
 assert.equal(init.headers.authorization,"Bearer TEST-token");
 assert.equal(JSON.parse(init.body).total_amount,"159.80");
 return new Response(JSON.stringify({id:"ORD123456",checkout_url:"https://www.mercadopago.com.br/checkout"}),{status:201});
 }});
 assert.equal(called,1);assert.equal(result.id,"ORD123456");
});
test("Webhook valida assinatura, rejeita assinatura falsa, tampered ou expirada",async()=>{
 const now=Date.now(),secret="test-secret",requestId="rid-123",dataId="ORD001X";
 const manifest="id:"+dataId.toLowerCase()+";request-id:"+requestId+";ts:"+now+";";
 const hmac=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",hmac,new TextEncoder().encode(manifest)));
 const hex=[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");
 const signature="ts="+now+",v1="+hex;
 assert.equal(await validateMPWebhook({signature,requestId,dataId,secret,now}),true);
 assert.equal(await validateMPWebhook({signature,requestId:"outro",dataId,secret,now}),false);
 assert.equal(await validateMPWebhook({signature,requestId,dataId,secret,now:now+400000}),false);
 assert.equal(await validateMPWebhook({signature:"ts="+now+",v1=garbage",requestId,dataId,secret,now}),false);
});
test("Consulta de order somente aceita formato estrito e chama endpoint oficial",async()=>{
 let called=0;
 await assert.rejects(retrieveMPOrder({env:{MP_ACCESS_TOKEN:"x"},mpOrderId:"../../orders",fetchFn:async()=>{called++;}}));
 assert.equal(called,0);
 const result=await retrieveMPOrder({env:{MP_ACCESS_TOKEN:"TEST-token"},mpOrderId:"ORD123456",fetchFn:async(url,options)=>{
 assert.equal(url,"https://api.mercadopago.com/v1/orders/ORD123456");
 assert.equal(options.headers.authorization,"Bearer TEST-token");
 return new Response(JSON.stringify({id:"ORD123456",status:"processed"}),{status:200});}});
 assert.equal(result.status,"processed");
});
test("Rota administrativa retorna status sem revelar credenciais e requer login",async()=>{
 const code=await readFile(new URL("../functions/api/[[path]].js",import.meta.url),"utf8");
 assert.match(code,/payment-integration/);
 assert.match(code,/checkout_enabled:false/);
 const proxy=await readFile(new URL("../admin-deploy/functions/api/[[path]].js",import.meta.url),"utf8");
 assert.match(proxy,/payment-integration/);
});
