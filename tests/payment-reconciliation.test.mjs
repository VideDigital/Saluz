import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planPaymentTransition,reconcilePaymentD1} from "../cloudflare/d1/payment-reconciliation.mjs";

const orderId="6dd24613-62cb-44e2-ab64-f80e08470e52",now="2026-11-06T20:00:00.000Z";
const local={id:orderId,status:"aguardando_pagamento",payment_provider:"mercado_pago",payment_state:"pendente",
 mp_order_id:"ORD123456",subtotal_cents:14000,shipping_cents:1000,
 stock_reservation_expires_at:"2026-11-06T20:15:00.000Z"};
const provider={id:"ORD123456",external_reference:orderId,collector_id:"seller-123",
 currency_id:"BRL",total_cents:15000,status:"processed",status_detail:"accredited"};
const input=(overrides={})=>({local,provider,merchantId:"seller-123",now,reservations:{total:2,released:0},...overrides});
function mockDb(overrides={}){
 const statements=[],events=[];
 return {statements,events,
  prepare(sql){return {bind(...args){statements.push({sql,args});return {
   first:async()=>sql.includes("FROM saluz_orders")?(Object.hasOwn(overrides,"local")?overrides.local:local):
    (overrides.reservations??{total:2,released:0})
  }}};},
  async batch(seq){events.push(seq.map(s=>s));return seq.map((_,i)=>({meta:{changes:i===0?(overrides.changes??1):2}}));}
 };
}
test("aprovado só quando valor, moeda, recebedor, referência e reserva conferem",()=>{
 assert.equal(planPaymentTransition(input()).action,"approve");
 for(const change of [
  {provider:{...provider,total_cents:1}},{provider:{...provider,currency_id:"USD"}},
  {provider:{...provider,external_reference:orderId.slice(1)}},
  {provider:{...provider,collector_id:"wrong"}},
  {provider:{...provider,id:"ORD-wrong"}}
 ])assert.throws(()=>planPaymentTransition(input(change)));
});
test("pagamento pendente não muda estoque",()=>{
 for(const status of ["created","processing","action_required"]){
  assert.equal(planPaymentTransition(input({provider:{...provider,status}})).action,"hold");
 }
});
test("notificação duplicada e mudança indevida de ordem paga não liberam estoque",()=>{
 const paid={...local,payment_state:"aprovado",status:"pago_confirmado"};
 assert.equal(planPaymentTransition(input({local:paid})).action,"noop");
 assert.equal(planPaymentTransition(input({local:paid,provider:{...provider,status:"canceled"}})).action,"manual");
});
test("pagamento tardio ou reserva devolvida exigem revisão manual",()=>{
 assert.equal(planPaymentTransition(input({local:{...local,stock_reservation_expires_at:now}})).reason,"late_payment_requires_review");
 assert.equal(planPaymentTransition(input({reservations:{total:2,released:1}})).reason,"reservation_missing_or_released");
});
test("cancelamento/falha terminal libera estoque uma vez; status ambíguo fica em revisão",()=>{
 for(const status of ["canceled","failed"]){
  assert.equal(planPaymentTransition(input({provider:{...provider,status,status_detail:""}})).action,"cancel_release");
 }
 for(const status of ["refunded","unknown"]){
  assert.equal(planPaymentTransition(input({provider:{...provider,status}})).action,"manual");
 }
 assert.equal(planPaymentTransition(input({provider:{...provider,status:"processed",status_detail:"partially_refunded"}})).action,"manual");
});
test("escrita de aprovação usa atualização condicional atômica sem devolver reserva",async()=>{
 const d=mockDb();
 const response=await reconcilePaymentD1({db:d,orderId,provider,merchantId:"seller-123",now});
 assert.equal(response.action,"approved");assert.equal(d.events.length,1);assert.equal(d.events[0].length,1);
 assert.match(d.statements[2].sql,/payment_state IN \('checkout_criado','pendente'\)/);
 assert.match(d.statements[2].sql,/stock_reservation_expires_at>\?/);
});
test("cancelamento transacional usa CAS e trigger de estoque e não depende do browser",async()=>{
 const d=mockDb();
 const response=await reconcilePaymentD1({db:d,orderId,provider:{...provider,status:"canceled",status_detail:""},merchantId:"seller-123",now});
 assert.equal(response.action,"released");assert.equal(d.events[0].length,2);
 assert.match(d.statements[3].sql,/released_at IS NULL/);
 assert.match(d.statements[3].sql,/payment_state=\?/);
});
test("concorrência ou pedido não encontrado falham fechado",async()=>{
 const stale=mockDb({changes:0});
 assert.equal((await reconcilePaymentD1({db:stale,orderId,provider,merchantId:"seller-123",now})).action,"manual");
 const missing=mockDb({local:null});
 assert.equal((await reconcilePaymentD1({db:missing,orderId,provider,merchantId:"seller-123",now})).reason,"order_not_found");
});
test("nenhuma rota pública de pagamento foi criada",()=>{
 const src=readFileSync("functions/api/[[path]].js","utf8");
 assert.match(src,/Pedidos desativados até existir reserva atômica/);
 assert.doesNotMatch(src,/reconcilePaymentD1/);
});
