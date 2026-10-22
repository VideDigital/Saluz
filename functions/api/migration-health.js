/* SALUZ - diagnóstico SOMENTE da homologação D1/KV.
 * Uma rota read-only independente da API Supabase atual.
 * Não expor registros administrativos, dados pessoais ou detalhes de segredos.
 */
const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"private, no-store",
    "x-robots-tag":"noindex, nofollow",
    "x-content-type-options":"nosniff"
  }
});
export async function onRequestGet({request,env}){
  if(new URL(request.url).hostname!=="homologacao.saluz-loja.pages.dev")
    return json({error:"Não disponível"},404);
  if(!env.SALUZ_D1_PREVIEW?.prepare || !env.SALUZ_MEDIA_PREVIEW?.get)
    return json({ready:false,environment:"staging",payments_enabled:false,
      database_connected:false,media_connected:false},503);
  try{
    const data=await env.SALUZ_D1_PREVIEW.prepare(
      "SELECT (SELECT COUNT(*) FROM saluz_products) AS product_count, "+
      "(SELECT COUNT(*) FROM saluz_products WHERE is_active=1) AS active_products, "+
      "(SELECT COUNT(*) FROM saluz_media WHERE lifecycle='active') AS registered_images, "+
      "(SELECT COUNT(*) FROM saluz_site_content) AS content_rows"
    ).first();
    return json({
      ready:data?.content_rows===1,
      environment:"staging",
      database_connected:true,
      media_connected:true,
      catalog_live:false,
      payments_enabled:false,
      counts:{
        products:Number(data?.product_count||0),
        active_products:Number(data?.active_products||0),
        registered_images:Number(data?.registered_images||0)
      }
    });
  }catch{
    return json({ready:false,environment:"staging",payments_enabled:false,
      database_connected:false,media_connected:true,error:"Banco de homologação indisponível"},503);
  }
}
