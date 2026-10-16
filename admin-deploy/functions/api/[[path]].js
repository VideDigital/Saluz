/* SALUZ Control: proxy same-origin limitado ao backend SALUZ, sem chaves no navegador. */
const METHODS={auth:new Set(["login","logout","me"]),admin:new Set(["orders","upload","products","metrics","site-content","store-health","payment-integration"]),status:new Set([""])};
export async function onRequest({request,env}){
  const target=String(env.ADMIN_API_ORIGIN||"");
  if(!["https://usesaluz.com.br","https://homologacao.saluz-loja.pages.dev"].includes(target))
    return new Response('Configuração pendente',{status:503});
  const url=new URL(request.url);
  const parts=url.pathname.split("/").filter(Boolean);
  if(parts[0]!=="api")return new Response("Not found",{status:404});
  const section=parts[1],endpoint=parts[2]||"";
  if(!(section in METHODS)||!METHODS[section].has(endpoint))
    return new Response("Not found",{status:404});
  if(section==="status"&&request.method!=="GET")return new Response("Method not allowed",{status:405});
  if(section==="auth"){
    if(!((endpoint==="me"&&request.method==="GET")||(["login","logout"].includes(endpoint)&&request.method==="POST")))
      return new Response("Method not allowed",{status:405});
  }
  if(section==="admin"){
    if(!["GET","POST","PATCH","PUT"].includes(request.method))return new Response("Method not allowed",{status:405});
    if(endpoint==="site-content"&&parts[3]&&!["publish","discard"].includes(parts[3]))
      return new Response("Not found",{status:404});
  }
  const origin=request.headers.get("Origin");
  if(origin&&origin!==url.origin)return new Response("Origem não autorizada",{status:403});
  const dest=new URL(url.pathname+url.search,target);
  const headers=new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("x-forwarded-for");
  headers.delete("x-forwarded-host");
  headers.set("Origin",target);
  const init={method:request.method,headers,redirect:"manual"};
  if(!["GET","HEAD"].includes(request.method))init.body=request.body;
  const upstream=await fetch(new Request(dest,init));
  const outHeaders=new Headers(upstream.headers);
  outHeaders.set("cache-control","no-store");
  outHeaders.delete("access-control-allow-origin");
  return new Response(upstream.body,{status:upstream.status,headers:outHeaders});
}
