/* SALUZ: adaptador D1 isolado. Nao substitui a API atual ate auth/testes/cutover. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories=new Set(["Nécessaires","Porta-joias","Organizadores de maquiagem","Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"]);
const integer=(v,min,max)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)throw Error("Numero invalido");return n;};
export const parseProduct=r=>r?{...r,variants:JSON.parse(r.variants||"[]"),is_active:r.is_active===1,is_featured:r.is_featured===1}:null;
export async function publicProducts(db,{category=null,page=1,limit=24}={}){
 if(!db?.prepare)throw Error("D1 indisponivel");
 const p=integer(page,1,10000),n=integer(limit,1,48);
 if(category!==null&&!categories.has(category))throw Error("Categoria invalida");
 const sql="SELECT id,name,description,category,image_url,price_cents,original_price_cents,variants,is_active,is_featured FROM saluz_products WHERE is_active=1"+(category?" AND category=?":"")+" ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?";
 const args=category?[category,n+1,(p-1)*n]:[n+1,(p-1)*n];
 const rows=(await db.prepare(sql).bind(...args).all())?.results||[];
 return {configured:true,page:p,limit:n,has_more:rows.length>n,products:rows.slice(0,n).map(parseProduct)};
}
export async function productById(db,id){
 if(!uuid.test(id))throw Error("ID invalido");
 return parseProduct(await db.prepare("SELECT id,name,description,category,image_url,price_cents,original_price_cents,variants,is_active,is_featured FROM saluz_products WHERE id=? AND is_active=1").bind(id).first());
}
export async function publishedSiteContent(db){
 const row=await db.prepare("SELECT published FROM saluz_site_content WHERE id=1").first();
 const content=row?.published?JSON.parse(row.published):{};
 if(!content||Array.isArray(content)||typeof content!=="object")throw Error("Conteudo invalido");
 return {content};
}
export async function calculateCart(db,items){
 if(!Array.isArray(items)||items.length<1||items.length>20)throw Error("Sacola invalida");
 const seen=new Set(),result=[];let subtotal=0;
 for(const row of items){
  const id=String(row?.id||""),color=String(row?.color||"").trim(),size=String(row?.size||"").trim(),quantity=integer(row?.quantity,1,10);
  if(!uuid.test(id)||!color||!size||color.length>40||size.length>30)throw Error("Variacao invalida");
  const key=JSON.stringify([id,color,size]);if(seen.has(key))throw Error("Linha duplicada");seen.add(key);
  const product=await productById(db,id);if(!product)throw Error("Produto indisponivel");
  const variation=product.variants.find(v=>v.color===color&&v.size===size);
  if(!variation||variation.stock<quantity)throw Error("Estoque insuficiente");
  const price=Number(product.price_cents);
  if(!Number.isSafeInteger(price)||price<0||price>50000000)throw Error("Preco invalido");
  subtotal+=price*quantity;if(!Number.isSafeInteger(subtotal)||subtotal>50000000)throw Error("Limite excedido");
  result.push({id,name:product.name,color,size,quantity,price_cents:price,line_total_cents:price*quantity});
 }
 return {items:result,subtotal_cents:subtotal,shipping_cents:null,total_cents:null,payment_enabled:false};
}
export async function storageSummary(db){
 if(!db?.prepare)throw Error("D1 indisponivel");
 const total=await db.prepare("SELECT COUNT(*) AS files,COALESCE(SUM(byte_size),0) AS bytes FROM saluz_media WHERE lifecycle='active'").first();
 const grouped=await db.prepare("SELECT purpose AS category,COUNT(*) AS count,COALESCE(SUM(byte_size),0) AS bytes FROM saluz_media WHERE lifecycle='active' GROUP BY purpose ORDER BY bytes DESC").all();
 return {source:"d1_metadata",estimated:true,updated_at:new Date().toISOString(),files:Number(total?.files||0),bytes:Number(total?.bytes||0),by_category:grouped?.results||[],quota_bytes:null,percent_of_quota:null};
}
