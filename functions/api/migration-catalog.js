/* SALUZ: leitura experimental de catálogo D1 em homologação.
 * NÃO substitui /api/products (Supabase) nem aceita inserções.
 */
import {publicProducts} from "../../cloudflare/d1/repository.mjs";
const respond=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"private, no-store",
    "x-robots-tag":"noindex, nofollow",
    "x-content-type-options":"nosniff"
  }
});
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  if(url.hostname!=="homologacao.saluz-loja.pages.dev")
    return respond({error:"Não disponível"},404);
  if(!env.SALUZ_D1_PREVIEW?.prepare)
    return respond({configured:false,payments_enabled:false},503);
  const category=url.searchParams.get("category");
  const page=url.searchParams.get("page")||"1";
  const limit=url.searchParams.get("limit")||"24";
  if(!/^[1-9][0-9]{0,4}$/.test(page)||!/^[1-9][0-9]{0,2}$/.test(limit))
    return respond({error:"Paginação inválida"},400);
  try{
    const catalog=await publicProducts(env.SALUZ_D1_PREVIEW,{
      page:Number(page),limit:Number(limit),category:category||null
    });
    return respond({...catalog,environment:"staging",payments_enabled:false,
      source:"D1 staging",demo_only:true});
  }catch(error){
    if(/Categoria inválida|Numero invalido/.test(error.message))
      return respond({error:"Consulta inválida"},400);
    return respond({error:"Catálogo experimental indisponível"},503);
  }
}
