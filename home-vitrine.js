/* Home SALUZ: somente produtos ativos, preços e fotos cadastrados no banco. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const money=value=>(Number(value||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
const selectedPhoto=p=>(p.variants||[]).find(v=>Number(v.stock)>0&&v.image_url)?.image_url||p.image_url||(p.variants||[]).find(v=>v.image_url)?.image_url;
function card(p){
 const article=node("article","home-product");
 const picture=node("a","home-product-image");
 picture.href="./produto.html?id="+encodeURIComponent(p.id);
 picture.setAttribute("aria-label","Ver produto "+p.name);
 const src=selectedPhoto(p);
 if(src){
  const img=node("img");img.src=src;img.alt=p.name;img.loading="lazy";img.decoding="async";
  img.onerror=()=>{picture.replaceChildren(node("span","home-product-placeholder","✦"));};
  picture.append(img);
 }else picture.append(node("span","home-product-placeholder","✦"));
 const body=node("div","home-product-copy");
 body.append(node("span","home-product-category",p.category||"SALUZ"),
   node("h3","",p.name));
  if(Number(p.original_price_cents)>p.price_cents){
    body.append(node("span","saluz-price-old",money(p.original_price_cents)),node("span","saluz-sale-label","Oferta"));
  }
  body.append(node("strong","home-product-price",money(p.price_cents)));
 const view=node("a","home-product-link","Ver detalhes e opções ↗");view.href=picture.href;body.append(view);
 const heart=node("button","product-heart");heart.type="button";
 const sync=()=>{
  const saved=window.SaluzFavorites?.has(p.id)||false;
  heart.textContent=saved?"♥":"♡";
  heart.setAttribute("aria-label",(saved?"Remover dos favoritos: ":"Salvar nos favoritos: ")+p.name);
  heart.setAttribute("aria-pressed",String(saved));heart.classList.toggle("is-favorite",saved);
 };
 heart.onclick=()=>{
  const result=window.SaluzFavorites?.toggle(p.id);
  if(!result?.ok){$("featured-status").textContent=result?.message||"Não foi possível salvar este favorito.";return;}
  sync();
 };
 sync();article.append(picture,body,heart);return article;
}
function render(items,key){
 const root=$(key+"-products"),status=$(key+"-status"),empty=$(key+"-empty");
 const valid=Array.isArray(items)?items.filter(p=>p?.id&&p?.name&&Number.isInteger(p?.price_cents)):[];
 root.replaceChildren(...valid.slice(0,8).map(card));
 empty.hidden=valid.length>0;
 status.textContent=valid.length?valid.length+" produto(s) para descobrir":"";
 status.hidden=!!valid.length;
}
async function load(){
 try{
  const response=await fetch((window.saluzD1PreviewUrl?.("/api/products/home")||"/api/products/home"),{cache:"no-store"});
  if(!response.ok)throw new Error("Catálogo indisponível");
  const payload=await response.json();
  if(!payload.configured)throw new Error("Loja em implantação");
  render(payload.featured,"featured");
  render(payload.newest,"new");
 }catch{
  render([],"featured");render([],"new");
  $("featured-status").textContent="Seleção em preparação.";
  $("new-status").textContent="Novidades em preparação.";
 }
}
load();
})();
