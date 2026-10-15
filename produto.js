/* SALUZ — Página individual do produto, sem processamento de pagamentos. */
(()=>{
"use strict";
const byId=id=>document.getElementById(id);
const format=cents=>(Number(cents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const slug={ "Nécessaires":"necessaires","Porta-joias":"porta-joias","Organizadores de maquiagem":"organizadores-maquiagem","Organizadores de bolsa":"organizadores-bolsa","Acessórios de viagem":"acessorios-viagem","Autocuidado":"autocuidado","Acessórios femininos":"acessorios-femininos","Kits e presentes":"kits-presentes"};
let product=null,quantity=1;
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
const variations=()=>Array.isArray(product?.variants)?product.variants:[];
const selected=()=>variations().find(v=>(v.color||"Única")===byId("sku-color").value&&(v.size||"Único")===byId("sku-size").value);
const max=v=>Math.min(10,Math.max(0,Number(v?.stock)||0));
const validImage=url=>typeof url==="string"&&/^https:\/\//i.test(url);
const note=(text)=>byId("product-feedback").textContent=text;
function updateBagCount(){
 try{
  const b=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");
  const count=Array.isArray(b)?b.reduce((s,x)=>s+Math.max(0,Number(x.quantity)||0),0):0;
  document.querySelectorAll("[data-bag-count]").forEach(e=>e.textContent=count);
 }catch{}
}
function sizesForColor(){
 const select=byId("sku-size"),previous=select.value;select.replaceChildren();
 const options=[...new Set(variations().filter(v=>(v.color||"Única")===byId("sku-color").value).map(v=>v.size||"Único"))];
 for(const value of options){const op=node("option","",value);op.value=value;select.append(op);}
 if(options.includes(previous))select.value=previous;
}
function image(url,alt){
 const root=byId("product-photo");root.replaceChildren();
 if(validImage(url)){
  const img=node("img");img.src=url;img.alt=alt;
  img.onerror=()=>{root.replaceChildren(node("span","product-placeholder","✦"));};root.append(img);
 }else root.append(node("span","product-placeholder","✦"));
}
function gallery(){
 const v=selected(),main=v?.image_url||product.image_url;
 image(main,product.name+" — "+(v?.color||""));
 const root=byId("product-gallery-thumbs");root.replaceChildren();
 const photos=[];const seen=new Set();
 for(const url of [product.image_url,...variations().map(v=>v.image_url)]){
  if(validImage(url)&&!seen.has(url)){seen.add(url);photos.push(url);}
 }
 root.hidden=photos.length<2;
 for(const url of photos){
  const b=node("button",url===main?"active":"");
  b.type="button";b.setAttribute("aria-label","Ver outra foto de "+product.name);
  const img=node("img");img.src=url;img.alt="";img.loading="lazy";b.append(img);
  b.onclick=()=>{
   image(url,product.name);
   [...root.children].forEach(x=>x.classList.toggle("active",x===b));
  };
  root.append(b);
 }
}
function updateSelection(){
 const v=selected();const stock=max(v);
 quantity=Math.min(Math.max(1,quantity),stock||1);
 byId("sku-quantity").textContent=quantity;
 byId("sku-minus").disabled=quantity<=1;
 byId("sku-plus").disabled=quantity>=stock;
 byId("sku-add").disabled=!v||stock===0;
 byId("sku-availability").textContent=stock===0?"Esta variação está indisponível.":stock<=3?"Últimas unidades disponíveis nesta combinação.":"Disponível para adicionar à sacola.";
 gallery();
 note("");
}
function render(p){
 product=p;
 document.title=p.name+" | SALUZ";
 byId("product-loading").hidden=true;
 byId("product-panel").hidden=false;
 byId("product-title").textContent=p.name;
 byId("product-category").textContent=p.category;
 byId("product-price").textContent=format(p.price_cents);
 byId("product-description").textContent=p.description||"Para informações adicionais sobre este produto, fale com a equipe SALUZ.";
 byId("breadcrumb-product").textContent=p.name;
 const categoryLink=byId("breadcrumb-category");
 const cat=slug[p.category];
 if(cat){categoryLink.href="./colecao-"+cat+".html";categoryLink.textContent=p.category;}
 else{categoryLink.href="./colecoes.html";categoryLink.textContent="Coleções";}
 const colors=[...new Set(variations().map(v=>v.color||"Única"))];
 const color=byId("sku-color");color.replaceChildren();
 for(const value of colors){const op=node("option","",value);op.value=value;color.append(op);}
 const first=variations().find(v=>max(v)>0)||variations()[0];
 if(first)color.value=first.color||"Única";
 sizesForColor();
 if(first)byId("sku-size").value=first.size||"Único";
 byId("sku-controls").hidden=!variations().length;
 byId("sku-empty").hidden=!!variations().length;
 updateSelection();
}
async function load(){
 const id=new URLSearchParams(location.search).get("id");
 if(!id||!uuid.test(id)){byId("product-loading").textContent="Produto não encontrado.";return;}
 try{
  const res=await fetch("/api/products",{cache:"no-store"});
  if(!res.ok)throw new Error("Catálogo indisponível na prévia.");
  const payload=await res.json();
  const match=(Array.isArray(payload.products)?payload.products:[]).find(p=>p.id===id);
  if(!match){byId("product-loading").textContent="Este produto não está disponível no catálogo.";return;}
  render(match);
 }catch{
  byId("product-loading").textContent="O catálogo será exibido após a conexão da loja. Explore as coleções enquanto isso.";
 }
}
byId("sku-color").onchange=()=>{sizesForColor();quantity=1;updateSelection();};
byId("sku-size").onchange=()=>{quantity=1;updateSelection();};
byId("sku-minus").onclick=()=>{quantity=Math.max(1,quantity-1);updateSelection();};
byId("sku-plus").onclick=()=>{quantity=Math.min(max(selected()),quantity+1);updateSelection();};
byId("sku-add").onclick=()=>{
 if(!product)return;
 const v=selected();if(!v||max(v)===0){note("Escolha uma combinação disponível.");return;}
 let bag=[];
 try{const parsed=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");if(Array.isArray(parsed))bag=parsed;}catch{}
 const key=product.id+"|"+(v.color||"")+"|"+(v.size||"");
 const existing=bag.find(i=>i.key===key);
 const proposed=(existing?Number(existing.quantity)||0:0)+quantity;
 if(proposed>max(v)){note("Esta quantidade ultrapassa o estoque disponível.");return;}
 if(existing)existing.quantity=proposed;else bag.push({key,id:product.id,color:v.color||"",size:v.size||"",quantity});
 localStorage.setItem("saluz-bag-v1",JSON.stringify(bag));
 updateBagCount();note("Produto adicionado à sacola. Pedidos ainda estão em preparação.");
 byId("sku-open-bag").hidden=false;
};
byId("product-share").onclick=async()=>{
 const url=location.href;
 try{
  if(navigator.share)await navigator.share({title:product?.name||"SALUZ",url});
  else if(navigator.clipboard){await navigator.clipboard.writeText(url);note("Link copiado.");}
  else note("Copie o endereço desta página para compartilhar.");
 }catch(e){if(e.name!=="AbortError")note("Não foi possível compartilhar agora.");}
};
load();
})();