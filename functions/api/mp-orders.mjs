/**
 * SALUZ — Adaptador de backend para Mercado Pago Checkout Pro (Orders API).
 * Importar apenas nas Pages Functions. NUNCA publicar o Access Token em HTML/JS do navegador.
 * NAO ativar checkout antes da reserva atomica e sincronizacao de pagamentos.
 * Documentacao: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/create-order
 */
const BASE="https://api.mercadopago.com/v1/orders";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const formatBRL=cents=>{
 if(!Number.isSafeInteger(cents)||cents<0||cents>50000000)throw Error("Valor inválido");
 return (cents/100).toFixed(2);
};
export function prepareOrder({id,payerEmail,items,shippingCents=0}){
 if(!UUID.test(String(id)))throw Error("Identificador de pedido inválido");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payerEmail)))throw Error("E-mail do cliente inválido");
 if(!Array.isArray(items)||!items.length||items.length>20)throw Error("Itens inválidos");
 if(!Number.isSafeInteger(shippingCents)||shippingCents<0)throw Error("Frete não confirmado");
 let total=shippingCents;
 const normalized=items.map(item=>{
  const title=String(item.name||"").trim().slice(0,120),quantity=Number(item.quantity),price=Number(item.price_cents);
  if(!title||!Number.isSafeInteger(quantity)||quantity<1||quantity>10)throw Error("Quantidade inválida");
  formatBRL(price);
  total+=price*quantity;
  return {title,quantity,unit_price:formatBRL(price),unit_measure:"unit",total_amount:formatBRL(price*quantity)};
 });
 if(shippingCents>0)normalized.push({title:"Frete",quantity:1,unit_price:formatBRL(shippingCents),unit_measure:"unit",total_amount:formatBRL(shippingCents)});
 if(total<100||total>50000000||!Number.isSafeInteger(total))throw Error("Total de pagamento inválido");
 return {type:"online",processing_mode:"manual",total_amount:formatBRL(total),
  external_reference:id,payer:{email:String(payerEmail)},items:normalized};
}
export function requireSafeCheckout(env,{production=false}={}){
 if(!env?.MP_ACCESS_TOKEN)throw Error("Mercado Pago ainda não conectado");
 if(env.MP_CHECKOUT_ENABLED!=="true"||env.CHECKOUT_ENABLED!=="true")
  throw Error("Checkout desativado até validação final");
 // Deve ser atestado no banco transacional, nunca exclusivamente por variável manual.
 if(env.MP_STOCK_RESERVATION_VERIFIED!=="true")throw Error("Reserva atômica ainda não validada");
 if(env.MP_WEBHOOK_VERIFIED!=="true")throw Error("Confirmação de pagamentos ainda não validada");
 if(production&&env.MP_LIVE_APPROVED!=="true")throw Error("Liberação da SALUZ ainda pendente");
}
export async function createMPOrder({env,order,idempotencyKey,fetchFn=fetch}){
 requireSafeCheckout(env,{production:env.MP_ENVIRONMENT==="production"});
 if(!UUID.test(String(idempotencyKey)))throw Error("Chave de idempotência inválida");
 // order DEVE ser revalidado contra reserva e dados persistidos no banco pela rota chamadora.
 const res=await fetchFn(BASE,{method:"POST",headers:{
  "authorization":"Bearer "+env.MP_ACCESS_TOKEN,"content-type":"application/json",
  "accept":"application/json","x-idempotency-key":idempotencyKey
 },body:JSON.stringify(order),signal:AbortSignal.timeout(12000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error("Mercado Pago indisponível ("+res.status+")");
 if(!data.id||!/^https:\/\/[^\s<>"']+$/.test(String(data.checkout_url||"")))
  throw Error("Resposta de checkout inválida");
 return {id:String(data.id),checkout_url:String(data.checkout_url)};
}
export async function retrieveMPOrder({env,mpOrderId,fetchFn=fetch}){
 if(!env?.MP_ACCESS_TOKEN)throw Error("Credenciais ainda não configuradas");
 if(!/^[A-Za-z0-9_-]{6,110}$/.test(String(mpOrderId)))throw Error("Identificador de pagamento inválido");
 const res=await fetchFn(BASE+"/"+encodeURIComponent(mpOrderId),{headers:{
  authorization:"Bearer "+env.MP_ACCESS_TOKEN,accept:"application/json"
 },signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error("Consulta de pagamento indisponível ("+res.status+")");
 return res.json();
}
/** Verificação de assinatura conforme documentação Mercado Pago.
 * Somente eventos verificáveis; reconsultar GET /v1/orders/{id} antes de modificar estados.
 */
export async function validateMPWebhook({signature,requestId,dataId,secret,now=Date.now()}){
 if(!signature||!requestId||!dataId||!secret)return false;
 const values=Object.fromEntries(signature.split(",").map(x=>x.trim().split("=")));
 const timestamp=Number(values.ts),hex=String(values.v1||"");
 if(!Number.isSafeInteger(timestamp)||!Number.isFinite(timestamp)||!/^[0-9a-f]{64}$/i.test(hex))return false;
 // A assinatura contém timestamp em milissegundos; rejeitar replay antigo.
 if(Math.abs(now-timestamp)>5*60*1000)return false;
 const manifest="id:"+String(dataId).toLowerCase()+";request-id:"+requestId+";ts:"+values.ts+";";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const expected=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(manifest)));
 const actual=new Uint8Array(hex.match(/../g).map(h=>parseInt(h,16)));
 let diff=0;for(let i=0;i<expected.length;i++)diff|=expected[i]^actual[i];
 return diff===0;
}
