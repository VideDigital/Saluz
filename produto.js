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
function syncProductFavorite(){
  const button=byId("product-favorite");
  if(!product||!uuid.test(String(product.id||""))){button.hidden=true;return;}
  button.hidden=false;
  const saved=window.SaluzFavorites.has(product.id);
  button.classList.toggle("is-favorite",saved);
  button.setAttribute("aria-pressed",String(saved));
  button.children[0].textContent=saved?"♥":"♡";
  button.children[1].textContent=saved?"Remover dos favoritos":"Salvar nos favoritos";
}
byId("product-favorite").onclick=()=>{
  if(!product)return;
  const result=window.SaluzFavorites.toggle(product.id);
  if(!result.ok){note(result.message);return;}
  syncProductFavorite();
  note(result.added?"Salvo na sua lista de favoritos.":"Removido da sua lista de favoritos.");
};
window.addEventListener("saluz:favorites",syncProductFavorite);
window.addEventListener("storage",event=>{
  if(event.key==="saluz-favorites-v1"||event.key===null)syncProductFavorite();
});

function updateBagCount(){
 const count=window.SaluzBag.count(window.SaluzBag.read());
 document.querySelectorAll("[data-bag-count]").forEach(e=>e.textContent=count);
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
 const candidates=[
   {url:product.image_url,variant:null},
   ...variations().map(v=>({url:v.image_url,variant:v}))
 ];
 for(const item of candidates){
   if(validImage(item.url)&&!seen.has(item.url)){
     seen.add(item.url);photos.push(item);
   }
 }
 root.hidden=photos.length<2;
 for(const photo of photos){
   const b=node("button",photo.url===main?"active":"");
   b.type="button";
   b.setAttribute("aria-label",photo.variant?
      "Selecionar foto da cor "+(photo.variant.color||"única")+", tamanho "+(photo.variant.size||"único"):
      "Ver imagem principal do produto");
   const img=node("img");img.src=photo.url;img.alt="";img.loading="lazy";b.append(img);
   b.onclick=()=>{
     if(photo.variant){
       byId("sku-color").value=photo.variant.color||"Única";
       sizesForColor();
       byId("sku-size").value=photo.variant.size||"Único";
       quantity=1;
       updateSelection();
     }else{
       image(photo.url,product.name);
       [...root.children].forEach(x=>x.classList.toggle("active",x===b));
     }
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
 syncProductFavorite();
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
function showDesignPreview(){
  // Protótipo visual sem catálogo, preço, fotos ou estoque inventados.
  render({
    id:"preview",
    name:"Modelo de página do produto",
    category:"Coleções",
    description:"Aqui aparecerão a descrição real, as imagens, as cores e os tamanhos cadastrados pela SALUZ.",
    price_cents:0,
    image_url:"",
    variants:[{color:"A definir",size:"A definir",stock:0,image_url:""}]
  });
  byId("product-category").textContent="SALUZ / PRÉVIA VISUAL";
  byId("product-price").textContent="Preço a definir";
  byId("sku-availability").textContent="As opções aparecerão após o cadastro dos produtos.";
  byId("sku-add").disabled=true;
  byId("sku-minus").disabled=true;
  byId("sku-plus").disabled=true;
  byId("sku-color").disabled=true;
  byId("sku-size").disabled=true;
  byId("product-share").hidden=true;
  byId("product-feedback").textContent="Esta é somente uma prévia do layout. Nenhum produto real está cadastrado nesta página.";
}
async function loadRelated(current){
 const wrap=byId("related-section"),grid=byId("related-grid");
 if(!wrap||!grid||!current?.category)return;
 try{
  const res=await fetch("/api/products?category="+encodeURIComponent(current.category),{cache:"no-store"});
  if(!res.ok)return;
  const response=await res.json();
  const items=(Array.isArray(response.products)?response.products:[])
    .filter(p=>p.id!==current.id).slice(0,4);
  if(!items.length)return;
  grid.replaceChildren();
  const categorySlug=slug[current.category];
  byId("related-category").href=categorySlug?"./colecao-"+categorySlug+".html":"./colecoes.html";
  for(const p of items){
   const article=node("article","product-related-card");
   const link=node("a","product-related-image");
   link.href="./produto.html?id="+encodeURIComponent(p.id);
   link.setAttribute("aria-label","Abrir "+p.name);
   const photo=(p.variants||[]).find(v=>Number(v.stock)>0&&validImage(v.image_url))?.image_url||
     p.image_url||(p.variants||[]).find(v=>validImage(v.image_url))?.image_url;
   if(validImage(photo)){
     const img=node("img");img.src=photo;img.alt=p.name;img.loading="lazy";link.append(img);
   }else link.append(node("span","product-placeholder","✦"));
   const copy=node("div","product-related-card-copy");
   copy.append(node("span","product-related-category",p.category),
       node("h3","",p.name),
       node("strong","product-related-price",format(p.price_cents)));
   const action=node("a","product-related-action","Ver opções ↗");action.href=link.href;
   copy.append(action);article.append(link,copy);grid.append(article);
  }
  wrap.hidden=false;
 }catch{
  // Recomendações opcionais: nunca bloquear a página principal.
 }
}
async function load(){
 const params=new URLSearchParams(location.search);
 if(params.get("preview")==="1"){showDesignPreview();return;}
 const id=params.get("id");
 if(!id||!uuid.test(id)){byId("product-loading").textContent="Produto não encontrado.";return;}
 try{
  const res=await fetch("/api/products/"+encodeURIComponent(id),{cache:"no-store"});
  if(res.status===404){
    byId("product-loading").textContent="Este produto não está disponível no catálogo.";
    return;
  }
  if(!res.ok)throw new Error("Catálogo indisponível na prévia.");
  const payload=await res.json();
  if(!payload.product){
    byId("product-loading").textContent="Este produto não está disponível no catálogo.";
    return;
  }
  render(payload.product);
  await loadRelated(payload.product);
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
 const result=window.SaluzBag.add(product,v,quantity);
 if(!result.ok){note(result.message);return;}
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