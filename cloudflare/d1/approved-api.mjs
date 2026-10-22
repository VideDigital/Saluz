/* SALUZ — API de leitura D1 usando o contrato da VITRINE APROVADA.
 * /api/products permanece igual. Habilitação somente por opt-in explícito
 * no hostname exato de homologação; produção NUNCA acessa esta rota D1.
 * O catálogo não cria pedidos, não habilita checkout e não modifica dados.
 */
import {publicProducts,productById,parseProduct} from "./repository.mjs";
const PRODUCT_COLUMNS="id,name,description,category,image_url,price_cents,original_price_cents,variants,is_active,is_featured";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8",
   "cache-control":"no-store","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"}
});
export function previewD1Requested(request) {
 const url=new URL(request.url);
 return url.hostname==="homologacao.saluz-loja.pages.dev" &&
   url.searchParams.get("source")==="d1";
}
export async function approvedProductsFromD1({request,env,route}) {
 if(!previewD1Requested(request))return response({error:"Prévia indisponível"},404);
 if(request.method!=="GET")return response({error:"Método inválido"},405);
 const db=env?.SALUZ_D1_PREVIEW;
 if(!db?.prepare)return response({error:"Banco de homologação indisponível"},503);
 const url=new URL(request.url);
 const params=url.searchParams;
 try {
   if(route.length===2&&route[1]==="home") {
     const featured=await db.prepare(
       "SELECT "+PRODUCT_COLUMNS+" FROM saluz_products WHERE is_active=1 AND is_featured=1 ORDER BY created_at DESC LIMIT 8"
     ).all();
     const newest=await db.prepare(
       "SELECT "+PRODUCT_COLUMNS+" FROM saluz_products WHERE is_active=1 ORDER BY created_at DESC LIMIT 24"
     ).all();
     const f=(featured.results||[]).map(parseProduct);
     const featuredIds=new Set(f.map(p=>p.id));
     const n=(newest.results||[]).map(parseProduct).filter(p=>!featuredIds.has(p.id)).slice(0,8);
     return response({featured:f,newest:n,configured:true});
   }
   if(route.length===2&&route[1]==="favorites") {
     const raw=params.get("ids")||"";
     const ids=raw?raw.split(","):[];
     if(ids.length>60||ids.some(id=>!uuid.test(id))||new Set(ids).size!==ids.length)
       return response({error:"Lista de favoritos inválida"},400);
     if(!ids.length)return response({products:[],configured:true});
     const placeholders=ids.map(()=>"?").join(",");
     const data=await db.prepare(
       "SELECT "+PRODUCT_COLUMNS+" FROM saluz_products WHERE is_active=1 AND id IN ("+placeholders+") LIMIT 60"
     ).bind(...ids).all();
     const byId=new Map((data.results||[]).map(r=>[r.id,parseProduct(r)]));
     return response({products:ids.map(id=>byId.get(id)).filter(Boolean),configured:true});
   }
   if(route.length===2){
     if(!uuid.test(route[1]))return response({error:"Produto inválido"},404);
     const product=await productById(db,route[1]);
     return product?response({product,configured:true}):response({error:"Produto não encontrado"},404);
   }
   if(route.length!==1)return response({error:"Rota inexistente"},404);
   const rawPage=params.get("page")||"1",rawLimit=params.get("limit")||"24";
   if(!/^[1-9][0-9]{0,4}$/.test(rawPage)||!/^[1-9][0-9]{0,2}$/.test(rawLimit))
     return response({error:"Paginação inválida"},400);
   const page=Number(rawPage),limit=Number(rawLimit);
   if(page>10000||limit>48)return response({error:"Paginação inválida"},400);
   const items=await publicProducts(db,{category:params.get("category")||null,page,limit});
   return response({products:items.products,configured:true,page,limit,has_more:items.has_more});
 } catch(e) {
   if(/Categoria invalida|Numero invalido/.test(e.message))
     return response({error:"Filtros inválidos"},400);
   return response({error:"Catálogo de homologação indisponível"},503);
 }
}
