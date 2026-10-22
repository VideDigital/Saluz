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
  if (raw.length > 64000) throw new Error("body too long");
  try{return JSON.parse(raw);}
  catch{throw new Error("JSON inválido");}
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
  const allowedCategories=new Set(["Nécessaires","Porta-joias","Organizadores de maquiagem",
    "Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"]);
  if(!allowedCategories.has(category))throw new Error("Selecione uma categoria válida da SALUZ");
  const price_cents=Number(raw.price_cents);
  const original_price_cents=raw.original_price_cents==null||raw.original_price_cents===""?null:Number(raw.original_price_cents);
  if (name.length<2 || !Number.isInteger(price_cents) || price_cents<0 || price_cents>50000000) throw new Error("Nome ou preço inválido");
  if(original_price_cents!==null&&(!Number.isInteger(original_price_cents)||original_price_cents<=price_cents||original_price_cents>50000000))throw new Error("Preço anterior inválido: informe um valor maior que o preço de venda.");
  if (image_url && !/^https:\/\//.test(image_url)) throw new Error("Imagem precisa ter URL HTTPS");
  const variants=Array.isArray(raw.variants) ? raw.variants : [];
  if (variants.length>50) throw new Error("Muitas variações");
  if (raw.is_active===true && variants.length===0) throw new Error("Cadastre ao menos uma variação antes de exibir o produto");
  const normalized=variants.map(v=>{
    const color=safeText(v.color,40), size=safeText(v.size,30);
    const stock=Number(v.stock);
    if (!color || !size) throw new Error("Preencha cor e tamanho em todas as variações");
    if (!Number.isInteger(stock)||stock<0||stock>100000) throw new Error("Estoque inválido");
    const image_url=safeText(v.image_url,650); if(image_url && !/^https:\/\//.test(image_url)) throw new Error("Foto inválida"); return {color,size,stock,image_url};
  });
  const seen=new Set();
  for (const v of normalized) {
    const key=v.color.toLocaleLowerCase("pt-BR")+"|"+v.size.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) throw new Error("Variação duplicada");
    seen.add(key);
  }
  if(raw.is_active===true && !image_url && !normalized.some(v=>v.image_url))
    throw new Error("Adicione uma foto do produto antes de publicá-lo");
  return {name,description,category,image_url,price_cents,original_price_cents,variants:normalized,is_active:raw.is_active===true,is_featured:raw.is_featured===true,updated_at:new Date().toISOString()};
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
  // A mesma variação pode ser enviada em linhas distintas: rejeitar duplicatas,
  // evitando que cada linha passe individualmente na checagem de estoque.
  const uniqueLines=new Set();
  for(const line of b.items){
    const key=JSON.stringify([line.id,line.color,line.size]);
    if(uniqueLines.has(key))throw new Error("Sacola com variações repetidas. Atualize a sacola e tente novamente.");
    uniqueLines.add(key);
  }
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

/** Cotacao read-only do carrinho, exclusiva da homologacao.
 * Valores e estoque consultados no banco; nao cria pedido e nao cobra.
 */
async function quoteCheckoutPreview(request,env){
  const raw=await bodyJson(request);
  if(!Array.isArray(raw.items)||raw.items.length===0||raw.items.length>20)
    return error("Adicione de 1 a 20 produtos para consultar a sacola.",400);
  const lines=raw.items.map(i=>{
    const id=String(i?.id||""),quantity=Number(i?.quantity);
    const color=safeText(i?.color,40),size=safeText(i?.size,30);
    if(!uuid.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>10||!color||!size)
      throw new Error("Sacola inválida");
    return {id,quantity,color,size};
  });
  const seen=new Set();
  for(const item of lines){
    const key=JSON.stringify([item.id,item.color,item.size]);
    if(seen.has(key))throw new Error("Sacola com variações repetidas");
    seen.add(key);
  }
  const ids=[...new Set(lines.map(x=>x.id))];
  const rows=await sb(env,"/rest/v1/saluz_products?id=in.("+ids.join(",")+")&is_active=eq.true&select=id,name,price_cents,variants");
  const products=new Map(rows.map(p=>[p.id,p]));
  let subtotal=0;
  const items=lines.map(item=>{
    const product=products.get(item.id);
    if(!product)throw new Error("Um produto não está disponível");
    const variant=Array.isArray(product.variants)?product.variants.find(v=>v.color===item.color&&v.size===item.size):null;
    if(!variant||Number(variant.stock)<item.quantity)throw new Error("Estoque indisponível: "+product.name);
    const unit=Number(product.price_cents);
    if(!Number.isSafeInteger(unit)||unit<0)throw new Error("Preço inválido");
    subtotal+=unit*item.quantity;
    if(!Number.isSafeInteger(subtotal)||subtotal>50000000)throw new Error("Pedido excede o limite");
    return {id:item.id,name:product.name,color:item.color,size:item.size,
      quantity:item.quantity,unit_price_cents:unit,line_total_cents:unit*item.quantity};
  });
  const postalCode=digits(raw.postal_code);
  if(postalCode&&postalCode.length!==8)throw new Error("CEP inválido");
  return output({
    mode:"homologacao_visual",items,subtotal_cents:subtotal,
    shipping_cents:null,shipping_status:"aguardando_configuracao",
    total_cents:null,payment_enabled:false,available_payment_methods:["pix","credit_card"],
    notice:"O frete ainda não foi configurado. Esta prévia não cria pedido nem cobra pagamentos."
  });
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
  // Requer chave distinta da service_role para nunca armazenar IP/e-mail identificáveis.
  if(!env.LOGIN_RATE_SECRET || String(env.LOGIN_RATE_SECRET).length<32)
    return error("Proteção de acesso aguardando configuração",503);
  const clientIp=request.headers.get("cf-connecting-ip")||"unknown";
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",encoder.encode(env.LOGIN_RATE_SECRET),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const fingerprint=await crypto.subtle.sign("HMAC",key,encoder.encode(
    "saluz-login-v1|"+clientIp.toLowerCase().slice(0,128)));
  const hash=[...new Uint8Array(fingerprint)].map(n=>n.toString(16).padStart(2,"0")).join("");
  const withinLimit=await sb(env,"/rest/v1/rpc/saluz_check_login_limit",{
    method:"POST",data:{p_hash:hash,p_max:8,p_window_seconds:900}
  });
  if(withinLimit!==true)
    return output({error:"Muitas tentativas. Aguarde 15 minutos antes de entrar."},429,{"retry-after":"900"});

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
const siteContentFields={top_bar:110,hero_title:90,hero_description:310,hero_button:48,hero_image_url:500,hero_link:95,
  featured_title:80,new_title:80,featured_description:180,new_description:180,business_hours:100,contact_email:180,store_notice:170,
  promo_enabled:3,promo_title:90,promo_description:220,promo_button:48,promo_link:95,promo_image_url:500,whatsapp_number:15,instagram_url:180,
  moment_label:42,moment_title:100,moment_image_url:500,
  moment_link1_title:48,moment_link1_href:95,moment_link2_title:48,moment_link2_href:95,
  moment_link3_title:48,moment_link3_href:95,moment_link4_title:48,moment_link4_href:95,
  gift_label:42,gift_title:100,gift_description:200,gift_image_url:500,gift_button:48,gift_link:95,
  kits_title:100,
  kit1_title:64,kit1_description:180,kit1_link:95,
  kit2_title:64,kit2_description:180,kit2_link:95,
  kit3_title:64,kit3_description:180,kit3_link:95};
const allowedStoreLinks=new Set(["./loja.html","./colecoes.html","./colecao-necessaires.html",
  "./colecao-porta-joias.html","./colecao-kits-presentes.html","./colecao-autocuidado.html","./atendimento.html",
  "./colecao-organizadores-maquiagem.html","./colecao-organizadores-bolsa.html",
  "./colecao-acessorios-viagem.html","./colecao-acessorios-femininos.html"]);
const allowedBannerPlacements=new Set(["home_after_hero","home_before_featured","home_before_new",
  "home_bottom","catalog_after_hero","catalog_before_products","catalog_bottom"]);
const allowedBannerStyles=new Set(["editorial","compact","image"]);
function validateBannerDate(raw) {
  if(raw==null||raw==="")return "";
  const value=String(raw);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString()!==value)throw new Error("Data da campanha inválida");
  return value;
}
function validateBanners(raw) {
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>24)throw new Error("Limite de 24 banners por loja");
  const ids=new Set();
  const cleaned=raw.map(item=>{
    if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("Banner inválido");
    const id=String(item.id||"");
    if(!uuid.test(id)||ids.has(id))throw new Error("Identificador de banner inválido");
    ids.add(id);
    const placement=String(item.placement||""),style=String(item.style||"editorial");
    if(!allowedBannerPlacements.has(placement)||!allowedBannerStyles.has(style))throw new Error("Local ou estilo do banner inválido");
    const textFields={eyebrow:42,title:90,description:230,button_label:48,image_url:500,mobile_image_url:500};
    const record={id,placement,style};
    for(const [key,max] of Object.entries(textFields)){
      const value=safeText(item[key],max);
      if(/[<>]/.test(value))throw new Error("HTML não permitido em banners");
      if((key==="image_url"||key==="mobile_image_url")&&value&&!/^https:\/\/[^\s<>"']+$/i.test(value))
        throw new Error("Imagem do banner deve usar HTTPS");
      record[key]=value;
    }
    if(!record.title)throw new Error("Informe o título do banner");
    const link=String(item.link||"");
    if(!allowedStoreLinks.has(link))throw new Error("Escolha um link existente na loja");
    record.link=link;
    record.active=item.active===true;
    record.starts_at=validateBannerDate(item.starts_at);
    record.ends_at=validateBannerDate(item.ends_at);
    if(record.starts_at&&record.ends_at&&Date.parse(record.ends_at)<=Date.parse(record.starts_at))
      throw new Error("Término deve ser posterior ao início do banner");
    return record;
  });
  return cleaned;
}
function validateSiteContent(raw){
  if(!raw || Array.isArray(raw) || typeof raw!=="object")throw new Error("Conteúdo inválido");
  if(Object.keys(raw).some(key=>!(key in siteContentFields)&&key!=="banners"))throw new Error("Campo de conteúdo não permitido");
  const cleaned={};
  for(const [key,max] of Object.entries(siteContentFields)){
    const value=safeText(raw[key],max);
    if(/[<>]/.test(value))throw new Error("HTML não é permitido nos textos da loja");
    if((["hero_image_url","promo_image_url","moment_image_url","gift_image_url"].includes(key))&&value&&!/^https:\/\/[^\s<>"']+$/i.test(value))throw new Error("Imagem deve usar URL HTTPS");
    if(["hero_link","promo_link","moment_link1_href","moment_link2_href","moment_link3_href","moment_link4_href","gift_link","kit1_link","kit2_link","kit3_link"].includes(key)&&value&&!allowedStoreLinks.has(value)&&!(key==="gift_link"&&value==="#kits"))throw new Error("O link deve apontar para uma página existente da SALUZ");
    if(key==="promo_enabled"&&value&&!["yes","no"].includes(value))throw new Error("Opção de banner inválida");
    if(key==="whatsapp_number"&&value&&!/^\d{10,13}$/.test(value.replace(/\D/g,"")))throw new Error("WhatsApp deve ter DDD e número válidos");
    if(key==="instagram_url"&&value&&!/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]{1,30}\/?$/.test(value))throw new Error("Informe um link de perfil do Instagram válido");
    if(key==="contact_email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error("E-mail inválido");
    cleaned[key]=key==="whatsapp_number"?value.replace(/\D/g,""):value;
  }
  cleaned.banners=validateBanners(raw.banners);
  return cleaned;
}
/* Resumo privado, agregado. Nenhum dado de cliente e exposto nesta rota. */
async function storeHealth(env) {
  const limit=200,maxPages=10;
  const counts={total:0,active:0,hidden:0,featured:0,onSale:0,lowStock:0,outOfStock:0};
  const lowStockItems=[];
  let truncated=false;
  for(let page=0;page<maxPages;page++){
    const items=await sb(env,"/rest/v1/saluz_products?select=id,name,category,is_active,is_featured,variants,price_cents,original_price_cents,image_url&order=id.asc&limit="+(limit+1)+"&offset="+page*limit);
    const chunk=items.slice(0,limit);
    for(const p of chunk){
      counts.total++;
      if(p.is_active)counts.active++;else counts.hidden++;
      if(p.is_active&&p.is_featured)counts.featured++;
      if(Number(p.original_price_cents)>Number(p.price_cents))counts.onSale++;
      const stock=(Array.isArray(p.variants)?p.variants:[]).reduce((a,v)=>a+Math.max(0,Number(v.stock)||0),0);
      if(p.is_active&&stock===0)counts.outOfStock++;
      if(p.is_active&&stock>0&&stock<=5)counts.lowStock++;
      if(p.is_active&&stock<=5&&lowStockItems.length<8){
        lowStockItems.push({id:p.id,name:p.name.slice(0,140),stock,image_url:p.image_url||""});
      }
    }
    if(items.length<=limit){truncated=false;break;}
    if(page===maxPages-1)truncated=true;
  }
  const rows=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&select=draft,published,published_at&limit=1");
  const doc=rows[0]||{draft:{},published:{},published_at:null};
  const now=Date.now();
  let activeBanners=0,scheduledBanners=0;
  for(const b of (Array.isArray(doc.published?.banners)?doc.published.banners:[])){
    if(!b||!b.active)continue;
    if(b.ends_at&&Date.parse(b.ends_at)<=now)continue;
    if(b.starts_at&&Date.parse(b.starts_at)>now)scheduledBanners++;else activeBanners++;
  }
  // Confrontar apenas configuracoes publicaveis; data historica de revisao nao muda a contagem.
  const unpublished=JSON.stringify(doc.draft||{})!==JSON.stringify(doc.published||{});
  return {counts,lowStockItems,activeBanners,scheduledBanners,unpublished,updatedAt:new Date().toISOString(),
    publishedAt:doc.published_at,truncated};
}
async function adminAction(request,env,parts) {
  if(parts[1]==="payment-integration"&&parts.length===2&&request.method==="GET"){
    // Estado de ativação privado. Não retorna chaves, emails ou tokens.
    return output({provider:"mercado_pago",integration:"checkout_pro_orders",
      credentials_configured:!!env.MP_ACCESS_TOKEN,
      webhook_configured:!!env.MP_WEBHOOK_SECRET,
      stock_reservation_ready:false,
      payment_reconciliation_ready:false,
      checkout_enabled:false,
      live_payments_enabled:false,
      notice:"Integração em preparação. Pagamentos reais continuam desativados."});
  }
  if(parts[1]==="store-health"&&parts.length===2&&request.method==="GET")
    return output(await storeHealth(env));
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
    const declaredLength=Number(request.headers.get("content-length")||0);
    if(declaredLength>5*1024*1024)return error("Imagem deve ter até 5 MB",413);
    const bytes=await request.arrayBuffer();
    if(!bytes.byteLength || bytes.byteLength>5*1024*1024) return error("Imagem deve ter até 5 MB",413);
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
    const query=new URL(request.url).searchParams;
    const rawPage=query.get("page")||"1";
    if(!/^[1-9][0-9]{0,4}$/.test(rawPage)||Number(rawPage)>10000)return error("Paginação inválida",400);
    const page=Number(rawPage),limit=48;
    const search=(query.get("search")||"").trim();
    if(search.length>90||!/^[\p{L}\p{N}\s-]*$/u.test(search))return error("Pesquisa de produtos inválida",400);
    const filter=search?"&or="+encodeURIComponent("(name.ilike.*"+search+"*,category.ilike.*"+search+"*)"):"";
    const rows=await sb(env,"/rest/v1/saluz_products?select=*"+filter+"&order=created_at.desc,id.desc&limit="+(limit+1)+"&offset="+((page-1)*limit));
    return output({products:rows.slice(0,limit),page,has_more:rows.length>limit});
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
  if (parts[1]==="site-content" && parts.length===2) {
    if(request.method==="GET") {
      const rows=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&select=draft,published,revision,updated_at,published_at&limit=1");
      return output({content:rows[0]||{draft:{},published:{},revision:0}});
    }
    if(request.method==="PUT") {
      const incoming=await bodyJson(request);
      const current=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&select=revision&limit=1");
      const version=current[0]?.revision??0;
      if(incoming.revision!==version)return error("Versão desatualizada: recarregue o editor para evitar sobrescrever alterações",409);
      const cleaned=validateSiteContent(incoming.draft);
      const rows=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&revision=eq."+version+"&select=draft,published,revision,updated_at,published_at",{method:"PATCH",data:{draft:cleaned,revision:version+1,updated_at:new Date().toISOString()}});
      if(!rows.length)return error("Alteração concorrente. Atualize o editor",409);
      return output({content:rows[0]});
    }
  }
  if(parts[1]==="site-content" && parts.length===3 && request.method==="POST" && ["publish","discard"].includes(parts[2])){
    const incoming=await bodyJson(request);
    const rows=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&select=draft,published,revision,updated_at,published_at&limit=1");
    const row=rows[0];
    if(!row)return error("Conteúdo do site não configurado",503);
    if(incoming.revision!==row.revision)return error("Versão desatualizada: recarregue o editor",409);
    const now=new Date().toISOString(),changes=parts[2]==="publish"?
      {published:row.draft,published_at:now,revision:row.revision+1,updated_at:now}:
      {draft:row.published,revision:row.revision+1,updated_at:now};
    const updated=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&revision=eq."+row.revision+"&select=draft,published,revision,updated_at,published_at",{method:"PATCH",data:changes});
    if(!updated.length)return error("Atualização concorrente. Recarregue o editor",409);
    return output({content:updated[0]});
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
  // Migração de leitura isolada: mesmo contrato de APIs, sem depender das
  // credenciais do Supabase para testar D1. Nunca habilitar em produção.
  const d1Preview=request.method==="GET" &&
    new URL(request.url).hostname==="homologacao.saluz-loja.pages.dev" &&
    new URL(request.url).searchParams.get("source")==="d1";
  if(d1Preview&&(route[0]==="products"||(route[0]==="site-content"&&route.length===1))){
    const adapter=await import("../../cloudflare/d1/approved-api.mjs");
    return route[0]==="products"
      ?adapter.approvedProductsFromD1({request,env,route})
      :adapter.approvedSiteContentFromD1({request,env});
  }
  // Laboratório de autenticação D1: independente do Supabase para login/sessão.
  // Primeiro cadastro exige identidade já autenticada e autorizada no Supabase.
  // Não modifica /api/auth, /api/admin nem cookies do painel aprovado.
  if(route[0]==="migration-auth" && route.length===2){
    if(new URL(request.url).hostname!=="homologacao.saluz-loja.pages.dev")
      return error("Rota indisponível",404);
    const authModule=await import("../../cloudflare/d1/staging-auth.mjs");
    return authModule.onD1AuthRequest({request,env,route:route[1],
      verifyLegacyAdmin:async()=>{
        if(!ready(env)||!(await isAdmin(request,env)))return null;
        const token=cookieToken(request);
        const verified=await fetch(sbUrl(env,"/auth/v1/user"),{
          headers:{apikey:env.SUPABASE_ANON_KEY,authorization:"Bearer "+token}
        });
        if(!verified.ok)return null;
        const account=await verified.json();
        return account?.id&&account?.email?{id:account.id,email:account.email}:null;
      }});
  }
  if (!ready(env)) {
    if (request.method==="GET" && (route[0]==="products" || route[0]==="status"))
      return output({products:[],configured:false,checkout_enabled:false});
    return error("Ambiente em configuração",503);
  }
  try {
    // Canário D1/KV exclusivo da homologação. Mantém catálogo e painel atuais no Supabase.
    if(route[0]==="migration-media" && route.length===1 && request.method==="GET")
      return await (await import("../../cloudflare/d1/staging-admin.mjs")).onPublicMediaGet({request,env});
    if(route[0]==="migration-admin"){
      if(new URL(request.url).hostname!=="homologacao.saluz-loja.pages.dev")
        return error("Não disponível",404);
      if(!(await isAdmin(request,env)))return error("Acesso administrativo necessário",401);
      return await (await import("../../cloudflare/d1/staging-admin.mjs")).onAdminRequest({request,env,route:route.slice(1).join("/"),validateProduct});
    }
    if(route[0]==="site-content" && route.length===1 && request.method==="GET"){
      const rows=await sb(env,"/rest/v1/saluz_site_content?id=eq.1&select=published&limit=1");
      return output({content:rows[0]?.published||{}});
    }
    if (route[0]==="status" && request.method==="GET")
      return output({configured:true,checkout_enabled:false,orders_locked:true,
        checkout_preview:new URL(request.url).hostname==="homologacao.saluz-loja.pages.dev"});
    if (route[0]==="products" && request.method==="GET") {
      const columns="id,name,description,category,image_url,price_cents,original_price_cents,variants";
      if(route[1]==="home" && route.length===2){
        const featured=await sb(env,"/rest/v1/saluz_products?is_active=eq.true&is_featured=eq.true&select="+columns+"&order=created_at.desc&limit=8");
        const recent=await sb(env,"/rest/v1/saluz_products?is_active=eq.true&select="+columns+"&order=created_at.desc&limit=24");
        // Não repetir os mesmos produtos nos dois blocos da página inicial.
        const featuredIds=new Set(featured.map(p=>p.id));
        const newest=recent.filter(p=>!featuredIds.has(p.id)).slice(0,8);
        return output({featured,newest,configured:true});
      }
      // Favoritos: consultar somente IDs válidos e produtos publicados, sem depender do limite da vitrine.
      if(route[1]==="favorites" && route.length===2){
        const rawIds=new URL(request.url).searchParams.get("ids")||"";
        const ids=rawIds?rawIds.split(","):[];
        if(ids.length>60 || ids.some(id=>!uuid.test(id)) || new Set(ids).size!==ids.length)
          return error("Lista de favoritos inválida",400);
        if(!ids.length)return output({products:[],configured:true});
        const products=await sb(env,"/rest/v1/saluz_products?id=in.("+ids.join(",")+")&is_active=eq.true&select="+columns+"&limit=60");
        return output({products,configured:true});
      }
      // Página individual: nunca expor produtos ocultos ou IDs inválidos.
      if(route[1]){
        if(!uuid.test(route[1])||route.length!==2)return error("Produto inválido",404);
        const matches=await sb(env,"/rest/v1/saluz_products?id=eq."+route[1]+"&is_active=eq.true&select="+columns+"&limit=1");
        return matches.length?output({product:matches[0],configured:true}):error("Produto não encontrado",404);
      }
      // O filtro é aplicado no servidor e não apenas no navegador.
      const allowedCategories=new Set(["Nécessaires","Porta-joias","Organizadores de maquiagem",
        "Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"]);
      const category=new URL(request.url).searchParams.get("category");
      if(category && !allowedCategories.has(category))return error("Categoria inválida",400);
      const filter=category?"&category=eq."+encodeURIComponent(category):"";
      const q=new URL(request.url).searchParams;
      const rawPage=q.get("page")||"1",rawLimit=q.get("limit")||"24";
      if(!/^[1-9][0-9]{0,4}$/.test(rawPage)||!/^[1-9][0-9]{0,2}$/.test(rawLimit))
        return error("Paginação inválida",400);
      const page=Number(rawPage),limit=Number(rawLimit);
      if(page>10000||limit>48)return error("Paginação inválida",400);
      const offset=(page-1)*limit;
      const products=await sb(env,"/rest/v1/saluz_products?is_active=eq.true"+filter+
        "&select="+columns+"&order=created_at.desc,id.desc&limit="+(limit+1)+"&offset="+offset);
      return output({products:products.slice(0,limit),configured:true,page,limit,has_more:products.length>limit});
    }
    if (route[0]==="events" && request.method==="POST") return await recordEvent(request,env);
    if(route[0]==="checkout"&&route[1]==="quote"&&request.method==="POST"&&
      new URL(request.url).hostname==="homologacao.saluz-loja.pages.dev")
      return await quoteCheckoutPreview(request,env);
    if (route[0]==="checkout" && request.method==="POST")
      return error("Pedidos desativados até existir reserva atômica de estoque e aprovação da SALUZ.",503);
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
    if (e.message && /inválid|incomplet|indisponível|excede|aceitar|Estoque|Muitas|variaç|Nome|Imagem|Um produto|Telefone|Informe|Sacola|Pedido|Endereç|Cadastre|Preencha|repetidas|Selecione|Adicione|duplicada|HTML|link|WhatsApp|E-mail|Preço anterior|banner|Banner|título|Título|Término|Data da campanha|link existente|Escolha/.test(e.message))
      return error(e.message,400);
    return error("Não foi possível concluir a operação. Tente novamente.",500);
  }
}
