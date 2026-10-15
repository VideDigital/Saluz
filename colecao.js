/* Vitrine por categoria: somente produtos reais e publicados na SALUZ. */
(()=>{
const root=document.getElementById("category-products");
if(!root)return;
const chosen=document.body.dataset.category||"";
const status=document.getElementById("category-status");
const empty=document.getElementById("category-empty");
const el=(name,cls,value)=>{const e=document.createElement(name);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const brl=n=>(Number(n||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
fetch("/api/products?category="+encodeURIComponent(chosen),{cache:"no-store"}).then(async response=>{
 if(!response.ok)throw new Error("Serviço temporariamente indisponível");
 return response.json();
}).then(data=>{
 const items=(Array.isArray(data.products)?data.products:[]).filter(p=>p.category===chosen);
 status.textContent=items.length?items.length+" produto(s) nesta coleção":"Coleção em preparação";
 root.replaceChildren();
 empty.hidden=items.length>0;
 for(const p of items){
  const card=el("article","category-product"),link=el("a","category-product-photo"),copy=el("div","category-product-copy");
  link.href="./produto.html?id="+encodeURIComponent(p.id);
  link.setAttribute("aria-label","Ver "+p.name);
  const variant=(Array.isArray(p.variants)?p.variants:[]).find(v=>Number(v.stock)>0)||p.variants?.[0];
  const image=variant?.image_url||p.image_url;
  if(image){const img=el("img");img.src=image;img.alt=p.name;img.loading="lazy";link.append(img);}else link.append(el("span","category-product-placeholder","✦"));
  const title=el("h2","",p.name);copy.append(el("span","category-product-category",p.category),title,el("strong","category-product-price",brl(p.price_cents)));
  const buy=el("a","category-product-link","Ver produto e opções ↗");buy.href=link.href;copy.append(buy);
  card.append(link,copy);root.append(card);
 }
}).catch(()=>{
 status.textContent="Catálogo temporariamente indisponível.";
 empty.hidden=false;
 const note=empty.querySelector(".collection-empty-detail");
 if(note)note.textContent="Ainda não conseguimos carregar os produtos. Tente novamente mais tarde.";
});
})();