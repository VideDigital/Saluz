/* SALUZ — visualização de favoritos, somente produtos publicados pela loja. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const favorites=window.SaluzFavorites;
const root=$("favorites-grid"),empty=$("favorites-empty"),unavailable=$("favorites-unavailable"),status=$("favorites-status");
const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const money=cents=>(Number(cents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let list=null,configured=false;
function render(){
 const ids=favorites.read();
 root.replaceChildren();
 empty.hidden=true;unavailable.hidden=true;
 if(!ids.length){empty.hidden=false;status.textContent="Nenhum produto salvo";return;}
 if(!configured||!Array.isArray(list)){
   unavailable.hidden=false;status.textContent=ids.length+" favorito(s) salvo(s)";
   return;
 }
 const byId=new Map(list.map(p=>[p.id,p]));
 const missing=ids.filter(id=>!byId.has(id));
 const visible=ids.map(id=>byId.get(id)).filter(Boolean);
 status.textContent=visible.length+" produto(s) disponíveis"+(missing.length?" · "+missing.length+" indisponível(is) no momento":"");
 for(const product of visible){
   const article=node("article","favorite-card");
   const href="./produto.html?id="+encodeURIComponent(product.id);
   const picture=node("a","favorite-card-photo");picture.href=href;picture.setAttribute("aria-label","Abrir "+product.name);
   const variant=(product.variants||[]).find(v=>Number(v.stock)>0&&v.image_url);
   const photo=variant?.image_url||product.image_url||(product.variants||[]).find(v=>v.image_url)?.image_url;
   if(photo){
     const img=node("img");img.src=photo;img.alt=product.name;img.loading="lazy";img.decoding="async";
     img.onerror=()=>{picture.replaceChildren(node("span","","✦"));};picture.append(img);
   }else picture.append(node("span","","✦"));
   const remove=node("button","favorite-card-remove","♥");
   remove.type="button";remove.setAttribute("aria-label","Remover "+product.name+" dos favoritos");
   remove.onclick=()=>{
     const result=favorites.toggle(product.id);
     if(!result.ok){status.textContent=result.message;return;}
     render();
   };
   const body=node("div","favorite-card-body");
   body.append(node("span","favorite-card-category",product.category),
       node("h3","",product.name),
       node("strong","favorite-card-price",money(product.price_cents)));
   const view=node("a","favorite-card-view","Ver produto e opções ↗");view.href=href;
   body.append(view);article.append(picture,body,remove);root.append(article);
 }
 if(missing.length){
   const tip=node("p","favorites-missing","Alguns produtos salvos não estão mais disponíveis na loja. Eles continuam guardados na sua lista.");
   root.append(tip);
 }
 if(!visible.length){
   unavailable.hidden=false;
   status.textContent="Seus produtos favoritos estão temporariamente indisponíveis.";
 }
}
async function load(){
 const ids=favorites.read();
 if(!ids.length){render();return;}
 status.textContent="Carregando favoritos...";
 try{
   const response=await fetch("/api/products/favorites?ids="+encodeURIComponent(ids.join(",")),{cache:"no-store"});
   if(!response.ok)throw new Error("Catálogo indisponível");
   const data=await response.json();
   list=Array.isArray(data.products)?data.products:[];
   configured=data.configured===true;
 }catch{configured=false;list=null;}
 render();
}
window.addEventListener("storage",event=>{
 if(event.key==="saluz-favorites-v1"||event.key===null)render();
});
window.addEventListener("saluz:favorites",render);
load();
})();