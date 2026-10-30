import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const script=readFileSync("saluz-admin-extras.js","utf8");
const begin=script.indexOf("  async function runMercadoPagoTest(){");
const end=script.indexOf("  const mpButton=el(\"mp-test-connectivity-button\");",begin);
assert.ok(begin>=0&&end>begin,"O botão de diagnóstico do painel deve existir");
const runSource=script.slice(begin,end);

function ui({hostname="homologacao.saluz-admin.pages.dev",apiFn,sessionCheck=async()=>{},dashboardHidden=false}={}){
 const button={disabled:false},feedback={textContent:""},calls=[];
 const elements={
  "mp-test-connectivity-button":button,
  "mp-test-connectivity-feedback":feedback
 };
 const context={
  el:id=>elements[id],
  api:async route=>{calls.push(route);return apiFn(route)},
  checkSession:sessionCheck,
  location:{hostname},
  document:{getElementById:id=>id==="dashboard"?{classList:{contains:()=>dashboardHidden}}:null}
 };
 const runner=vm.runInNewContext(`(function(el,api,checkSession,location,document){${runSource}
 return runMercadoPagoTest;})`,{});
 return {run:runner(context.el,context.api,context.checkSession,context.location,context.document),button,feedback,calls};
}
test("botão testa sessão antes do endpoint privado, nenhum token é exposto",async()=>{
 const obj=ui({apiFn:async path=>path==="auth/me"?{admin:true}:{connection_status:"verified_read_only"}});
 await obj.run();
 assert.deepEqual(obj.calls,["auth/me","admin/payment-integration?probe=1"]);
 assert.match(obj.feedback.textContent,/Conexão validada/);
 assert.match(obj.feedback.textContent,/Nenhum pagamento foi realizado/);
 assert.equal((obj.feedback.textContent.match(/Nenhum pagamento foi realizado/g)||[]).length,1);
 assert.equal(obj.button.disabled,false);
 assert.doesNotMatch(script,/MP_ACCESS_TOKEN\s*[:=]\s*['"][^'"]+/);
});
test("sessão não autorizada impede o probe e pede novo login",async()=>{
 let checks=0;
 const obj=ui({apiFn:async()=>({admin:false}),sessionCheck:async()=>{checks++;}});
 await obj.run();
 assert.deepEqual(obj.calls,["auth/me"]);
 assert.equal(checks,1);
 assert.match(obj.feedback.textContent,/Entre novamente/);
 assert.equal(obj.button.disabled,false);
});
test("erro 401 no painel usa tratamento centralizado e não acessa o MP",async()=>{
 const obj=ui({apiFn:async()=>{throw Error("Sessão expirada")},dashboardHidden:true});
 await obj.run();
 assert.deepEqual(obj.calls,["auth/me"]);
 assert.match(obj.feedback.textContent,/Sessão encerrada/);
});
test("domínios diferentes não executam teste",async()=>{
 const obj=ui({hostname:"admin.usesaluz.com.br",apiFn:async()=>{throw Error("Não chamar")}});
 await obj.run();
 assert.deepEqual(obj.calls,[]);
 assert.match(obj.feedback.textContent,/somente na homologação/);
});
test("o botão preserva status negativo sem expor dados da credencial",async()=>{
 const obj=ui({apiFn:async path=>path==="auth/me"?{admin:true}:{connection_status:"rejected"}});
 await obj.run();
 assert.match(obj.feedback.textContent,/Credencial de teste rejeitada/);
 assert.equal(obj.button.disabled,false);
});
test("interface distingue HTTP rejeitado, indisponibilidade do provedor e timeout",async()=>{
 for(const [status,code,http,textExpected] of [
  ["request_rejected","provider_request_error",400,/HTTP 400/],
  ["rate_limited","provider_rate_limited",429,/limitou/],
  ["provider_error","provider_server_error",503,/HTTP 503/],
  ["timeout","request_timed_out",undefined,/excedeu/],
  ["transport_error","network_or_request_error",undefined,/comunicação/]
 ]){
  const obj=ui({apiFn:async path=>path==="auth/me"?{admin:true}:{
   connection_status:status,diagnostic_code:code,...(http?{provider_http_status:http}:{}),checkout_enabled:false
  }});
  await obj.run();
  assert.match(obj.feedback.textContent,textExpected);
  assert.match(obj.feedback.textContent,new RegExp(code));
  assert.match(obj.feedback.textContent,/Nenhum pagamento foi realizado/);
  assert.equal(obj.button.disabled,false);
 }
});
test("painel exibe diagnóstico de token malformatado e servidor alcançável",async()=>{
 for(const [status,code,expected] of [
  ["invalid_credential_format","secret_contains_invalid_whitespace",/formato não aceito/],
  ["transport_error","provider_reachable_auth_request_failed",/provider_reachable_auth_request_failed/],
  ["provider_redirect","provider_redirect_not_followed",/redirecionamento inesperado/]
 ]){
  const obj=ui({apiFn:async path=>path==="auth/me"?{admin:true}:{
    connection_status:status,diagnostic_code:code,checkout_enabled:false
  }});
  await obj.run();
  assert.match(obj.feedback.textContent,expected);
  assert.match(obj.feedback.textContent,/Nenhum pagamento foi realizado/);
 }
});
test("interface fornece diagnóstico somente após autenticação no painel",()=>{
 const html=readFileSync("admin.html","utf8");
 assert.match(html,/id="mp-test-connectivity-button"/);
 assert.match(html,/id="mp-test-connectivity-feedback"/);
 assert.match(html,/saluz-admin-extras\.js\?v=20261030-mp-network/);
 assert.ok(html.indexOf('id="mp-test-connectivity"')>html.indexOf('id="tab-finance"'));
 const gateway=readFileSync("functions/api/[[path]].js","utf8");
 assert.ok(gateway.indexOf('if (!(await isAdmin(request,env)))')<gateway.indexOf("return await adminAction(request,env,route)"));
});
