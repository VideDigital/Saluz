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
  assert.equal(init.redirect,"manual");
  assert.equal(init.headers.get("authorization"),"Bearer CREDENCIAL_TESTE_FICTICIA");
  assert.match(init.headers.get("accept"),/application\/json/);
  assert.equal(init.body,undefined);
  return response(200);
 };
 const result=await probeMercadoPagoTestCredential({request:request(),env,fetchFn});
 assert.equal(calls,1);
 assert.deepEqual(result,{httpStatus:200,result:{connection_status:"verified_read_only",diagnostic_code:"provider_read_accepted",checkout_enabled:false}});
 assert.doesNotMatch(JSON.stringify(result),/CREDENCIAL_TESTE_FICTICIA|visa|Visa/);
});
test("um token inválido não vaza informações, só marca rejeição",async()=>{
 for(const status of [401,403]){
  const result=await probeMercadoPagoTestCredential({request:request(),env,fetchFn:async()=>response(status,{token:"CREDENCIAL_TESTE_FICTICIA"})});
  assert.deepEqual(result.result,{connection_status:"rejected",diagnostic_code:"provider_auth_rejected",provider_http_status:status,checkout_enabled:false});
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
test("erros HTTP externos trazem somente status numérico permitido e código diagnóstico",async()=>{
 for(const [http,expected,code] of [
  [400,"request_rejected","provider_request_error"],
  [404,"request_rejected","provider_request_error"],
  [408,"timeout","provider_timeout_http"],
  [429,"rate_limited","provider_rate_limited"],
  [500,"provider_error","provider_server_error"],
  [503,"provider_error","provider_server_error"],
  [504,"timeout","provider_timeout_http"]
 ]){
  const result=await probeMercadoPagoTestCredential({
   request:request(),env,fetchFn:async()=>response(http,{password:"SECRET_PROVIDER",detail:"PRIVATE",token:"CREDENCIAL_TESTE_FICTICIA"})
  });
  assert.equal(result.httpStatus,200);
  assert.deepEqual(result.result,{
   connection_status:expected,diagnostic_code:code,provider_http_status:http,checkout_enabled:false
  });
  assert.doesNotMatch(JSON.stringify(result),/SECRET_PROVIDER|PRIVATE|CREDENCIAL_TESTE_FICTICIA/);
 }
});
test("timeout ou erro de transporte expõem classe genérica, nunca stack ou token",async()=>{
 for(const [name,status,code] of [
  ["TimeoutError","timeout","request_timed_out"],
  ["AbortError","timeout","request_timed_out"],
  ["TypeError","transport_error","network_or_request_error"],
  ["OtherError","runtime_error","unexpected_fetch_exception"]
 ]){
  const r=await probeMercadoPagoTestCredential({
   request:request(),env,fetchFn:async()=>{const e=new Error("Bearer CREDENCIAL_TESTE_FICTICIA");e.name=name;throw e;}
  });
  assert.deepEqual(r.result,{connection_status:status,diagnostic_code:code,checkout_enabled:false});
  assert.doesNotMatch(JSON.stringify(r),/CREDENCIAL_TESTE_FICTICIA|Bearer|stack/);
 }
});
test("nunca inclui código de resposta do provedor em resultados que não receberam HTTP",async()=>{
 const result=await probeMercadoPagoTestCredential({
  request:request(),env,fetchFn:async()=>response(200,{secret:"PROVIDER_CONTENT"})
 });
 assert.equal(result.result.connection_status,"unexpected_response");
 assert.equal(result.result.diagnostic_code,"invalid_provider_json");
 assert.ok(!Object.hasOwn(result.result,"provider_http_status"));
 assert.doesNotMatch(JSON.stringify(result),/PROVIDER_CONTENT/);
});
test("segredo copiado com espaços nas bordas é normalizado antes de enviar",async()=>{
 let count=0;
 const safe={...env,MP_ACCESS_TOKEN:"  CREDENCIAL_TESTE_FICTICIA  \n"};
 const result=await probeMercadoPagoTestCredential({
  request:request(),env:safe,fetchFn:async(url,init)=>{
    count++;
    assert.equal(init.headers.get("authorization"),"Bearer CREDENCIAL_TESTE_FICTICIA");
    return response(200);
  }
 });
 assert.equal(count,1);
 assert.equal(result.result.connection_status,"verified_read_only");
});
test("quebra de linha ou caracteres de controle internos são bloqueados sem fetch",async()=>{
 for(const raw of ["ABC\nDEF","ABC\tDEF","ABC DEF","ABC\rDEF","  "]){
  let count=0;
  const r=await probeMercadoPagoTestCredential({
    request:request(),env:{...env,MP_ACCESS_TOKEN:raw},
    fetchFn:async()=>{count++;return response(200);}
  });
  assert.equal(count,0);
  assert.equal(r.result.connection_status,"invalid_credential_format");
  assert.equal(r.result.diagnostic_code,"secret_contains_invalid_whitespace");
  assert.equal(r.result.checkout_enabled,false);
  assert.doesNotMatch(JSON.stringify(r),/ABC|DEF/);
 }
});
test("redirecionamento externo não é seguido com Bearer",async()=>{
 let calls=0;
 const result=await probeMercadoPagoTestCredential({
   request:request(),env,fetchFn:async(_,opts)=>{
    calls++;
    assert.equal(opts.redirect,"manual");
    return {status:302,ok:false,headers:{location:"https://invalid.example/path"}};
   }
 });
 assert.equal(calls,1);
 assert.equal(result.result.connection_status,"provider_redirect");
 assert.equal(result.result.diagnostic_code,"provider_redirect_not_followed");
 assert.doesNotMatch(JSON.stringify(result),/invalid/);
});
test("TypeError faz uma sondagem anônima somente leitura para distinguir alcance externo",async()=>{
 const calls=[];
 const result=await probeMercadoPagoTestCredential({
   request:request(),env,fetchFn:async(url,options)=>{
    calls.push({url,hasBearer:!!options.headers?.get?.("authorization"),method:options.method,redirect:options.redirect});
    if(calls.length===1)throw new TypeError("Bearer CREDENCIAL_TESTE_FICTICIA");
    return response(401,{secret:"DO_NOT_PRINT"});
   }
 });
 assert.deepEqual(calls.map(x=>x.hasBearer),[true,false]);
 assert.ok(calls.every(x=>x.method==="GET"&&x.redirect==="manual"));
 assert.equal(result.result.connection_status,"transport_error");
 assert.equal(result.result.diagnostic_code,"provider_reachable_auth_request_failed");
 assert.doesNotMatch(JSON.stringify(result),/CREDENCIAL_TESTE_FICTICIA|DO_NOT_PRINT/);
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
