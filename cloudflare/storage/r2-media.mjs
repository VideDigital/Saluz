/* SALUZ R2: adaptador isolado; nao conectado ao site nesta etapa. */
const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
const starts=(b,a,o=0)=>a.every((v,i)=>b[o+i]===v);
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
export function detectImageType(b){
 if(!(b instanceof Uint8Array)||b.length<12)return null;
 if(starts(b,[255,216,255]))return "image/jpeg";
 if(starts(b,[137,80,78,71,13,10,26,10]))return "image/png";
 if(starts(b,[82,73,70,70])&&starts(b,[87,69,66,80],8))return "image/webp";
 if(starts(b,[102,116,121,112],4)&&(starts(b,[97,118,105,102],8)||starts(b,[97,118,105,115],8)))return "image/avif";
 return null;
}
export async function prepareMedia({bytes,claimedType,purpose,environment}){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>5242880)throw Error("Imagem deve ter ate 5 MB");
 const mime=detectImageType(bytes);
 if(!mime||mime!==claimedType)throw Error("Tipo da imagem incompativel com conteudo");
 if(!["product","banner","editorial","other"].includes(purpose))throw Error("Categoria invalida");
 if(!["dev","staging"].includes(environment))throw Error("Uploads reais permitidos apenas DEV/STAGING");
 const hash=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
 return {id:crypto.randomUUID(),sha256:hash,mime_type:mime,byte_size:bytes.length,purpose,
  r2_key:environment+"/"+purpose+"/"+hash+"."+types[mime]};
}
export async function saveMedia({bucket,db,bytes,claimedType,purpose,environment,originalName}){
 if(!bucket?.head||!bucket?.put||!db?.prepare)throw Error("D1 e R2 nao configurados");
 const media=await prepareMedia({bytes,claimedType,purpose,environment});
 const prev=await db.prepare("SELECT id,r2_key,lifecycle FROM saluz_media WHERE r2_key=?").bind(media.r2_key).first();
 if(prev?.lifecycle==="active")return {id:prev.id,r2_key:prev.r2_key,reused:true};
 if(prev)throw Error("Arquivo em descarte: restaurar antes de reutilizar");
 if(!await bucket.head(media.r2_key))
  await bucket.put(media.r2_key,bytes,{httpMetadata:{contentType:media.mime_type},customMetadata:{sha256:media.sha256}});
 const stored=await db.prepare("INSERT INTO saluz_media (id,r2_key,original_name,mime_type,byte_size,sha256,purpose) VALUES(?,?,?,?,?,?,?)")
 .bind(media.id,media.r2_key,String(originalName||"imagem").slice(0,140),media.mime_type,media.byte_size,media.sha256,media.purpose).run();
 if(stored?.success!==true)throw Error("Registro de arquivo falhou");
 return {id:media.id,r2_key:media.r2_key,reused:false};
}
/* Nunca apaga R2 automaticamente: somente lixeira reversivel de itens sem vinculos. */
export async function moveToTrash({db,mediaId,adminId,confirmed}){
 if(!confirmed||!db?.prepare||!mediaId||!adminId)throw Error("Confirmacao obrigatoria");
 const valid=/^[0-9a-f-]{36}$/i;
 if(!valid.test(mediaId)||!valid.test(adminId))throw Error("Identificador invalido");
 const result=await db.prepare("UPDATE saluz_media SET lifecycle='trash',trashed_at=? WHERE id=? AND lifecycle='active' AND NOT EXISTS(SELECT 1 FROM saluz_media_references WHERE media_id=?)")
 .bind(new Date().toISOString(),mediaId,mediaId).run();
 if(result?.meta?.changes!==1)throw Error("Arquivo em uso ou inexistente");
 await db.prepare("INSERT INTO saluz_audit_log(id,admin_id,action,entity_type,entity_id,detail) VALUES(?,?,?,?,?,?)")
 .bind(crypto.randomUUID(),adminId,"media_trash","media",mediaId,JSON.stringify({reversible:true})).run();
 return {trashed:true,recoverable:true,physicalDeletion:false};
}
export async function restoreFromTrash({db,mediaId,adminId,confirmed}){
 if(!confirmed||!db?.prepare)throw Error("Confirmacao obrigatoria");
 const result=await db.prepare("UPDATE saluz_media SET lifecycle='active',trashed_at=NULL WHERE id=? AND lifecycle='trash'").bind(mediaId).run();
 if(result?.meta?.changes!==1)throw Error("Arquivo nao encontrado na lixeira");
 await db.prepare("INSERT INTO saluz_audit_log(id,admin_id,action,entity_type,entity_id,detail) VALUES(?,?,?,?,?,?)")
 .bind(crypto.randomUUID(),adminId,"media_restore","media",mediaId,"{}").run();
 return {restored:true};
}
