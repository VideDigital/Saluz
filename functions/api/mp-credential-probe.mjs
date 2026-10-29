/**
 * SALUZ — read-only Mercado Pago credential probe, ADMIN + STAGING only.
 *
 * Proves that Mercado Pago accepted the test token for GET payment methods;
 * does NOT create an order, reserve inventory or enable checkout.
 * Reference: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/payment-methods/get
 *
 * Never log a request/response body, account information or credentials.
 */
const STAGING_HOST="homologacao.saluz-loja.pages.dev";
const METHODS_URL="https://api.mercadopago.com/v1/payment_methods";

export async function probeMercadoPagoTestCredential({request,env,fetchFn=fetch}){
  const url=new URL(request.url);
  if(url.hostname!==STAGING_HOST||url.protocol!=="https:"||request.method!=="GET")
    return {httpStatus:404,result:{error:"Verificação indisponível"}};
  if(!env?.MP_ACCESS_TOKEN)
    return {httpStatus:200,result:{connection_status:"not_configured",checkout_enabled:false}};
  // Do not send credentials when an accidental production environment is configured
  // as preview. The access token is a server-only Cloudflare secret.
  if(env.MP_ENVIRONMENT==="production"||env.CHECKOUT_ENABLED==="true"||env.MP_CHECKOUT_ENABLED==="true")
    return {httpStatus:200,result:{connection_status:"blocked",checkout_enabled:false}};
  try{
    const response=await fetchFn(METHODS_URL,{
      method:"GET",
      headers:{
        authorization:"Bearer "+env.MP_ACCESS_TOKEN,
        accept:"application/json"
      },
      redirect:"error",
      signal:AbortSignal.timeout(8000)
    });
    if(response.status===401||response.status===403)
      return {httpStatus:200,result:{connection_status:"rejected",checkout_enabled:false}};
    if(!response.ok)
      return {httpStatus:200,result:{connection_status:"unavailable",checkout_enabled:false}};
    // Require the documented array structure, not merely HTTP 200 from a proxy.
    const body=await response.json().catch(()=>null);
    if(!Array.isArray(body))
      return {httpStatus:200,result:{connection_status:"unexpected_response",checkout_enabled:false}};
    return {httpStatus:200,result:{connection_status:"verified_read_only",checkout_enabled:false}};
  }catch{
    return {httpStatus:200,result:{connection_status:"unavailable",checkout_enabled:false}};
  }
}
