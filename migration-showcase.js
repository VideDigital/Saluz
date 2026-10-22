/* SALUZ preview D1: exclusivo de homologacao e sem checkout. */
(() => {
"use strict";
const STAGE="homologacao.saluz-loja.pages.dev";
const root=document.getElementById("showcase"),invalid=document.getElementById("invalid-environment");
if(location.hostname!==STAGE){invalid.hidden=false;return;}
root.hidden=false;
const $=id=>document.getElementById(id);
const list=$("products"),message=$("feedback"),category=$("category"),search=$("search");
const money=cents=>(Number(cents)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let products=[],page=1,hasMore=false,loading=false,requestVersion=0;
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
function productImage(p){
 const wrap=node("div","card-image"),placeholder=node("div","no-photo","S ✦");
 wrap.append(placeholder);
 if(!p.image_url)return wrap;
 try{
   const url=new URL(String(p.image_url));
   if(url.protocol!=="https:")return wrap;
   const img=document.createElement("img");
   img.alt="Imagem de "+String(p.name||"produto");
   img.loading="lazy";img.decoding="async";
   img.onerror=()=>{img.remove();placeholder.hidden=false};
   placeholder.hidden=true;img.src=url.href;wrap.append(img);
 }catch{}
 return wrap;
}
function card(p){
 const article=node("article","product-card"),photo=productImage(p),info=node("div","card-info");
 info.append(node("span","category-name",p.category||"SALUZ"),node("h2","",p.name));
 if(p.original_price_cents!=null&&Number(p.original_price_cents)>Number(p.price_cents)){
   const prices=node("div","prices");
   prices.append(node("s","old-price",money(p.original_price_cents)),node("span","sale-label","Oferta"));
   info.append(prices);
 }
 info.append(node("strong","price",money(p.price_cents)));
 const variant=Array.isArray(p.variants)?p.variants:[];
 const available=variant.reduce((n,v)=>n+Math.max(0,Number(v.stock)||0),0);
 info.append(node("small","stock",available>0?"Em estoque (ambiente de testes)":"Sem estoque no teste"));
 const button=node("button","details-button","Ver detalhes →");button.type="button";button.addEventListener("click",()=>openDetails(p));
 info.append(button);article.append(photo,info);return article;
}
function filtered(){
 const q=search.value.trim().toLocaleLowerCase("pt-BR");
 return products.filter(p=>!q||[p.name,p.category,p.description].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(q)));
}
function render(){
 list.replaceChildren();
 const rows=filtered();
 if(!rows.length)list.append(node("div","empty","Nenhum produto de teste encontrado. Cadastre um item no laboratório D1/KV."));
 else list.append(...rows.map(card));
 $("count").textContent=rows.length+" produto(s) nesta página";
 $("page-info").textContent="Página "+page;
 $("prev").disabled=loading||page<=1;
 $("next").disabled=loading||!hasMore;
}
async function load(){
 if(loading)return;
 loading=true;
 const mine=++requestVersion;
 $("prev").disabled=true;$("next").disabled=true;
 message.textContent="Consultando o catálogo experimental...";
 const url=new URL("/api/migration-catalog",location.origin);
 url.searchParams.set("page",String(page));url.searchParams.set("limit","24");
 if(category.value)url.searchParams.set("category",category.value);
 try{
   const response=await fetch(url,{headers:{accept:"application/json"},cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Falha ao consultar o D1");
   if(data.source!=="D1 staging"||data.environment!=="staging"||data.payments_enabled!==false||data.demo_only!==true)
     throw Error("Resposta incompatível com a homologação. Nenhum produto será exibido.");
   if(mine!==requestVersion)return;
   products=Array.isArray(data.products)?data.products:[];hasMore=data.has_more===true;
   message.textContent="Dados de teste do banco D1. Nenhuma compra pode ser realizada nesta prévia.";
 }catch(e){
   products=[];hasMore=false;message.textContent="Não foi possível carregar a vitrine: "+e.message;
 }finally{loading=false;render()}
}
function openDetails(p){
 const area=$("details-body");area.replaceChildren();
 const heading=node("h2","",p.name),price=node("strong","detail-price",money(p.price_cents));
 const desc=node("p","description",p.description||"Produto de teste");
 const variants=node("ul","variant-list");
 for(const v of Array.isArray(p.variants)?p.variants:[]){
  variants.append(node("li","",v.color+" · "+v.size+" · Estoque: "+Number(v.stock||0)));
 }
 area.append(productImage(p),heading,price,desc,node("h3","","Variações"),variants,
   node("p","readonly","Pré-visualização apenas. Comprar e pagar estão desativados."));
 $("details").showModal();
}
$("details-close").addEventListener("click",()=>$("details").close());
$("details").addEventListener("click",e=>{if(e.target===$("details"))$("details").close()});
category.addEventListener("change",()=>{page=1;load()});
search.addEventListener("input",render);
$("prev").addEventListener("click",()=>{if(page>1){page--;load()}});
$("next").addEventListener("click",()=>{if(hasMore){page++;load()}});
async function categories(){
 const names=["Nécessaires","Porta-joias","Organizadores de maquiagem","Organizadores de bolsa",
   "Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"];
 for(const name of names){const opt=document.createElement("option");opt.value=name;opt.textContent=name;category.append(opt);}
}
categories();load();
})();