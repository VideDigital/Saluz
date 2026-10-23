/* SALUZ: autenticação D1 paralela — somente homologação, não substitui Supabase.
 * Ativação requer sessão de administrador legado já verificada no servidor.
 * O site oficial, checkout e painel atual nunca usam este cookie enquanto
 * uma migração de permissão e seu plano de rollback não forem aprovados.
 */
const HOST="homologacao.saluz-loja.pages.dev";
const COOKIE="__Host-saluz_d1_session";
const ITERATIONS=310000;
const SESSION_SECONDS=1800;
const enc=new TextEncoder();
const hex=a=>[...a].map(n=>n.toString(16).padStart(2,"0")).join("");
const unhex=s=>new Uint8Array((s.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
const response=(body,status=200,extra={})=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
 "x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff",...extra}
});
const cookie=(token,maxAge=SESSION_SECONDS)=>COOKIE+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+maxAge;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailValid=v=>typeof v==="string"&&v.length<=160&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function requestAllowed(request,env){
 const url=new URL(request.url);
 return url.hostname===HOST && !!env?.SALUZ_D1_PREVIEW?.prepare;
}
function originOK(request){
 const origin=request.headers.get("origin");
 return !!origin && origin===new URL(request.url).origin
    && (request.headers.get("content-type")||"").split(";")[0].trim()==="application/json";
}
async function bodyJSON(request){
 const raw=await request.text();
 if(raw.length>2048)throw Error("too long");
 return JSON.parse(raw);
}
async function sha(data){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(data))));}
async function kdf(password,saltHex,iterations=ITERATIONS){
 const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
 const result=await crypto.subtle.deriveBits({name:"PBKDF2",salt:unhex(saltHex),iterations,hash:"SHA-256"},key,256);
 return hex(new Uint8Array(result));
}
function equalHex(a,b){
 if(typeof a!=="string"||typeof b!=="string"||a.length!==64||b.length!==64)return false;
 let diff=0;for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
function tokenCookie(request){
 const value=(request.headers.get("cookie")||"").split(";").map(v=>v.trim())
   .find(v=>v.startsWith(COOKIE+"="));
 const token=value?.slice(COOKIE.length+1)||"";
 return /^[0-9a-f]{64}$/.test(token)?token:"";
}
async function currentSession(db,request){
 const raw=tokenCookie(request);
 if(!raw)return null;
 const hash=await sha(raw);
 const row=await db.prepare(
   "SELECT a.user_id,a.email,a.role,a.enabled,c.credential_version,s.expires_at FROM saluz_auth_sessions s "+
   "JOIN saluz_admins a ON a.user_id=s.user_id JOIN saluz_auth_credentials c ON c.user_id=a.user_id "+
   "WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.credential_version=c.credential_version AND a.enabled=1 AND s.expires_at>?"
 ).bind(hash,new Date().toISOString()).first();
 return row?{id:row.user_id,email:row.email,role:row.role}:null;
}
async function rateLimit(db,request,env,email){
 if(typeof env.LOGIN_RATE_SECRET!=="string"||env.LOGIN_RATE_SECRET.length<32)
   return {configured:false,allowed:false};
 const ip=String(request.headers.get("cf-connecting-ip")||"unknown").slice(0,128).toLowerCase();
 const key=await crypto.subtle.importKey("raw",enc.encode(env.LOGIN_RATE_SECRET),
   {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const now=new Date().toISOString();
 const limit=new Date(Date.now()-15*60*1000).toISOString();
 // Duas barreiras: por IP (inclui troca de e-mail) e por IP+e-mail.
 let allowed=true;
 for(const [identity,max] of [["ip|"+ip,20],["account|"+ip+"|"+email.toLowerCase(),8]]){
   const hash=hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,
     enc.encode("saluz-d1-login-v1|"+identity))));
   const rows=await db.prepare(
     "INSERT INTO saluz_auth_login_limits(key_hash,window_start,attempts) VALUES(?,?,1) "+
     "ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END, "+
     "window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END "+
     "RETURNING attempts"
   ).bind(hash,now,limit,limit).first();
   if(Number(rows?.attempts||99)>max)allowed=false;
 }
 return {configured:true,allowed};
}
async function setup({request,env,verifyLegacyAdmin}){
 // O cliente não envia ID/e-mail para conceder a si próprio privilégios.
 if(typeof verifyLegacyAdmin!=="function")return response({error:"Ativação não autorizada"},403);
 const verified=await verifyLegacyAdmin();
 if(!verified||!uuid.test(String(verified.id))||!emailValid(verified.email))
   return response({error:"Acesso administrativo existente obrigatório"},403);
 let payload;try{payload=await bodyJSON(request)}catch{return response({error:"Dados inválidos"},400)}
 const password=payload?.password;
 if(typeof password!=="string"||password.length<14||password.length>128||enc.encode(password).length>256)
   return response({error:"Escolha uma senha exclusiva entre 14 e 128 caracteres"},400);
 const email=verified.email.toLowerCase().trim();
 const db=env.SALUZ_D1_PREVIEW;
 // Não substituir usuário diferente nem permitir apropriação por e-mail duplicado.
 const byId=await db.prepare("SELECT user_id,email,enabled FROM saluz_admins WHERE user_id=?").bind(verified.id).first();
 const byEmail=await db.prepare("SELECT user_id FROM saluz_admins WHERE email=?").bind(email).first();
 if(byId&&(!byId.enabled||byId.email.toLowerCase()!==email)||byEmail&&byEmail.user_id!==verified.id)
   return response({error:"Cadastro administrativo em conflito. Exige revisão manual."},409);
 const existing=await db.prepare("SELECT credential_version FROM saluz_auth_credentials WHERE user_id=?").bind(verified.id).first();
 if(existing&&payload.confirm_reset!==true)return response({error:"Acesso já preparado. Confirme redefinição para substituir."},409);
 const capability=await passwordKdfCapability();
 if(!capability.supported)return response({error:"Esta configuração de senha não é compatível com a Cloudflare neste ambiente. Nenhuma senha foi alterada; mantenha o acesso atual enquanto preparamos autenticação alternativa."},503);
 const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
 const hashed=await kdf(password,salt);
 const now=new Date().toISOString();
 // Uma transação D1: cadastrar somente a própria identidade previamente validada.
 await db.batch([
  db.prepare("INSERT OR IGNORE INTO saluz_admins(user_id,email,role,enabled) VALUES(?,?,'admin',1)").bind(verified.id,email),
  db.prepare("INSERT INTO saluz_auth_credentials(user_id,salt_hex,password_hash_hex,iterations,credential_version,updated_at) "+
   "VALUES(?,?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET salt_hex=excluded.salt_hex,password_hash_hex=excluded.password_hash_hex,"+
   "iterations=excluded.iterations,credential_version=saluz_auth_credentials.credential_version+1,updated_at=excluded.updated_at")
    .bind(verified.id,salt,hashed,ITERATIONS,now),
  db.prepare("UPDATE saluz_auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL").bind(now,verified.id)
 ]);
 return response({ok:true,configured:true,can_test_login:true},201);
}
async function login({request,env}){
 let payload;try{payload=await bodyJSON(request)}catch{return response({error:"Credenciais inválidas"},401)}
 const email=String(payload?.email||"").trim().toLowerCase(),password=payload?.password;
 if(!emailValid(email)||typeof password!=="string"||password.length<1||password.length>128)
   return response({error:"Credenciais inválidas"},401);
 const db=env.SALUZ_D1_PREVIEW;
 const rate=await rateLimit(db,request,env,email);
 if(!rate.configured)return response({error:"Proteção de acesso não configurada"},503);
 if(!rate.allowed)return response({error:"Muitas tentativas. Aguarde 15 minutos."},429,{"retry-after":"900"});
 const row=await db.prepare(
   "SELECT a.user_id,a.email,a.role,a.enabled,c.salt_hex,c.password_hash_hex,c.iterations,c.credential_version "+
   "FROM saluz_admins a JOIN saluz_auth_credentials c ON a.user_id=c.user_id WHERE a.email=? LIMIT 1"
 ).bind(email).first();
 // Execução equivalente para usuário inexistente, sem informar existência de e-mail.
 const salt=row?.salt_hex||"e4a6c95853ebbb44341674921edcde33";
 const candidate=await kdf(password,salt,row?.iterations||ITERATIONS);
 if(!row||row.enabled!==1||!equalHex(candidate,row.password_hash_hex))
   return response({error:"Credenciais inválidas"},401);
 const raw=hex(crypto.getRandomValues(new Uint8Array(32)));
 const hash=await sha(raw),now=Date.now();
 await db.prepare(
   "INSERT INTO saluz_auth_sessions(token_hash,user_id,credential_version,issued_at,expires_at) VALUES(?,?,?,?,?)"
 ).bind(hash,row.user_id,row.credential_version,new Date(now).toISOString(),new Date(now+SESSION_SECONDS*1000).toISOString()).run();
 return response({ok:true,email:row.email,role:row.role,expires_in:SESSION_SECONDS},200,{"set-cookie":cookie(raw)});
}
async function logout({request,env}){
 const raw=tokenCookie(request);
 if(raw)await env.SALUZ_D1_PREVIEW.prepare(
   "UPDATE saluz_auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL"
 ).bind(new Date().toISOString(),await sha(raw)).run();
 return response({ok:true},200,{"set-cookie":cookie("",0)});
}
// Diagnóstico sem contas/senhas ou escrita; só na homologação.
// Confirma se o runtime permite o custo de derivação aprovado.
async function passwordKdfCapability(){
 try {
  const salt=new Uint8Array(16),key=await crypto.subtle.importKey(
   "raw",enc.encode("canario-publico-sem-senha-real"),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},key,256);
  return {supported:bits.byteLength===32};
 }catch(e){
  return {supported:false,reason:e?.name==="NotSupportedError"?"not_supported":
    e?.name==="OperationError"?"operation_error":"runtime_error"};
 }
}
export async function onD1AuthRequest({request,env,route,verifyLegacyAdmin}){
 if(!requestAllowed(request,env))return response({error:"Indisponível"},404);
 const method=request.method;
 if(!["login","logout","me","setup","capabilities"].includes(route))return response({error:"Não encontrado"},404);
 if(route==="capabilities"){
  if(method!=="GET")return response({error:"Método inválido"},405);
  return response({environment:"staging",kdf:await passwordKdfCapability()});
 }
 if(route==="me"){
   if(method!=="GET")return response({error:"Método inválido"},405);
   try{const user=await currentSession(env.SALUZ_D1_PREVIEW,request);
    return user?response({authenticated:true,user}):response({authenticated:false},401);
   }catch{return response({error:"Autenticação indisponível"},503)}
 }
 if(method!=="POST")return response({error:"Método inválido"},405);
 if(!originOK(request))return response({error:"Origem ou formato inválidos"},403);
 try{
   if(route==="setup")return await setup({request,env,verifyLegacyAdmin});
   if(route==="login")return await login({request,env});
   return await logout({request,env});
 }catch{
   return response({error:"Operação de autenticação indisponível"},503);
 }
}
