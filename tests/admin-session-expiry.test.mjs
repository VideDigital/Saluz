import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync("admin.js","utf8");
const begin=source.indexOf("let adminSessionInvalidated=false;");
const end=source.indexOf("function loginErrorMessage(",begin);
assert.ok(begin>=0&&end>begin,"Session guard source not found");
const guardSource=source.slice(begin,end);

function buildHarness(respond){
 const calls=[],changes=[],elements=new Map();
 const makeElement=()=>({
  classList:{
   values:new Set(),
   add(name){this.values.add(name);},
   remove(name){this.values.delete(name);},
   contains(name){return this.values.has(name);}
  },
  textContent:"",disabled:false,resetCalls:0,
  reset(){this.resetCalls++;},
  replaceChildren(){this.childrenCleared=true;},
  querySelector(){return this.button??null;}
 });
 for(const id of ["dashboard","login-screen","login-message","product-dialog",
   "product-form","variant-rows","main-preview","product-dialog-feedback",
   "login-form","orders","admin-products","action-message","section-title"]){
  elements.set(id,makeElement());
 }
 elements.get("login-form").button={disabled:false};
 elements.get("dashboard").classList.add("hidden");
 elements.get("product-dialog").classList.add("hidden");
 const sandbox={
  $:id=>elements.get(id),
  document:{body:{classList:makeElement().classList}},
  console:{warn(){}},
  fetch:async (url,options)=>{calls.push({url,method:options?.method||"GET",credentials:options?.credentials});return respond(url,options);},
  changeTab(name){changes.push(name);},
 };
 const script=`const saluzD1AdminPreview=true;
 let catalog=[{id:"old"}],orders=[{id:"old"}];
 ${guardSource}
 globalThis.testApi=api;
 globalThis.testSession=checkSession;
 globalThis.testInvalidate=invalidateAdminSession;
 globalThis.testShowDashboard=showDashboard;`;
 vm.runInNewContext(script,sandbox);
 return {calls,changes,elements,sandbox};
}

test("401 em cadastro D1 faz logout, fecha modal, limpa dados e não reenvia o POST",async()=>{
 const {calls,elements,sandbox}=buildHarness((url)=>{
  if(url==="/api/migration-admin/products")
   return {status:401,ok:false,json:async()=>({error:"Acesso administrativo necessário"})};
  if(url==="/api/auth/logout")
   return {status:200,ok:true,json:async()=>({ok:true})};
  throw Error("Endpoint inesperado "+url);
 });
 elements.get("dashboard").classList.remove("hidden");
 elements.get("product-dialog").classList.remove("hidden");
 await assert.rejects(sandbox.testApi("admin/products",{method:"POST",body:'{"name":"teste"}'}),/Sessão expirada/);
 assert.deepEqual(calls.map(x=>[x.method,x.url]),[
  ["POST","/api/migration-admin/products"],["POST","/api/auth/logout"]
 ]);
 assert.ok(elements.get("dashboard").classList.contains("hidden"));
 assert.ok(elements.get("product-dialog").classList.contains("hidden"));
 assert.ok(!elements.get("login-screen").classList.contains("hidden"));
 assert.ok(elements.get("login-message").textContent.includes("sessão expirou"));
 assert.equal(elements.get("login-form").resetCalls,1);
 assert.equal(elements.get("product-form").resetCalls,1);
 assert.equal(elements.get("login-form").button.disabled,false);
});
test("senha incorreta na tela de login não inicia logout automático",async()=>{
 const {calls,sandbox}=buildHarness(()=>({
  status:401,ok:false,json:async()=>({error:"Credenciais inválidas"})
 }));
 await assert.rejects(sandbox.testApi("auth/login",{method:"POST",body:"{}"}),/Credenciais inválidas/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,"/api/auth/login");
});
test("403 não é tratado como sessão expirada",async()=>{
 const {calls,elements,sandbox}=buildHarness(()=>({
  status:403,ok:false,json:async()=>({error:"Origem não autorizada"})
 }));
 elements.get("dashboard").classList.remove("hidden");
 await assert.rejects(sandbox.testApi("admin/products"),/Origem não autorizada/);
 assert.equal(calls.length,1);
 assert.ok(!elements.get("dashboard").classList.contains("hidden"));
});
test("sessão revogada em /auth/me encerra painel ativo",async()=>{
 const {calls,elements,sandbox}=buildHarness(url=>{
  if(url==="/api/auth/me")return {status:200,ok:true,json:async()=>({admin:false})};
  if(url==="/api/auth/logout")return {status:200,ok:true,json:async()=>({ok:true})};
  throw Error("Endpoint inesperado");
 });
 elements.get("dashboard").classList.remove("hidden");
 await sandbox.testSession();
 assert.deepEqual(calls.map(x=>x.url),["/api/auth/me","/api/auth/logout"]);
 assert.ok(elements.get("dashboard").classList.contains("hidden"));
});
test("duas respostas 401 concorrentes só limpam a sessão uma vez",async()=>{
 const {calls,sandbox}=buildHarness(url=>{
  if(url==="/api/auth/logout")return {status:200,ok:true,json:async()=>({ok:true})};
  return {status:401,ok:false,json:async()=>({error:"Acesso administrativo necessário"})};
 });
 const results=await Promise.allSettled([
  sandbox.testApi("admin/products"),sandbox.testApi("admin/orders")
 ]);
 assert.ok(results.every(r=>r.status==="rejected"));
 assert.equal(calls.filter(c=>c.url==="/api/auth/logout").length,1);
});

test("retornar à aba do navegador e revalidar sessão preserva a seção atual",async()=>{
 const {changes,elements,sandbox,calls}=buildHarness(url=>{
  if(url==="/api/auth/me")return {status:200,ok:true,json:async()=>({admin:true})};
  throw Error("Endpoint inesperado "+url);
 });
 await sandbox.testSession(); // first valid login/initial view
 assert.deepEqual(changes,["overview"]);
 assert.ok(!elements.get("dashboard").classList.contains("hidden"));
 changes.push("finance"); // user clicked Simular taxas; active tab is finance
 await sandbox.testSession(); // browser visibilitychange / 60-second session timer
 await sandbox.testSession();
 assert.deepEqual(changes,["overview","finance"],"não deve chamar changeTab ao revalidar sessão ativa");
 assert.equal(calls.filter(x=>x.url==="/api/auth/me").length,3);
 assert.ok(!elements.get("dashboard").classList.contains("hidden"));
});
test("somente o login ou a abertura inicial seleciona Início",()=>{
 const {changes,elements,sandbox}=buildHarness(()=>{throw Error("não consultar")});
 sandbox.testShowDashboard();
 assert.deepEqual(changes,["overview"]);
 sandbox.testShowDashboard();
 assert.deepEqual(changes,["overview"]);
 elements.get("dashboard").classList.add("hidden");
 sandbox.testShowDashboard();
 assert.deepEqual(changes,["overview","overview"]);
});
