import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {readFileSync} from "node:fs";
import {onD1AuthRequest} from "../cloudflare/d1/staging-auth.mjs";
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const host="https://homologacao.saluz-loja.pages.dev";
const id="0e1fd859-c0ba-4bed-a7ae-e2efb92fc2fd";
const email="testes-admin@example.invalid";
const secret="somente-testes-123456789012345678901234567890";
const password="Uma-senha-de-testes-segura-2026!";
const req=(endpoint,{method="GET",body,origin=host,hostOverride=host,cookie="",mime="application/json"}={})=>{
 const headers={};
 if(method!=="GET"){if(origin!==null)headers.origin=origin;headers["content-type"]=mime;}
 if(cookie)headers.cookie=cookie;
 return new Request(hostOverride+"/api/migration-auth/"+endpoint,{
   method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})
 });
};
function database(){
 const admins=new Map(),credentials=new Map(),sessions=new Map(),limits=new Map();
 const db={prepare(sql){
  return {bind(...v){
   return {
    async first(){
     if(sql.startsWith("SELECT user_id,email,enabled FROM saluz_admins"))return admins.get(v[0])||null;
     if(sql.startsWith("SELECT user_id FROM saluz_admins"))return [...admins.values()].find(r=>r.email===v[0])||null;
     if(sql.startsWith("SELECT credential_version FROM saluz_auth_credentials"))
       return credentials.get(v[0])||null;
     if(sql.includes("RETURNING attempts")){
       const [hash,now,expiry]=v;
       const previous=limits.get(hash);
       const attempts=previous&&previous.window_start>=expiry?previous.attempts+1:1;
       limits.set(hash,{attempts,window_start:attempts===1?now:previous.window_start});
       return {attempts};
     }
     if(sql.includes("JOIN saluz_auth_credentials c ON a.user_id=c.user_id WHERE a.email")){
       const r=[...admins.values()].find(x=>x.email===v[0]);
       return r?{...r,...credentials.get(r.user_id)}:null;
     }
     if(sql.includes("FROM saluz_auth_sessions s")){
       const session=sessions.get(v[0]);
       if(!session||session.revoked_at||session.expires_at<=v[1])return null;
       const user=admins.get(session.user_id),credentialsRow=credentials.get(session.user_id);
       if(!user||user.enabled!==1||credentialsRow.credential_version!==session.credential_version)return null;
       return {...user,credential_version:credentialsRow.credential_version,expires_at:session.expires_at};
     }
     throw Error("Unexpected SELECT: "+sql);
    },
    async run(){
     if(sql.startsWith("INSERT OR IGNORE INTO saluz_admins")){
       if(!admins.has(v[0]))admins.set(v[0],{user_id:v[0],email:v[1],role:"admin",enabled:1});
       return {success:true,meta:{changes:1}};
     }
     if(sql.startsWith("INSERT INTO saluz_auth_credentials")){
       const prev=credentials.get(v[0]);
       credentials.set(v[0],{user_id:v[0],salt_hex:v[1],password_hash_hex:v[2],iterations:v[3],
         credential_version:(prev?.credential_version||0)+1});
       return {success:true};
     }
     if(sql.startsWith("UPDATE saluz_auth_sessions SET revoked_at=? WHERE user_id")){
       for(const session of sessions.values())if(session.user_id===v[1])session.revoked_at=v[0];
       return {success:true};
     }
     if(sql.startsWith("INSERT INTO saluz_auth_sessions")){
       sessions.set(v[0],{token_hash:v[0],user_id:v[1],credential_version:v[2],
         issued_at:v[3],expires_at:v[4],revoked_at:null});
       return {success:true};
     }
     if(sql.startsWith("UPDATE saluz_auth_sessions SET revoked_at=? WHERE token_hash")){
       const session=sessions.get(v[1]);if(session)session.revoked_at=v[0];
       return {success:true};
     }
     throw Error("Unexpected mutation: "+sql);
    }
   };
  }};
 },async batch(statements){for(const statement of statements)await statement.run();}};
 return {db,admins,credentials,sessions,limits};
}
const envFor=state=>({SALUZ_D1_PREVIEW:state.db,LOGIN_RATE_SECRET:secret});
const legacy=async()=>({id,email});
const post=(state,route,body,other={})=>onD1AuthRequest({
 request:req(route,{method:"POST",body,...other}),env:envFor(state),route,verifyLegacyAdmin:legacy
});
test("produção e host falso falham mesmo quando D1 existe",async()=>{
 const state=database();
 for(const hostname of ["https://usesaluz.com.br","https://homologacao.saluz-loja.pages.dev.evil.invalid"]){
  const r=await onD1AuthRequest({request:req("me",{hostOverride:hostname}),route:"me",env:envFor(state)});
  assert.equal(r.status,404);
 }
});
test("setup requer administrador Supabase existente e origin/JSON legítimos",async()=>{
 const state=database();
 const body={password};
 const forbidden=await onD1AuthRequest({request:req("setup",{method:"POST",body}),env:envFor(state),
   route:"setup",verifyLegacyAdmin:async()=>null});
 assert.equal(forbidden.status,403);
 assert.equal((await post(state,"setup",body,{origin:null})).status,403);
 assert.equal((await post(state,"setup",body,{origin:"https://attacker.example.invalid"})).status,403);
 assert.equal((await post(state,"setup",body,{mime:"text/plain"})).status,403);
 assert.equal(state.credentials.size,0);
});
test("não aceita senha fraca e nunca usa e-mail ou role fornecidos pelo navegador",async()=>{
 const state=database();
 assert.equal((await post(state,"setup",{password:"123456"})).status,400);
 assert.equal(state.credentials.size,0);
 const res=await post(state,"setup",{password,email:"attacker@example.invalid",role:"owner"});
 assert.equal(res.status,201);
 assert.equal(state.admins.get(id).email,email);
 assert.equal(state.admins.get(id).role,"admin");
 assert.equal(state.credentials.get(id).password_hash_hex.length,64);
 assert.ok(!JSON.stringify([...state.credentials.values()]).includes(password));
});
test("login D1 guarda apenas hash do token, me funciona e logout revoga",async()=>{
 const state=database();await post(state,"setup",{password});
 const wrong=await post(state,"login",{email,password:"Senha-errada-que-nao-serve"});
 assert.equal(wrong.status,401);
 const res=await post(state,"login",{email,password});
 assert.equal(res.status,200);
 const cookie=res.headers.get("set-cookie");
 assert.match(cookie,/__Host-saluz_d1_session=[a-f0-9]{64}/);
 assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
 assert.ok(!JSON.stringify([...state.sessions.values()]).includes(cookie.split("=")[1].slice(0,64)));
 const session=cookie.split(";")[0];
 const me=await onD1AuthRequest({request:req("me",{cookie:session}),env:envFor(state),route:"me"});
 assert.equal(me.status,200);assert.equal((await me.json()).user.email,email);
 const out=await post(state,"logout",{}, {cookie:session});
 assert.equal(out.status,200);assert.match(out.headers.get("set-cookie"),/Max-Age=0/);
 const revoked=await onD1AuthRequest({request:req("me",{cookie:session}),env:envFor(state),route:"me"});
 assert.equal(revoked.status,401);
});
test("oito falhas autorizadas, nona bloqueada; não há enumeracao",async()=>{
 const state=database();await post(state,"setup",{password});
 for(let n=0;n<8;n++){
  const bad=await post(state,"login",{email,password:"Senha-de-teste-invalida"});
  assert.equal(bad.status,401);
 }
 assert.equal((await post(state,"login",{email,password})).status,429);
});
test("reset exige autorização Supabase e invalida sessões anteriores",async()=>{
 const state=database();await post(state,"setup",{password});
 const login=await post(state,"login",{email,password}),session=login.headers.get("set-cookie").split(";")[0];
 assert.equal((await post(state,"setup",{password:"Nova-senha-segura-com-16+",confirm_reset:false})).status,409);
 const deny=await onD1AuthRequest({request:req("setup",{method:"POST",body:{password:"Nova-senha-segura-com-16+",confirm_reset:true}}),
 env:envFor(state),route:"setup",verifyLegacyAdmin:async()=>null});
 assert.equal(deny.status,403);
 assert.equal((await post(state,"setup",{password:"Nova-senha-segura-com-16+",confirm_reset:true})).status,201);
 const me=await onD1AuthRequest({request:req("me",{cookie:session}),env:envFor(state),route:"me"});
 assert.equal(me.status,401);
});
test("sem segredo de rate limit, login bloqueia antes da comparação de credenciais",async()=>{
 const state=database();await post(state,"setup",{password});
 const r=await onD1AuthRequest({request:req("login",{method:"POST",body:{email,password}}),
 env:{SALUZ_D1_PREVIEW:state.db},route:"login"});
 assert.equal(r.status,503);
});
test("gateway e proxy mantêm autenticação atual intacta",()=>{
 const gateway=readFileSync("functions/api/[[path]].js","utf8");
 const proxy=readFileSync("admin-deploy/functions/api/[[path]].js","utf8");
 assert.match(gateway,/if\(route\[0\]==="migration-auth" && route.length===2\)/);
 assert.ok(gateway.indexOf('if(route[0]==="migration-auth"')<gateway.indexOf("if (!ready(env))"));
 assert.match(gateway,/if \(route\[0\]==="auth"/);
 assert.match(proxy,/"migration-auth":new Set\(\["setup","login","logout","me"\]\)/);
 assert.match(proxy,/url.hostname!=="homologacao.saluz-admin.pages.dev"/);
});
