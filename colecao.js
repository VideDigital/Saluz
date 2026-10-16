/* Vitrine por categoria: somente produtos reais e publicados na SALUZ. */
(()=>{
const root=document.getElementById("category-products");
if(!root)return;
const chosen=document.body.dataset.category||"";
const status=document.getElementById("category-status");
const empty=document.getElementById("category-empty");
const el=(name,cls,value)=>{const e=document.createElement(name);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const brl=n=>(Number(n||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const syncHearts=()=>{
  root.querySelectorAll("[data-favorite-product]").forEach(button=>{
    const saved=window.SaluzFavorites.has(button.dataset.favoriteProduct);
    button.textContent=saved?"♥":"♡";
    button.classList.toggle("is-favorite",saved);
    button.setAttribute("aria-pressed",String(saved));
    button.setAttribute("aria-label",(saved?"Remover dos favoritos: ":"Salvar nos favoritos: ")+button.dataset.productName);
  });
};
window.addEventListener("saluz:favorites",syncHearts);
window.addEventListener("storage",event=>{
  if(event.key==="saluz-favorites-v1"||event.key===null)syncHearts();
});

const more=el("button","category-load-more","Carregar mais produtos ↓");
more.type="button";more.hidden=true;
more.style.cssText="display:block;margin:25px auto;padding:13px 22px;cursor:pointer";
root.insertAdjacentElement("afterend",more);
let page=0,hasMore=true,loading=false,total=0;
async function loadNext(){
 if(loading||!hasMore)return;
 loading=true;more.disabled=true;
 status.textContent="Carregando produtos da coleção...";
 try{
  const response=await fetch("/api/products?category="+encodeURIComponent(chosen)+"&page="+(page+1)+"&limit=48",{cache:"no-store"});
  if(!response.ok)throw new Error("Serviço temporariamente indisponível");
  const data=await response.json();
  const items=(Array.isArray(data.products)?data.products:[]).filter(p=>p.category===chosen);
  page+=1;hasMore=data.has_more===true;
  if(page===1)root.replaceChildren();
  empty.hidden=total+items.length>0;
 for(const p of items){
  const card=el("article","category-product"),link=el("a","category-product-photo"),copy=el("div","category-product-copy");
  link.href="./produto.html?id="+encodeURIComponent(p.id);
  link.setAttribute("aria-label","Ver "+p.name);
  const variant=(Array.isArray(p.variants)?p.variants:[]).find(v=>Number(v.stock)>0)||p.variants?.[0];
  const image=variant?.image_url||p.image_url;
  if(image){const img=el("img");img.src=image;img.alt=p.name;img.loading="lazy";img.decoding="async";link.append(img);}else link.append(el("span","category-product-placeholder","✦"));
  const title=el("h2","",p.name);copy.append(el("span","category-product-category",p.category),title);
   if(Number(p.original_price_cents)>p.price_cents)
     copy.append(el("span","saluz-price-old",brl(p.original_price_cents)),el("span","saluz-sale-label","Oferta"));
   copy.append(el("strong","category-product-price",brl(p.price_cents)));
  const buy=el("a","category-product-link","Ver produto e opções ↗");buy.href=link.href;copy.append(buy);
  const heart=el("button","product-heart");
  heart.type="button";heart.dataset.favoriteProduct=p.id;heart.dataset.productName=p.name;
  heart.onclick=()=>{
    const result=window.SaluzFavorites.toggle(p.id);
    if(!result.ok){status.textContent=result.message;return;}
    syncHearts();
  };
  card.append(link,copy,heart);root.append(card);
 }
  total+=items.length;
  status.textContent=total?total+" produto(s) carregado(s) nesta coleção":"Coleção em preparação";
  syncHearts();
 }catch{
  status.textContent="Não foi possível carregar os produtos. Tente novamente.";
  if(page===0)empty.hidden=false;
 }finally{
  loading=false;more.disabled=false;
  more.hidden=!hasMore;
  more.style.display=hasMore?"block":"none";
 }
}
more.onclick=loadNext;
loadNext();
})();