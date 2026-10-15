// Cloudflare Pages Function catch-all: /api/*
// No gateway is active on GitHub Pages. Never put a service key in browser code.
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
const COOKIE = "__Host-saluz_session";
const allowedEvents = new Set(["page_view","product_view","add_to_cart","checkout_start","checkout_submit","contact_click"]);
const orderStatuses = new Set(["solicitacao_recebida","contatado","aguardando_pagamento","pago_confirmado","em_preparacao","enviado","cancelado"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function output(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function error(message, status=400) { return output({ error: message }, status); }
function ready(env) {
  return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
}
function sbUrl(env, path) {
  return String(env.SUPABASE_URL).replace(/\/$/, "") + path;
}
async function sb(env, path, { method="GET", data, service=true, extraHeaders={} }={}) {
  const key = service ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
  const res = await fetch(sbUrl(env, path), {
    method,
    headers: { apikey:key, authorization:"Bearer "+key, "content-type":"application/json",
      ...(data ? {prefer:"return=representation"} : {}), ...extraHeaders },
    ...(data ? {body:JSON.stringify(data)} : {})
  });
  if (!res.ok) throw new Error("supabase " + res.status);
  if (res.status === 204) return null;
  return res.json();
}
async function bodyJson(request) {
  const raw = await request.text();
  if (raw.length > 16000) throw new Error("body too long");
  return JSON.parse(raw);
}
function safeText(value, max) {
  return String(value ?? "").trim().slice(0,max);
}
function digits(v) { return String(v ?? "").replace(/\D/g,""); }
function isCPF(raw) {
  const s = digits(raw);
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  for (let length=9; length<11; length++) {
    let sum=0;
    for (let i=0; i<length; i++) sum += Number(s[i]) * (length+1-i);
    let digit = (sum*10)%11;
    if (digit===10) digit=0;
    if (digit!==Number(s[length])) return false;
  }
  return true;
}
function checkOrigin(request) {
  const origin=request.headers.get("origin");
  return !origin || origin===new URL(request.url).origin;
}
function cookieToken(request) {
  const part=(request.headers.get("cookie") || "").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
  return part ? part.slice(COOKIE.length+1) : "";
}
async function isAdmin(request,env) {
  const token=cookieToken(request);
  if (!token) return false;
  const res = await fetch(sbUrl(env,"/auth/v1/user"),{
    headers: {apikey:env.SUPABASE_ANON_KEY,authorization:"Bearer "+token}
  });
  if (!res.ok) return false;
  const user=await res.json();
  if (!user.id || !uuid.test(user.id)) return false;
  const members=await sb(env,"/rest/v1/saluz_admins?user_id=eq."+user.id+"&select=user_id&limit=1");
  return members.length>0;
}
function validateProduct(raw) {
  const name=safeText(raw.name,140), description=safeText(raw.description,2000);
  const category=safeText(raw.category,70), image_url=safeText(raw.image_url,500);
  const price_cents=Number(raw.price_cents);
  if (name.length<2 || !Number.isInteger(price_cents) || price_cents<0 || price_cents>50000000) throw new Error("Nome ou preço inválido");
  if (image_url && !/^https:\/\//.test(image_url)) throw new Error("Imagem precisa ter URL HTTPS");
  const variants=Array.isArray(raw.variants) ? raw.variants : [];
  if (variants.length>50) throw new Error("Muitas variações");
  const normalized=variants.map(v=>{
    const color=safeText(v.color,40), size=safeText(v.size,30);
    const stock=Number(v.stock);
    if (!Number.isInteger(stock)||stock<0||stock>100000) throw new Error("Estoque inválido");
    const image_url=safeText(v.image_url,650); if(image_url && !/^https:\/\//.test(image_url)) throw new Error("Foto inválida"); return {color,size,stock,image_url};
  });
  const seen=new Set();
  for (const v of normalized) {
    const key=v.color.toLocaleLowerCase("pt-BR")+"|"+v.size.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) throw new Error("Variação duplicada");
    seen.add(key);
  }
  return {name,description,category,image_url,price_cents,variants:normalized,is_active:raw.is_active===true,updated_at:new Date().toISOString()};
}
function validateOrder(b) {
  const name=safeText(b.name,120), email=safeText(b.email,160).toLowerCase();
  const phone=digits(b.phone), cpf=digits(b.cpf), postal_code=digits(b.postal_code);
  const address_line=safeText(b.address_line,160), address_number=safeText(b.address_number,20);
  const address_extra=safeText(b.address_extra,100), neighborhood=safeText(b.neighborhood,100);
  const city=safeText(b.city,100), state=safeText(b.state,2).toUpperCase();
  if (name.length<3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe nome e e-mail válidos");
  if (phone.length<10 || phone.length>13 || !isCPF(cpf)) throw new Error("Telefone ou CPF inválido");
  if (postal_code.length!==8 || !address_line || !address_number || !neighborhood || !city || !/^[A-Z]{2}$/.test(state)) throw new Error("Endereço incompleto");
  if (b.privacy_accepted!==true) throw new Error("É necessário aceitar a Política de Privacidade");
  if (!Array.isArray(b.items) || b.items.length<1 || b.items.length>20) throw new Error("Sacola inválida");
  const items=b.items.map(i=>{
    if (!uuid.test(String(i.id))) throw new Error("Produto inválido");
    const quantity=Number(i.quantity);
    if (!Number.isInteger(quantity)||quantity<1||quantity>10) throw new Error("Quantidade inválida");
    return { id:i.id, quantity, color:safeText(i.color,40), size:safeText(i.size,30) };
  });
  return {customer_name:name,customer_email:email,customer_phone:phone,customer_cpf:cpf,postal_code,address_line,address_number,address_extra,neighborhood,city,state,items};
}
async function createOrder(request,env) {
  if (String(env.CHECKOUT_ENABLED)!=="true") return error("Cadastro de pedidos indisponível até a configuração segura da loja.",503);
  const b=validateOrder(await bodyJson(request));
  const ids=[...new Set(b.items.map(i=>i.id))];
  const products=await sb(env,"/rest/v1/saluz_products?id=in.("+ids.join(",")+")&is_active=eq.true&select=id,name,price_cents,variants");
  const byId=new Map(products.map(p=>[p.id,p]));
  let subtotal=0;
  const lines=b.items.map(i=>{
    const p=byId.get(i.id);
    if (!p) throw new Error("Um produto não está disponível");
    const variants=Array.isArray(p.variants)?p.variants:[];
    const v=variants.find(x=>x.color===i.color && x.size===i.size);
    if (!v || Number(v.stock)<i.quantity) throw new Error("Variação indisponível: "+p.name);
    subtotal+=p.price_cents*i.quantity;
    return {id:p.id,name:p.name,color:v.color,size:v.size,quantity:i.quantity,price_cents:p.price_cents};
  });
  if (subtotal>50000000) throw new Error("Pedido excede o limite");
  const insert={ ...b, items:lines, subtotal_cents:subtotal, shipping_cents:null,
    payment_method:"a_definir",status:"solicitacao_recebida" };
  const created=await sb(env,"/rest/v1/saluz_orders?select=id,status,created_at",{method:"POST",data:insert});
  return output({order_id:created[0].id,status:created[0].status,notice:"Solicitação recebida. Ainda não há pagamento ou frete confirmado."},201);
}
async function recordEvent(request,env) {
  const b=await bodyJson(request);
  if (!uuid.test(String(b.session_id)) || !allowedEvents.has(b.event_type)) return error("Evento inválido");
  const page_path=safeText(b.page_path,140), event_label=safeText(b.event_label,90);
  if (!page_path.startsWith("/")) return error("Página inválida");
  await sb(env,"/rest/v1/saluz_events",{method:"POST",data:{session_id:b.session_id,event_type:b.event_type,page_path,event_label}});
  return output({ok:true},201);
}
async function login(request,env) {
  const b=await bodyJson(request);
  const email=safeText(b.email,160), password=String(b.password||"");
  if (!email || !password || password.length>200) return error("Credenciais inválidas",401);
  const res=await fetch(sbUrl(env,"/auth/v1/token?grant_type=password"),{
    method:"POST",headers:{apikey:env.SUPABASE_ANON_KEY,"content-type":"application/json"},
    body:JSON.stringify({email,password})
  });
  if (!res.ok) return error("Credenciais inválidas",401);
  const result=await res.json();
  if (!result.access_token || !result.user?.id) return error("Acesso negado",403);
  const members=await sb(env,"/rest/v1/saluz_admins?user_id=eq."+result.user.id+"&select=user_id&limit=1");
  if (!members.length) return error("Acesso negado",403);
  const age=Math.max(60,Math.min(3600,Number(result.expires_in)||3600));
  return output({ok:true,email:result.user.email},
    200,{"set-cookie":COOKIE+"="+result.access_token+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+age});
}
async function adminAction(request,env,parts) {
  if (parts[1]==="orders" && request.method==="GET") {
    const rows=await sb(env,"/rest/v1/saluz_orders?select=*&order=created_at.desc&limit=150");
    return output({orders:rows});
  }
  if (parts[1]==="orders" && parts[2] && request.method==="PATCH") {
    if (!uuid.test(parts[2])) return error("Pedido inválido");
    const b=await bodyJson(request);
    if (!orderStatuses.has(b.status)) return error("Status inválido");
    // Payment confirmation must be based on external account evidence, never CPF or receipt alone.
    if (b.status==="pago_confirmado" && b.bank_verified!==true) return error("Confirme o recebimento no extrato da conta",400);
    const rows=await sb(env,"/rest/v1/saluz_orders?id=eq."+parts[2]+"&select=id,status",{
      method:"PATCH",data:{status:b.status,updated_at:new Date().toISOString()}
    });
    return output({order:rows[0]||null});
  }
  if(parts[1]==="upload" && request.method==="POST"){
    const mime=request.headers.get("content-type")||"";
    if(!["image/jpeg","image/png","image/webp"].includes(mime)) return error("Use JPG, PNG ou WebP",400);
    const bytes=await request.arrayBuffer();
    if(!bytes.byteLength || bytes.byteLength>5*1024*1024) return error("Imagem deve ter até 5 MB",400);
    const signature=new Uint8Array(bytes.slice(0,12));
    const jpg=signature[0]===255&&signature[1]===216&&signature[2]===255;
    const png=signature.slice(0,8).join(",")==="137,80,78,71,13,10,26,10";
    const webp=String.fromCharCode(...signature.slice(0,4))==="RIFF"&&String.fromCharCode(...signature.slice(8,12))==="WEBP";
    if(!(mime==="image/jpeg"&&jpg||mime==="image/png"&&png||mime==="image/webp"&&webp))return error("Arquivo de imagem inválido",400);
    const ext=mime==="image/jpeg"?"jpg":mime==="image/png"?"png":"webp";
    const path=crypto.randomUUID()+"."+ext;
    const res=await fetch(sbUrl(env,"/storage/v1/object/saluz-produtos/"+path),{method:"POST",
      headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"content-type":mime,"cache-control":"3600"},body:bytes});
    if(!res.ok)throw new Error("storage "+res.status);
    return output({url:sbUrl(env,"/storage/v1/object/public/saluz-produtos/"+path)},201);
  }
  if (parts[1]==="products" && request.method==="GET") {
    const products=await sb(env,"/rest/v1/saluz_products?select=*&order=created_at.desc&limit=300");
    return output({products});
  }
  if (parts[1]==="products" && request.method==="POST" && parts.length===2) {
    const product=validateProduct(await bodyJson(request));
    const rows=await sb(env,"/rest/v1/saluz_products?select=*",{method:"POST",data:product});
    return output({product:rows[0]},201);
  }
  if (parts[1]==="products" && parts[2] && request.method==="PATCH") {
    if (!uuid.test(parts[2])) return error("Produto inválido");
    const product=validateProduct(await bodyJson(request));
    const rows=await sb(env,"/rest/v1/saluz_products?id=eq."+parts[2]+"&select=*",{method:"PATCH",data:product});
    return output({product:rows[0]||null});
  }
  if (parts[1]==="metrics" && request.method==="GET") {
    const days=Math.min(30,Math.max(1,Number(new URL(request.url).searchParams.get("days"))||7));
    const rows=await sb(env,"/rest/v1/rpc/saluz_analytics",{method:"POST",data:{period_days:days}});
    return output({metrics:rows,days});
  }
  return error("Rota inexistente",404);
}
export async function onRequest({request,env}) {
  const path=new URL(request.url).pathname.split("/").filter(Boolean);
  const route=path.slice(1); // /api/...
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers:JSON_HEADERS});
  if (!checkOrigin(request) && request.method!=="GET") return error("Origem não autorizada",403);
  if (!ready(env)) {
    if (request.method==="GET" && (route[0]==="products" || route[0]==="status"))
      return output({products:[],configured:false,checkout_enabled:false});
    return error("Ambiente em configuração",503);
  }
  try {
    if (route[0]==="status" && request.method==="GET")
      return output({configured:true,checkout_enabled:String(env.CHECKOUT_ENABLED)==="true"});
    if (route[0]==="products" && request.method==="GET") {
      const products=await sb(env,"/rest/v1/saluz_products?is_active=eq.true&select=id,name,description,category,image_url,price_cents,variants&order=created_at.desc&limit=100");
      return output({products,configured:true});
    }
    if (route[0]==="events" && request.method==="POST") return await recordEvent(request,env);
    if (route[0]==="checkout" && request.method==="POST") return await createOrder(request,env);
    if (route[0]==="auth" && route[1]==="login" && request.method==="POST") return await login(request,env);
    if (route[0]==="auth" && route[1]==="logout" && request.method==="POST")
      return output({ok:true},200,{"set-cookie":COOKIE+"=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"});
    if (route[0]==="auth" && route[1]==="me" && request.method==="GET")
      return output({admin:await isAdmin(request,env)});
    if (route[0]==="admin") {
      if (!(await isAdmin(request,env))) return error("Acesso administrativo necessário",401);
      return await adminAction(request,env,route);
    }
    return error("Rota inexistente",404);
  } catch(e) {
    // Do not return credentials, customer data, stack traces or raw provider responses.
    if (e.message && /inválid|incomplet|indisponível|excede|aceitar|Estoque|Muitas|variaç|Nome|Imagem|Um produto|Telefone|Informe|Sacola|Pedido|Endereç/.test(e.message))
      return error(e.message,400);
    return error("Não foi possível concluir a operação. Tente novamente.",500);
  }
}
