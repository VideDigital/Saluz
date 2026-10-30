/* SALUZ D1/KV migration laboratory.
 * Staging-only, access checked by the existing Supabase Auth in the main API.
 * NEVER reuse for live payments or switch the public catalog here.
 */
import {putImage,readImage} from "../../cloudflare/storage/kv-media.mjs";
import {storeHealthD1} from "./store-health.mjs";
const categories=new Set(["Nécessaires","Porta-joias","Organizadores de maquiagem","Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
import {handleStagingContent} from "./staging-content.mjs";
function stage(request,env){
 return new URL(request.url).hostname==="homologacao.saluz-loja.pages.dev"&&!!env.SALUZ_D1_PREVIEW?.prepare&&!!env.SALUZ_MEDIA_PREVIEW?.get;
}
function product(row){return row?{...row,is_active:row.is_active===1,is_featured:row.is_featured===1,variants:JSON.parse(row.variants)}:null;}
async function json(request){
 const text=await request.text();if(text.length>32000)throw Error("Payload muito grande");
 return JSON.parse(text);
}
function validProduct(b,validateProduct){
 const p=validateProduct(b);
 if(!categories.has(p.category))throw Error("Categoria inválida");
 return p;
}
async function syncPhotoReferences(db,p){
 const mediaUrls=[p.image_url,...p.variants.map(v=>v.image_url)].filter(v=>v?.includes("/api/migration-media?key="));
 for(const u of mediaUrls){
   const url=new URL(u);
   if(url.origin!=="https://homologacao.saluz-loja.pages.dev"||url.pathname!=="/api/migration-media")throw Error("Imagem da migração inválida");
   const key=url.searchParams.get("key");
   if(!/^(staging)\/(product|banner|editorial)\/[0-9a-f]{64}\.(jpg|png|webp|avif)$/.test(key||""))throw Error("Imagem da migração inválida");
   const row=await db.prepare("SELECT id FROM saluz_media WHERE r2_key=? AND lifecycle='active'").bind(key).first();
   if(!row)throw Error("Imagem da migração não encontrada");
 }
}
export async function onAdminRequest({request,env,route,validateProduct}){
 if(!stage(request,env))return response({error:"Laboratório indisponível"},404);
 const db=env.SALUZ_D1_PREVIEW,url=new URL(request.url),method=request.method;
 try{
   if(route==="store-health"&&method==="GET"){
     return response(await storeHealthD1(db));
   }
   if(route==="products"&&method==="GET"){
     const p=Number(url.searchParams.get("page")||1),limit=48;
     if(!Number.isSafeInteger(p)||p<1||p>1000)return response({error:"Página inválida"},400);
     const result=await db.prepare("SELECT * FROM saluz_products ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?").bind(limit+1,(p-1)*limit).all();
     const rows=result.results||[];
     return response({products:rows.slice(0,limit).map(product),page:p,has_more:rows.length>limit,source:"D1 staging"});
   }
   if(route==="products"&&method==="POST"){
     const p=validProduct(await json(request),validateProduct);
     await syncPhotoReferences(db,p);
     const id=crypto.randomUUID(),now=new Date().toISOString();
     await db.prepare("INSERT INTO saluz_products(id,name,description,category,image_url,price_cents,original_price_cents,variants,is_active,is_featured,created_at,updated_at,revision) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)")
       .bind(id,p.name,p.description,p.category,p.image_url,p.price_cents,p.original_price_cents,JSON.stringify(p.variants),p.is_active?1:0,p.is_featured?1:0,now,now).run();
     return response({product:product(await db.prepare("SELECT * FROM saluz_products WHERE id=?").bind(id).first())},201);
   }
   if(/^products\/[0-9a-f-]{36}$/i.test(route)&&method==="PATCH"){
     const id=route.slice(9);if(!uuid.test(id))return response({error:"ID inválido"},400);
     const b=await json(request),revision=Number(b.revision);
     if(!Number.isSafeInteger(revision)||revision<0)return response({error:"Revisão obrigatória"},400);
     const p=validProduct(b,validateProduct);
     await syncPhotoReferences(db,p);
     const changed=await db.prepare("UPDATE saluz_products SET name=?,description=?,category=?,image_url=?,price_cents=?,original_price_cents=?,variants=?,is_active=?,is_featured=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?")
       .bind(p.name,p.description,p.category,p.image_url,p.price_cents,p.original_price_cents,JSON.stringify(p.variants),p.is_active?1:0,p.is_featured?1:0,new Date().toISOString(),id,revision).run();
     if(changed.meta?.changes!==1)return response({error:"Produto alterado por outra sessão ou não encontrado"},409);
     return response({product:product(await db.prepare("SELECT * FROM saluz_products WHERE id=?").bind(id).first())});
   }
   if(route==="content"||route==="content/publish"||route==="content/discard"){
     return handleStagingContent({request,db,route});
   }
   if(route==="storage"&&method==="GET"){
     const counts=await db.prepare("SELECT COUNT(*) files,COALESCE(SUM(byte_size),0) bytes FROM saluz_media WHERE lifecycle='active'").first();
     const files=await db.prepare("SELECT id,original_name,mime_type,byte_size,purpose,uploaded_at,r2_key FROM saluz_media WHERE lifecycle='active' ORDER BY uploaded_at DESC LIMIT 100").all();
     const cap=80000000;
     return response({files:files.results||[],used_bytes:Number(counts.bytes),file_count:Number(counts.files),quota_bytes:cap,
       alert_levels:[70,85,95],estimated:true,source:"metadata D1 (quota interna staging)",deletion_enabled:false});
   }
   if(route==="upload"&&method==="POST"){
     const mime=(request.headers.get("content-type")||"").split(";")[0];
     const purpose=request.headers.get("x-saluz-media-purpose")||"product";
     const declared=Number(request.headers.get("content-length")||0);
     if(declared>500000)return response({error:"Imagem acima do limite de 500 KB"},413);
     const bytes=new Uint8Array(await request.arrayBuffer());
     if(bytes.length>500000)return response({error:"Imagem acima do limite de 500 KB"},413);
     const quota=await db.prepare("SELECT COALESCE(SUM(byte_size),0) bytes FROM saluz_media WHERE lifecycle='active'").first();
     if(Number(quota.bytes)+bytes.length>80000000)return response({error:"Limite interno de armazenamento da homologação atingido"},507);
     const saved=await putImage({kv:env.SALUZ_MEDIA_PREVIEW,db,bytes,claimedType:mime,environment:"staging",
       purpose,filename:request.headers.get("x-saluz-filename")||"imagem"});
     const publicUrl=new URL("/api/migration-media",url);
     publicUrl.searchParams.set("key",saved.key);
     return response({url:publicUrl.toString(),id:saved.id,reused:saved.reused},201);
   }
   return response({error:"Rota não encontrada"},404);
 }catch(e){
   if(/Imagem|Categoria|Nome|Preço|Estoque|variaç|Limite|Formato|arquivo|tamanho|foto|URL|rascunho|visível|Selecione|inval|duplicad/i.test(e.message))
     return response({error:e.message},400);
   return response({error:"Falha na operação de homologação"},500);
 }
}
export async function onPublicMediaGet({request,env}){
 if(!stage(request,env))return new Response(null,{status:404});
 const key=new URL(request.url).searchParams.get("key")||"";
 try{
   const item=await readImage({kv:env.SALUZ_MEDIA_PREVIEW,db:env.SALUZ_D1_PREVIEW,key});
   if(!item)return new Response(null,{status:404});
   return new Response(item.bytes,{headers:{"content-type":item.mime,"cache-control":"public, max-age=3600","x-content-type-options":"nosniff","x-robots-tag":"noindex"}});
 }catch{return new Response(null,{status:404})}
}
