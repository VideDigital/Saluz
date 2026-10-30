/* SALUZ staging only: D1 site-content editor contract.
 * This module is called only from the existing migration-admin authorization gate.
 * No production route, checkout, token or legacy database writes.
 */
import {validateSiteContent} from "./content-validation.mjs";

const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow"};
const output=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const meaningful=x=>plain(x)&&Object.entries(x).some(([k,v])=>
 k==="banners" ? Array.isArray(v)&&v.length>0 : typeof v==="string"&&v.trim().length>0
);
function parse(row){
 if(!row)return null;
 const draft=JSON.parse(row.draft),published=JSON.parse(row.published);
 if(!plain(draft)||!plain(published))throw Error("Estado de conteúdo inválido");
 const revision=Number(row.revision);
 if(!Number.isSafeInteger(revision)||revision<0)throw Error("Revisão de conteúdo inválida");
 return {draft,published,revision,updated_at:row.updated_at??null,
  published_at:row.published_at??null};
}
async function read(db){
 return parse(await db.prepare("SELECT draft,published,revision,updated_at,published_at FROM saluz_site_content WHERE id=1").first());
}
async function body(request){
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")
  return null;
 const raw=await request.text();
 if(!raw||raw.length>32000)return null;
 try{return JSON.parse(raw)}catch{return null}
}
function errorCode(e){
 if(/não é permitido|HTML|banner|Banner|Data|link|URL|WhatsApp|E-mail|Conteúdo|campo|opção|Imagem|excedido|limite|título/i.test(e?.message||""))
  return 400;
 return 500;
}
export async function handleStagingContent({request,db,route}){
 const hostname=new URL(request.url).hostname,method=request.method;
 if(hostname!=="homologacao.saluz-loja.pages.dev"||!db?.prepare)
  return output({error:"Indisponível"},404);
 if(route==="content"&&method==="GET"){
  try{
   const current=await read(db);
   if(!current)return output({error:"Conteúdo D1 não inicializado"},503);
   return output({content:current,source:"D1 staging",checkout_enabled:false});
  }catch{return output({error:"Falha ao ler conteúdo D1"},500)}
 }
 const operation=route==="content"&&method==="PUT"?"save":
   route==="content/publish"&&method==="POST"?"publish":
   route==="content/discard"&&method==="POST"?"discard":null;
 if(!operation)return output({error:"Rota indisponível"},404);
 const input=await body(request);
 if(!plain(input)||!Number.isSafeInteger(input.revision)||input.revision<0)
  return output({error:"Revisão ou JSON inválido"},400);
 let cleaned;
 if(operation==="save"){
  if(!plain(input.draft))return output({error:"Rascunho inválido"},400);
  try{
   cleaned=validateSiteContent(input.draft);
   if(JSON.stringify(cleaned).length>16000)return output({error:"Conteúdo muito grande"},400);
  }catch(e){return output({error:errorCode(e)===400?e.message:"Conteúdo inválido"},400)}
 }
 try{
  const existing=await read(db);
  if(!existing)return output({error:"Conteúdo D1 não inicializado"},503);
  if(existing.revision!==input.revision)
   return output({error:"Versão desatualizada: recarregue o editor"},409);
  if(operation==="publish"){
   if(!meaningful(existing.draft))
    return output({error:"Publicação bloqueada: rascunho D1 vazio"},409);
   // Existing rows were authored under this exact schema. Do not publish unvalidated imports.
   try{validateSiteContent(existing.draft)}catch{return output({error:"Rascunho incompatível; revise os campos"},400)}
  }
  const now=new Date().toISOString();
  const sql=operation==="save"
   ?"UPDATE saluz_site_content SET draft=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?"
   :operation==="publish"
   ?"UPDATE saluz_site_content SET published=draft,published_at=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?"
   :"UPDATE saluz_site_content SET draft=published,revision=revision+1,updated_at=? WHERE id=1 AND revision=?";
  const binds=operation==="save"?[JSON.stringify(cleaned),now,input.revision]:
    operation==="publish"?[now,now,input.revision]:[now,input.revision];
  const result=await db.prepare(sql).bind(...binds).run();
  if(result?.meta?.changes!==1)
   return output({error:"Atualização concorrente; recarregue o editor"},409);
  return output({content:await read(db),source:"D1 staging",checkout_enabled:false});
 }catch{
  return output({error:"Falha na operação de conteúdo D1"},500);
 }
}
