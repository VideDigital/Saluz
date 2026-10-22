/* SALUZ / KV para fotos compactadas — DEV/STAGING somente.
 * Módulo sem rotas públicas. Binding SALUZ_MEDIA; catálogo de metadados no D1.
 * Workers KV é eventualmente consistente: nomes imutáveis por SHA-256.
 */
const TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,"0")).join("");
const starts=(a,b,offset=0)=>b.every((x,i)=>a[offset+i]===x);
export function imageMime(bytes) {
 if(!(bytes instanceof Uint8Array)||bytes.length<12)return null;
 if(starts(bytes,[255,216,255]))return "image/jpeg";
 if(starts(bytes,[137,80,78,71,13,10,26,10]))return "image/png";
 if(starts(bytes,[82,73,70,70])&&starts(bytes,[87,69,66,80],8))return "image/webp";
 if(starts(bytes,[102,116,121,112],4)&&(starts(bytes,[97,118,105,102],8)||starts(bytes,[97,118,105,115],8)))return "image/avif";
 return null;
}
export async function validateAndNameImage({bytes,claimedType,environment,purpose}){
 if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>500000)
   throw Error("Imagem deve ser otimizada para no máximo 500 KB");
 if(!["dev","staging"].includes(environment))throw Error("Ambiente de armazenamento não autorizado");
 if(!["product","banner","editorial"].includes(purpose))throw Error("Tipo de arquivo não autorizado");
 const mime=imageMime(bytes);
 if(!mime||mime!==claimedType)throw Error("Formato declarado não corresponde aos dados da imagem");
 const sha256=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
 return {sha256,mime,bytes:bytes.byteLength,key:environment+"/"+purpose+"/"+sha256+"."+TYPES[mime]};
}
export async function putImage({kv,db,bytes,claimedType,environment,purpose,filename}){
 if(!kv?.put||!kv?.get||!db?.prepare)throw Error("KV e D1 precisam estar configurados");
 const info=await validateAndNameImage({bytes,claimedType,environment,purpose});
 const existing=await db.prepare("SELECT id,lifecycle FROM saluz_media WHERE r2_key=?").bind(info.key).first();
 if(existing?.lifecycle==="active")return {id:existing.id,key:info.key,reused:true};
 if(existing)throw Error("Imagem está em descarte: recupere antes de reutilizar");
 // KV não realiza escrita condicional; nome imutável derivado do hash permite repetição segura.
 await kv.put(info.key,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{metadata:{sha256:info.sha256,mime:info.mime}});
 const id=crypto.randomUUID();
 const registered=await db.prepare("INSERT INTO saluz_media (id,r2_key,original_name,mime_type,byte_size,sha256,purpose) VALUES(?,?,?,?,?,?,?)")
   .bind(id,info.key,String(filename||"imagem").slice(0,140),info.mime,info.bytes,info.sha256,purpose).run();
 if(registered?.success!==true)throw Error("Não foi possível registrar a imagem no banco");
 return {id,key:info.key,reused:false};
}
export async function readImage({kv,db,key}){
 if(!kv?.get||!db?.prepare||typeof key!=="string"||!/^((dev)|(staging))\/(product|banner|editorial)\/[0-9a-f]{64}\.(jpg|png|webp|avif)$/.test(key))
  throw Error("Imagem inválida");
 const record=await db.prepare("SELECT mime_type,lifecycle FROM saluz_media WHERE r2_key=?").bind(key).first();
 if(!record||record.lifecycle!=="active")return null;
 const bytes=await kv.get(key,"arrayBuffer");
 if(!bytes)return null;
 return {bytes,mime:record.mime_type};
}
/* Não há delete() nesta API: imagens somente em lixeira lógica com registro de auditoria. */
