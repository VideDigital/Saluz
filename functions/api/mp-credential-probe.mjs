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
const diagnostic=(status,code,http)=>({httpStatus:200,result:{connection_status:status,diagnostic_code:code,...(Number.isInteger(http)&&http>=400&&http<=599?{provider_http_status:http}:{}),checkout_enabled:false}});

export async function probeMercadoPagoTestCredential({request,env,fetchFn=fetch}){
  const url=new URL(request.url);
  if(url.hostname!==STAGING_HOST||url.protocol!=="https:"||request.method!=="GET")
    return {httpStatus:404,result:{error:"Verificação indisponível"}};
  if(!env?.MP_ACCESS_TOKEN)
    return diagnostic("not_configured","missing_test_secret");
  // Do not send credentials when an accidental production environment is configured
  // as preview. The access token is a server-only Cloudflare secret.
  if(env.MP_ENVIRONMENT==="production"||env.CHECKOUT_ENABLED==="true"||env.MP_CHECKOUT_ENABLED==="true")
    return diagnostic("blocked","unsafe_environment_flags");
  // O segredo pode ter sido colado com espaços/quebras de linha. Não revelar valor,
  // tamanho, prefixo ou fragmentos da credencial no diagnóstico.
  if(typeof env.MP_ACCESS_TOKEN!=="string")
    return diagnostic("invalid_credential_format","secret_not_text");
  const token=env.MP_ACCESS_TOKEN.trim();
  if(!token||/\s|[\x00-\x1f\x7f]/.test(token))
    return diagnostic("invalid_credential_format","secret_contains_invalid_whitespace");
  // Garante que cabeçalhos inválidos não sejam confundidos com falha de DNS/rede.
  let headers;
  try{headers=new Headers({authorization:"Bearer "+token,accept:"application/json"});}
  catch{return diagnostic("invalid_credential_format","invalid_authorization_header");}
  try{
    const response=await fetchFn(METHODS_URL,{
      method:"GET",
      headers,
      // Nunca seguir redirect com Authorization para outro host.
      redirect:"manual",
      signal:AbortSignal.timeout(8000)
    });
    if(response.status>=300&&response.status<=399)
      return diagnostic("provider_redirect","provider_redirect_not_followed");
    if(response.status===401||response.status===403)
      return diagnostic("rejected","provider_auth_rejected",response.status);
    if(response.status===408||response.status===504)return diagnostic("timeout","provider_timeout_http",response.status);
    if(response.status===429)return diagnostic("rate_limited","provider_rate_limited",response.status);
    if(response.status>=500&&response.status<=599)return diagnostic("provider_error","provider_server_error",response.status);
    if(response.status>=400&&response.status<=499)return diagnostic("request_rejected","provider_request_error",response.status);
    if(!response.ok)return diagnostic("unexpected_response","unexpected_provider_status");
    // Require the documented array structure, not merely HTTP 200 from a proxy.
    const body=await response.json().catch(()=>null);
    if(!Array.isArray(body))
      return diagnostic("unexpected_response","invalid_provider_json");
    return diagnostic("verified_read_only","provider_read_accepted");
  }catch(e){
    if(e?.name==="TimeoutError"||e?.name==="AbortError")return diagnostic("timeout","request_timed_out");
    if(e?.name==="TypeError"){
      // Diagnóstico adicional sem credencial: distingue indisponibilidade do
      // destino de falha restrita à requisição com Authorization.
      // Nunca seguir redirecionamentos nem divulgar cabeçalhos/resposta do provedor.
      try{
        const reachable=await fetchFn(METHODS_URL,{
          method:"GET",headers:{accept:"application/json"},
          redirect:"manual",signal:AbortSignal.timeout(3000)
        });
        if(Number.isInteger(reachable?.status)&&reachable.status>=100&&reachable.status<=599)
          return diagnostic("transport_error","provider_reachable_auth_request_failed");
      }catch{}
      return diagnostic("transport_error","network_or_request_error");
    }
    return diagnostic("runtime_error","unexpected_fetch_exception");
  }
}
