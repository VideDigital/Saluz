import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {probeMercadoPagoTestCredential} from "../functions/api/mp-credential-probe.mjs";

const staging="https://homologacao.saluz-loja.pages.dev/api/admin/payment-integration?probe=1";
const production="https://usesaluz.com.br/api/admin/payment-integration?probe=1";
const request=(url=staging,method="GET")=>new Request(url,{method});
const env={MP_ACCESS_TOKEN:"CREDENCIAL_TESTE_FICTICIA",CHECKOUT_ENABLED:"false"};
const methodData=[{id:"visa",name:"Visa",payment_type_id:"credit_card"}];
const response=(status,data=methodData)=>({status,ok:status>=200&&status<300,json:async()=>data});

test("prova conexão usando somente GET em API oficial com token exclusivamente no header",async()=>{
 let calls=0;
 const fetchFn=async(url,init)=>{
  calls++;
  assert.equal(url,"https://api.mercadopago.com/v1/payment_methods");
  assert.equal(init.method,"GET");
  assert.equal(init.redirect,"error");
  assert.equal(init.headers.authorization,"Bearer CREDENCIAL_TESTE_FICTICIA");
  assert.match(init.headers.accept,/application\/json/);
  assert.equal(init.body,undefined);
  return response(200);
 };
 const result=await probeMercadoPagoTestCredential({request:request(),env,fetchFn});
 assert.equal(calls,1);
 assert.deepEqual(result,{httpStatus:200,result:{connection_status:"verified_read_only",checkout_enabled:false}});
 assert.doesNotMatch(JSON.stringify(result),/CREDENCIAL_TESTE_FICTICIA|visa|Visa/);
});
test("um token inválido não vaza informações, só marca rejeição",async()=>{
 for(const status of [401,403]){
  const result=await probeMercadoPagoTestCredential({request:request(),env,fetchFn:async()=>response(status,{token:"CREDENCIAL_TESTE_FICTICIA"})});
  assert.deepEqual(result.result,{connection_status:"rejected",checkout_enabled:false});
 }
});
test("sem token não faz requisições externas",async()=>{
 let calls=0;
 const result=await probeMercadoPagoTestCredential({request:request(),env:{CHECKOUT_ENABLED:"false"},fetchFn:async()=>{calls++;}});
 assert.equal(calls,0);
 assert.equal(result.result.connection_status,"not_configured");
});
test("não consulta Mercado Pago se flags de checkout estão habilitadas",async()=>{
 for(const unsafe of [
   {MP_ENVIRONMENT:"production"},
   {CHECKOUT_ENABLED:"true"},
   {MP_CHECKOUT_ENABLED:"true"}
 ]){
  let calls=0;
  const result=await probeMercadoPagoTestCredential({request:request(),env:{...env,...unsafe},fetchFn:async()=>{calls++;}});
  assert.equal(calls,0);
  assert.equal(result.result.connection_status,"blocked");
 }
});
test("não disponibiliza a verificação em domínio real, outro host, HTTP ou POST",async()=>{
 for(const req of [
  request(production),request("https://evil.example/api/admin/payment-integration?probe=1"),
  request(staging.replace("https:","http:")),request(staging,"POST")
 ]){
  let calls=0;
  const result=await probeMercadoPagoTestCredential({request:req,env,fetchFn:async()=>{calls++;}});
  assert.equal(result.httpStatus,404);
  assert.equal(calls,0);
 }
});
test("falha externa ou resposta inesperada não vaza conteúdo",async()=>{
 for(const fetchFn of [
  async()=>response(500,{token:"CREDENCIAL_TESTE_FICTICIA"}),
  async()=>response(200,{secret:"CREDENCIAL_TESTE_FICTICIA"}),
  async()=>{throw Error("Bearer CREDENCIAL_TESTE_FICTICIA")}
 ]){
  const result=await probeMercadoPagoTestCredential({request:request(),env,fetchFn});
  assert.equal(result.httpStatus,200);
  assert.equal(result.result.checkout_enabled,false);
  assert.notEqual(result.result.connection_status,"verified_read_only");
  assert.doesNotMatch(JSON.stringify(result),/CREDENCIAL_TESTE_FICTICIA/);
 }
});
test("probe só é acessível depois de validação de administrador na rota existente",()=>{
 const gateway=readFileSync("functions/api/[[path]].js","utf8");
 const start=gateway.indexOf('if (route[0]==="admin")');
 const auth=gateway.indexOf('if (!(await isAdmin(request,env)))',start);
 const dispatch=gateway.indexOf("return await adminAction(request,env,route)",start);
 assert.ok(start>0&&auth>start&&dispatch>auth,"Guard Supabase deve ocorrer antes do adminAction");
 assert.match(gateway,/parts\[1\]==="payment-integration"/);
 assert.match(gateway,/probeMercadoPagoTestCredential/);
 const proxy=readFileSync("admin-deploy/functions/api/[[path]].js","utf8");
 assert.match(proxy,/"payment-integration"/);
});
