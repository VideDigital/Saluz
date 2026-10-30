/* SALUZ D1 staging: resumo do catálogo administrado no MESMO D1 da vitrine.
 * Consulta somente leitura, através do endpoint admin protegido, sem fallback
 * para Supabase e sem ativar pedidos ou pagamentos.
 */
const PAGE_SIZE=200,MAX_PAGES=10;
function parsedVariants(raw){
 const variants=JSON.parse(raw||"[]");
 if(!Array.isArray(variants))throw Error("Catálogo D1 inválido");
 return variants;
}
function validStock(variants){
 let total=0;
 for(const variant of variants){
  const n=variant.stock;
  if(!Number.isSafeInteger(n)||n<0)throw Error("Estoque D1 inválido");
  total+=n;
  if(!Number.isSafeInteger(total))throw Error("Estoque D1 inválido");
 }
 return total;
}
function jsonObj(raw){
 const o=JSON.parse(raw||"{}");
 if(!o||typeof o!=="object"||Array.isArray(o))throw Error("Conteúdo D1 inválido");
 return o;
}
export async function storeHealthD1(db,{now=Date.now()}={}){
 if(!db?.prepare)throw Error("Banco D1 indisponível");
 const counts={total:0,active:0,hidden:0,featured:0,onSale:0,lowStock:0,outOfStock:0};
 const lowStockItems=[];
 let truncated=false;
 for(let page=0;page<MAX_PAGES;page++){
  const data=await db.prepare(
   "SELECT id,name,image_url,is_active,is_featured,variants,price_cents,original_price_cents "+
   "FROM saluz_products ORDER BY id ASC LIMIT ? OFFSET ?"
  ).bind(PAGE_SIZE+1,page*PAGE_SIZE).all();
  const rows=data?.results||[];
  for(const row of rows.slice(0,PAGE_SIZE)){
   const stock=validStock(parsedVariants(row.variants));
   const active=row.is_active===1||row.is_active===true;
   counts.total++;
   if(active)counts.active++;else counts.hidden++;
   if(active&&(row.is_featured===1||row.is_featured===true))counts.featured++;
   if(Number(row.original_price_cents)>Number(row.price_cents))counts.onSale++;
   if(active&&stock===0)counts.outOfStock++;
   if(active&&stock>0&&stock<=5)counts.lowStock++;
   if(active&&stock<=5&&lowStockItems.length<8)
    lowStockItems.push({id:row.id,name:String(row.name||"").slice(0,140),
      stock,image_url:row.image_url||""});
  }
  if(rows.length<=PAGE_SIZE)break;
  if(page===MAX_PAGES-1)truncated=true;
 }
 const content=await db.prepare(
  "SELECT draft,published,published_at FROM saluz_site_content WHERE id=1"
 ).first();
 // Never fall back to Supabase on missing or malformed D1 content.
 if(!content)throw Error("Conteúdo D1 não inicializado");
 const draft=jsonObj(content.draft),published=jsonObj(content.published);
 let activeBanners=0,scheduledBanners=0;
 for(const b of Array.isArray(published.banners)?published.banners:[]){
  if(!b||b.active!==true)continue;
  if(b.ends_at&&Date.parse(b.ends_at)<=now)continue;
  if(b.starts_at&&Date.parse(b.starts_at)>now)scheduledBanners++;
  else activeBanners++;
 }
 return {
  source:"D1 staging",checkout_enabled:false,
  counts,lowStockItems,activeBanners,scheduledBanners,
  unpublished:JSON.stringify(draft)!==JSON.stringify(published),
  publishedAt:content.published_at||null,
  updatedAt:new Date(now).toISOString(),truncated
 };
}
