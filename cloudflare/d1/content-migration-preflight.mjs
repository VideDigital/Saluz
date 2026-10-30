/* SALUZ — migration preflight. No writes, no external links or secrets. */
export function compareContentMigration({source,destination}){
 const plain=x=>x&&typeof x==="object"&&!Array.isArray(x);
 const validate=(x,label)=>{
  if(!plain(x)||!plain(x.draft)||!plain(x.published))return {valid:false,reason:label+"_invalid"};
  const meaningful=x=>Object.keys(x).some(k=>{
    const v=x[k];return k==="banners"?Array.isArray(v)&&v.length>0:typeof v==="string"&&v.trim().length>0;
  });
  return {valid:true,meaningful:meaningful(x.draft)||meaningful(x.published),
    draft_fields:Object.keys(x.draft).length,published_fields:Object.keys(x.published).length,
    published_banners:Array.isArray(x.published.banners)?x.published.banners.length:0,
    revision:Number.isSafeInteger(x.revision)?x.revision:null};
 };
 const a=validate(source,"source"),b=validate(destination,"destination");
 const blockers=[];
 if(!a.valid||!a.meaningful)blockers.push("source_empty_or_invalid");
 if(!b.valid)blockers.push("destination_invalid");
 if(b.valid&&(b.meaningful||b.revision!==0))blockers.push("destination_has_changes");
 return {can_import:blockers.length===0,blockers,source:a,destination:b,
   checkout_enabled:false,mode:"read_only_preflight"};
}
