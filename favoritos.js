/* SALUZ — Favoritos salvos apenas neste navegador, sem dados pessoais. */
(function(global){
"use strict";
const KEY="saluz-favorites-v1";
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX=60;
const sanitize=list=>{
 if(!Array.isArray(list))return [];
 return [...new Set(list.filter(id=>typeof id==="string"&&ID.test(id)).map(id=>id.toLowerCase()))].slice(0,MAX);
};
const read=()=>{
 try{return sanitize(JSON.parse(global.localStorage.getItem(KEY)||"[]"));}
 catch{return [];}
};
const notify=()=>{
 if(typeof global.dispatchEvent==="function"&&typeof global.CustomEvent==="function")
   global.dispatchEvent(new global.CustomEvent("saluz:favorites",{detail:{count:read().length}}));
};
const save=list=>{
 const items=sanitize(list);
 try{
   global.localStorage.setItem(KEY,JSON.stringify(items));
   notify();
   return {ok:true,items};
 }catch{
   return {ok:false,items,message:"Não foi possível guardar os favoritos neste navegador."};
 }
};
const has=id=>read().includes(String(id||"").toLowerCase());
const toggle=id=>{
 const value=String(id||"").toLowerCase();
 if(!ID.test(value))return {ok:false,message:"Este produto não pode ser salvo."};
 const items=read(),index=items.indexOf(value),added=index===-1;
 if(added){
   if(items.length>=MAX)return {ok:false,message:"Você atingiu o limite de favoritos."};
   items.unshift(value);
 }else items.splice(index,1);
 const result=save(items);
 return {...result,added:result.ok?added:false};
};
global.SaluzFavorites=Object.freeze({read,save,has,toggle,sanitize,count:()=>read().length});
})(window);
