import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync("admin.js","utf8");
const start=source.indexOf("let authRequestId=0;");
const end=source.indexOf("function changeTab(name){",start);
assert.ok(start>=0 && end>start,"Authentication handler could not be located");
const authBlock=source.slice(start,end);

function harness({deny=false,breakDashboard=false,holdInitialSession=false}={}){
 const nodes=new Map();
 const button={disabled:false};
 const form={
   data:{email:"admin@example.invalid",password:"dummy-no-real-password"},
   handlers:{},
   addEventListener(name,handler){this.handlers[name]=handler;},
   querySelector(){return button;},
   setAttribute(){},removeAttribute(){},
   reset(){this.data={email:"",password:""};}
 };
 function element(id){
   if(id==="login-form")return form;
   if(!nodes.has(id)){
     const classes=new Set(["hidden"]);
     nodes.set(id,{
       textContent:"",onclick:null,
       classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)}
     });
   }
   return nodes.get(id);
 }
 let delayedResolve,meCalls=0,loginCalls=0;
 const messages=[];
 async function api(path){
   if(path==="auth/login"){
     loginCalls++;
     if(deny)throw new Error("Credenciais inválidas");
     return {ok:true};
   }
   if(path==="auth/me"){
     meCalls++;
     if(holdInitialSession&&meCalls===1)
       return new Promise(resolve=>delayedResolve=resolve);
     return {admin:true};
   }
   if(path==="auth/logout")return {ok:true};
   throw new Error("Unexpected API call: "+path);
 }
 const handler=new Function("$","api","FormData","console","changeTab","message",authBlock+"; return {checkSession};")(
   element,api,function MockFormData(f){this.get=k=>f.data[k]},
   {error(){},warn(){}},
   ()=>{if(breakDashboard)throw new Error("UI render failure");},
   msg=>messages.push(msg)
 );
 const submit=()=>form.handlers.submit({preventDefault(){},currentTarget:form});
 return {element,handler,submit,form,button,messages,
   get delayedResolve(){return delayedResolve},
   get loginCalls(){return loginCalls},
   get meCalls(){return meCalls}
 };
}

test("successful authentication reveals dashboard and logout restores the login form",async()=>{
 const h=harness();
 await h.submit();
 assert.equal(h.element("login-screen").classList.contains("hidden"),true);
 assert.equal(h.element("dashboard").classList.contains("hidden"),false);
 assert.equal(h.button.disabled,false);
 await h.element("logout").onclick();
 assert.equal(h.element("login-screen").classList.contains("hidden"),false);
 assert.match(h.element("login-message").textContent,/Sessão encerrada/);
 h.form.data={email:"admin@example.invalid",password:"dummy-no-real-password"};
 await h.submit();
 assert.equal(h.element("dashboard").classList.contains("hidden"),false);
});

test("bad password never reveals administrative data",async()=>{
 const h=harness({deny:true});
 await h.submit();
 assert.equal(h.element("dashboard").classList.contains("hidden"),true);
 assert.equal(h.element("login-screen").classList.contains("hidden"),false);
 assert.match(h.element("login-message").textContent,/E-mail ou senha incorretos/);
});

test("outdated session check cannot overwrite a successful newer login",async()=>{
 const h=harness({holdInitialSession:true});
 const initial=h.handler.checkSession();
 await h.submit();
 h.delayedResolve({admin:false});
 await initial;
 assert.equal(h.element("dashboard").classList.contains("hidden"),false);
 assert.equal(h.element("login-screen").classList.contains("hidden"),true);
});

test("panel rendering errors do not become wrong-password messages",async()=>{
 const h=harness({breakDashboard:true});
 await h.submit();
 assert.equal(h.element("dashboard").classList.contains("hidden"),false);
 assert.match(h.messages.join(" "),/acesso foi confirmado/i);
});

test("admin assets are versioned and admin HTML is not stored in cache",()=>{
 const html=readFileSync("admin.html","utf8");
 const headers=readFileSync("_headers","utf8");
 assert.match(html,/admin\.js\?v=/);
 assert.match(html,/saluz-admin-extras\.js\?v=/);
 assert.match(headers,/\/admin\.html\s+Cache-Control: no-store/);
});
