/* SALUZ / D1 staging: product quotations and transactional inventory reservation.
 * No payments, customer-facing order submission, or Supabase dependency here.
 * The reservation helper is NOT exposed as an HTTP route until shipping/webhook
 * reconciliation and administrator authorization are implemented and tested.
 */
const STAGE="homologacao.saluz-loja.pages.dev";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jsonHeaders={"content-type":"application/json; charset=utf-8","cache-control":"no-store",
 "x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow"};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:jsonHeaders});
const digits=value=>String(value||"").replace(/\D/g,"");
const safeText=(value,max)=>String(value||"").trim().slice(0,max);
const variantsOf=row=>{
 try{const result=JSON.parse(row.variants);return Array.isArray(result)?result:[];}
 catch{return [];}
};
export function validateCart(raw){
 if(!Array.isArray(raw?.items)||raw.items.length<1||raw.items.length>20)
  throw new Error("Sacola inválida");
 const found=new Set(),items=[];
 for(const item of raw.items){
  const id=String(item?.id||""),quantity=Number(item?.quantity);
  const color=safeText(item?.color,40),size=safeText(item?.size,30);
  if(!UUID.test(id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>10||!color||!size)
   throw new Error("Sacola inválida");
  const key=JSON.stringify([id,color,size]);
  if(found.has(key))throw new Error("Sacola com variações repetidas");
  found.add(key);items.push({id,quantity,color,size});
 }
 const cep=digits(raw.postal_code);
 if(cep&&cep.length!==8)throw new Error("CEP inválido");
 return {items,postal_code:cep};
}
export async function quoteCartD1(db,cart){
 const input=validateCart(cart),uniqueIds=[...new Set(input.items.map(x=>x.id))];
 const placeholders=uniqueIds.map(()=>"?").join(",");
 const result=await db.prepare(
  "SELECT id,name,price_cents,variants FROM saluz_products WHERE is_active=1 AND id IN ("+placeholders+")"
 ).bind(...uniqueIds).all();
 const products=new Map((result.results||[]).map(p=>[p.id,p]));
 let subtotal=0;
 const items=input.items.map(item=>{
  const product=products.get(item.id);
  if(!product)throw new Error("Produto indisponível");
  const variant=variantsOf(product).find(v=>v.color===item.color&&v.size===item.size);
  if(!variant||!Number.isSafeInteger(variant.stock)||variant.stock<item.quantity)
    throw new Error("Estoque indisponível");
  const unit=Number(product.price_cents),line=unit*item.quantity;
  if(!Number.isSafeInteger(unit)||unit<0||!Number.isSafeInteger(line))throw new Error("Preço inválido");
  subtotal+=line;
  if(!Number.isSafeInteger(subtotal)||subtotal>50000000)throw new Error("Pedido excede o limite");
  return {id:item.id,name:product.name,color:item.color,size:item.size,quantity:item.quantity,
   unit_price_cents:unit,line_total_cents:line};
 });
 return {mode:"homologacao_visual",source:"D1 staging",items,subtotal_cents:subtotal,
  shipping_cents:null,shipping_status:"aguardando_configuracao",total_cents:null,
  payment_enabled:false,available_payment_methods:["pix","credit_card"],
  notice:"Frete não configurado. Esta cotação não reserva estoque, cria pedidos nem cobra pagamentos."};
}
export async function quoteRequestD1({request,env}){
 if(new URL(request.url).hostname!==STAGE||request.method!=="POST")
  return reply({error:"Não disponível"},404);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"Origem não autorizada"},403);
 if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))
  return reply({error:"Formato inválido"},415);
 if(!env?.SALUZ_D1_PREVIEW?.prepare)return reply({error:"D1 de homologação indisponível"},503);
 try{
  const raw=await request.text();
  if(raw.length>8192)return reply({error:"Sacola inválida"},400);
  return reply(await quoteCartD1(env.SALUZ_D1_PREVIEW,JSON.parse(raw)));
 }catch(e){
  if(e instanceof SyntaxError)return reply({error:"JSON inválido"},400);
  const m=String(e?.message||"");
  if(/Sacola|CEP|Estoque|Preço|Pedido|Produto/.test(m))return reply({error:m},400);
  return reply({error:"Cotação de homologação indisponível"},503);
 }
}
function customerForOrder(raw){
 const c=raw||{},customer={
  customer_name:safeText(c.customer_name,120),
  customer_email:safeText(c.customer_email,160).toLowerCase(),
  customer_phone:digits(c.customer_phone),customer_cpf:digits(c.customer_cpf),
  postal_code:digits(c.postal_code),address_line:safeText(c.address_line,160),
  address_number:safeText(c.address_number,20),address_extra:safeText(c.address_extra,100),
  neighborhood:safeText(c.neighborhood,100),city:safeText(c.city,100),
  state:safeText(c.state,2).toUpperCase()
 };
 if(customer.customer_name.length<3||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.customer_email)||
  customer.customer_phone.length<10||customer.customer_phone.length>13||
  customer.customer_cpf.length!==11||customer.postal_code.length!==8||
  !customer.address_line||!customer.address_number||!customer.neighborhood||!customer.city||
  !/^[A-Z]{2}$/.test(customer.state))throw new Error("Dados do pedido inválidos");
 return customer;
}
/** Internal helper; no route invokes this yet. Requires server-verified freight.
 * D1.batch is a transaction. Triggers reject overselling/price drift and roll back
 * every stock change AND the order if any line fails.
 */
export async function reserveOrderD1({db,orderId,cart,customer,shippingCents,shippingVerified=false}){
 if(!db?.batch||!UUID.test(String(orderId))||shippingVerified!==true||
   !Number.isSafeInteger(shippingCents)||shippingCents<0||shippingCents>50000000)
  throw new Error("Frete e reserva não verificados");
 const quoted=await quoteCartD1(db,cart);
 const total=quoted.subtotal_cents+shippingCents;
 if(total<100||total>50000000)throw new Error("Total inválido");
 const c=customerForOrder(customer);
 const now=Date.now(),created=new Date(now).toISOString(),expiry=new Date(now+15*60*1000).toISOString();
 const keys=["customer_name","customer_email","customer_phone","customer_cpf","postal_code",
 "address_line","address_number","address_extra","neighborhood","city","state"];
 const orderSql="INSERT INTO saluz_orders(id,"+keys.join(",")+
  ",items,subtotal_cents,shipping_cents,payment_method,status,payment_provider,payment_state,"+
  "stock_reserved_at,stock_reservation_expires_at,created_at,updated_at) VALUES("+
  Array(1+keys.length+12).fill("?").join(",")+")";
 const itemSnapshot=quoted.items.map(x=>({...x}));
 const values=[orderId,...keys.map(k=>c[k]),JSON.stringify(itemSnapshot),quoted.subtotal_cents,
  shippingCents,"a_definir","aguardando_pagamento","nenhum","nao_iniciado",created,expiry,created,created];
 const statements=[db.prepare(orderSql).bind(...values)];
 for(const line of quoted.items){
  statements.push(db.prepare(
   "INSERT INTO saluz_stock_reservations(order_id,product_id,color,size,quantity,unit_price_cents,expires_at) "+
   "VALUES(?,?,?,?,?,?,?)"
  ).bind(orderId,line.id,line.color,line.size,line.quantity,line.unit_price_cents,expiry));
 }
 await db.batch(statements);
 return {order_id:orderId,status:"aguardando_pagamento",payment_enabled:false,
  reserved_until:expiry,subtotal_cents:quoted.subtotal_cents,shipping_cents:shippingCents,total_cents:total};
}
