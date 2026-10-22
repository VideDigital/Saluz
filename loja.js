/* SALUZ Loja · no payment provider connected · no customer data stored in browser */
const $ = id => document.getElementById(id);
const money = cents => (Number(cents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const knownCategories=["Nécessaires","Porta-joias","Organizadores de maquiagem","Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"];
const urlParams=new URLSearchParams(location.search);
const requestedCategory=urlParams.get("categoria")||"all";
let products=[],bag=[],activeCategory=knownCategories.includes(requestedCategory)?requestedCategory:"all",available=false,checkoutEnabled=false,checkoutPreview=false,detailProduct=null,detailCount=1;
let catalogPage=0,catalogHasMore=false,catalogLoading=false,bagLookup=[];
bag=window.SaluzBag.read();
const emit=(type,label="")=>{
  if(localStorage.getItem("saluz-analytics")!=="accepted")return;
  let id=sessionStorage.getItem("saluz-session");
  if(!id){ id=crypto.randomUUID();sessionStorage.setItem("saluz-session",id); }
  fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({event_type:type,event_label:label,page_path:location.pathname,session_id:id}),
    keepalive:true}).catch(()=>{});
};
function analyticsConsent(){
  if(localStorage.getItem("saluz-analytics"))return;
  const notice=document.createElement("aside");
  notice.className="analytics-banner";
  notice.textContent="Podemos registrar visitas e cliques de forma agregada para melhorar a loja? Não usamos esses dados para identificar compradores.";
  const row=document.createElement("div");row.className="analytics-actions";
  for(const [label,value] of [["Não aceitar","declined"],["Aceitar métricas","accepted"]]){
    const button=document.createElement("button");button.type="button";button.textContent=label;
    button.className="analytics-choice"+(value==="accepted"?" primary":"");
    button.onclick=()=>{localStorage.setItem("saluz-analytics",value);notice.remove();if(value==="accepted")emit("page_view");};
    row.append(button);
  }
  notice.append(row);document.body.append(notice);
}
function saveBag(){
 const saved=window.SaluzBag.save(bag);
 if(!saved.ok)$("cart-feedback").textContent=saved.message;
 bag=saved.items;
 const total=window.SaluzBag.count(bag);
 $("cart-count").textContent=total;
 $("mobile-cart-count").textContent=total;
 document.querySelectorAll("[data-bag-count]").forEach(e=>e.textContent=total);
 return saved.ok;
}
function variationImage(p,v){return v?.image_url||p?.image_url||"";}
function maxQuantity(v){return Math.min(10,Math.max(0,Number(v?.stock)||0));}
function addToBag(p,v,quantity=1){
 const result=window.SaluzBag.add(p,v,quantity);
 if(!result.ok)return result;
 bag=result.items;saveBag();renderBag();emit("add_to_cart",p.name);
 return {ok:true};
}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function variantsFor(p){return Array.isArray(p.variants)?p.variants.filter(v=>Number(v.stock)>0):[];}
function renderFilters(){
  const root=$("filters");root.replaceChildren();
  const categories=["all",...new Set([...knownCategories,...products.map(p=>p.category).filter(Boolean)])];
  categories.forEach(cat=>{
    const button=node("button","filter"+(cat===activeCategory?" active":""),cat==="all"?"Todos":cat);
    button.type="button";button.onclick=()=>{activeCategory=cat;renderFilters();renderProducts();};root.append(button);
  });
}
function syncFavoriteButtons(){
  document.querySelectorAll("[data-favorite-product]").forEach(button=>{
    const selected=window.SaluzFavorites.has(button.dataset.favoriteProduct);
    button.textContent=selected?"♥":"♡";
    button.classList.toggle("is-favorite",selected);
    button.setAttribute("aria-pressed",String(selected));
    button.setAttribute("aria-label",(selected?"Remover dos favoritos: ":"Salvar nos favoritos: ")+(button.dataset.productName||"produto"));
  });
}
window.addEventListener("saluz:favorites",syncFavoriteButtons);
window.addEventListener("storage",event=>{
  if(event.key==="saluz-favorites-v1"||event.key===null)syncFavoriteButtons();
});
function productCard(p){
  const card=node("article","product");
  const favorite=node("button","product-heart");
  favorite.type="button";
  favorite.dataset.favoriteProduct=p.id;
  favorite.dataset.productName=p.name;
  favorite.setAttribute("title","Salvar ou remover dos favoritos");
  favorite.onclick=()=>{
    const result=window.SaluzFavorites.toggle(p.id);
    if(!result.ok){$("catalog-status").textContent=result.message;return;}
    syncFavoriteButtons();
  };
  card.append(favorite);
  const image=node("div","product-image"+(p.image_url?"":" placeholder"));
  if(p.image_url){const img=node("img");img.src=p.image_url;img.loading="lazy";img.decoding="async";img.alt="Produto "+p.name;img.onerror=()=>{img.remove();image.classList.add("placeholder");};image.append(img);}
  const picture=node("a","product-image-button");picture.href="./produto.html?id="+encodeURIComponent(p.id);picture.setAttribute("aria-label","Abrir página do produto "+p.name);picture.append(image);card.append(picture);
  const b=node("div","product-body");b.append(node("span","product-category",p.category||"SALUZ"),node("h3","",p.name));
   if(Number(p.original_price_cents)>p.price_cents){
     b.append(node("span","saluz-price-old",money(p.original_price_cents)),node("span","saluz-sale-label","Oferta"));
   }
   b.append(node("span","price",money(p.price_cents)));
  const inStock=variantsFor(p);
  if(inStock.length){
    const opts=node("div","product-options");
    const color=node("select"),size=node("select");
    const availableColors=[...new Set(inStock.map(v=>v.color||"Única"))];
    const fillSizes=()=>{
      const old=size.value;size.replaceChildren();
      const values=[...new Set(inStock.filter(v=>(v.color||"Única")===color.value).map(v=>v.size||"Único"))];
      values.forEach(s=>{const op=node("option","",s);op.value=s;size.append(op);});
      if(values.includes(old))size.value=old;
    };
    availableColors.forEach(c=>{const op=node("option","",c);op.value=c;color.append(op);});
    const swapPhoto=()=>{
      const selected=inStock.find(v=>(v.color||"Única")===color.value&&(v.size||"Único")===size.value);
      const url=selected?.image_url||p.image_url||"";
      image.replaceChildren();image.classList.toggle("placeholder",!url);
      if(url){const img=node("img");img.src=url;img.loading="lazy";img.decoding="async";img.alt=p.name+" na cor "+color.value+", tamanho "+size.value;img.onerror=()=>{img.remove();image.classList.add("placeholder");};image.append(img);}
    };
    fillSizes();color.onchange=()=>{fillSizes();swapPhoto();};size.onchange=swapPhoto;swapPhoto();
    color.setAttribute("aria-label","Cor");size.setAttribute("aria-label","Tamanho");
    opts.append(color,size);b.append(opts);
    const add=node("button","","Adicionar à sacola");
    add.type="button";add.onclick=()=>{
      const v=inStock.find(x=>(x.color||"Única")===color.value&&(x.size||"Único")===size.value);
      const res=addToBag(p,v);
      if(res.ok)$("cart-dialog").showModal();
      else $("catalog-status").textContent=res.message;
    };
    b.append(add);
  }else{
    image.append(node("span","product-status","Indisponível"));
    const noStock=node("button","","Indisponível");noStock.disabled=true;b.append(noStock);
  }
  const more=node("a","view-details product-page-link","Ver página do produto ↗");
  more.href="./produto.html?id="+encodeURIComponent(p.id);
  more.setAttribute("aria-label","Abrir página de "+p.name);
  b.append(more);
  card.append(b);
  const selected=window.SaluzFavorites.has(p.id);
  favorite.textContent=selected?"♥":"♡";
  favorite.classList.toggle("is-favorite",selected);
  favorite.setAttribute("aria-pressed",String(selected));
  favorite.setAttribute("aria-label",(selected?"Remover dos favoritos: ":"Salvar nos favoritos: ")+p.name);
  return card;
}
const normalizedSearch=value=>String(value??"").normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("pt-BR").trim();
function renderProducts(){
  const query=normalizedSearch($("search").value);
  const chosen=products.filter(p=>(activeCategory==="all"||p.category===activeCategory)&&normalizedSearch(
    p.name+" "+p.category+" "+p.description+" "+(p.variants||[]).map(v=>v.color+" "+v.size).join(" ")
  ).includes(query));
  const sort=$("sort").value;
  if(sort==="price-asc")chosen.sort((a,b)=>a.price_cents-b.price_cents);
  if(sort==="price-desc")chosen.sort((a,b)=>b.price_cents-a.price_cents);
  if(sort==="az")chosen.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const list=$("products");
  list.replaceChildren(...chosen.map(productCard));
  if(!chosen.length){
    const empty=node("div","empty-collection");
    empty.append(node("span","empty-mark","✦"),node("p","eyebrow","SALUZ / CATÁLOGO"));
    empty.append(node("h3","",available?"Essa seleção ainda não tem produtos.":"A coleção está sendo preparada."));
    empty.append(node("p","empty-copy",available?"Experimente outra categoria ou busque um nome diferente.":"Em breve, você encontrará aqui os produtos e as novidades cadastradas pela SALUZ."));
    const browse=node("a","empty-link","Explorar outras categorias ↗");
    browse.href="#colecoes";empty.append(browse);list.append(empty);
  }
  const more=$("load-more");
  more.hidden=!catalogHasMore;
  more.disabled=catalogLoading;
  $("pagination-status").textContent=available?(catalogHasMore?"Há mais produtos para carregar.":"Produtos carregados nesta consulta."):"";
  $("catalog-status").textContent=available
    ? (chosen.length ? chosen.length+" produto(s) encontrado(s)" : "Ainda não há produtos disponíveis nesta categoria.")
    : (activeCategory!=="all" ? "A coleção "+activeCategory+" está em preparação. Os produtos serão exibidos quando o catálogo for ativado." : "O catálogo da SALUZ está em preparação. Os produtos reais aparecerão nesta vitrine.");
}
function findItem(i){
  const product=products.find(p=>p.id===i.id)||bagLookup.find(p=>p.id===i.id);
  const variation=product&&variantsFor(product).find(v=>(v.color||"")===i.color&&(v.size||"")===i.size);
  return product&&variation?{product,variation}:null;
}
function changeBagQuantity(index,delta){
 const line=bag[index],current=line?findItem(line):null;
 if(!current)return;
 const result=window.SaluzBag.change(index,delta,current.variation);
 if(!result.ok){$("cart-feedback").textContent=result.message;return;}
 bag=result.items;saveBag();renderBag();
}
function renderBag(){
 const root=$("cart-items");root.replaceChildren();let total=0,unavailable=false;
 bag.forEach((line,index)=>{
  const found=findItem(line),p=found?.product,v=found?.variation;
  const row=node("div","cart-line"),thumb=node("div","cart-thumbnail");
  const src=variationImage(p,v);
  if(src){const img=node("img");img.src=src;img.loading="lazy";img.alt=p.name;thumb.append(img);}
  else thumb.append(node("span","","✦"));
  const info=node("div","cart-line-info"),side=node("div","cart-side");
  info.append(node("strong","",p?.name||"Produto indisponível"));
  info.append(node("span","cart-variant",(line.color||"Cor única")+" · "+(line.size||"Tamanho único")));
  if(!found||line.quantity>maxQuantity(v)){
   unavailable=true;info.append(node("span","cart-variant","Variação indisponível no momento."));
  }else{
   const controls=node("div","qty-control"),minus=node("button","","−"),plus=node("button","","+");
   minus.type="button";minus.setAttribute("aria-label","Diminuir quantidade");minus.onclick=()=>changeBagQuantity(index,-1);
   plus.type="button";plus.setAttribute("aria-label","Aumentar quantidade");plus.disabled=line.quantity>=maxQuantity(v);plus.onclick=()=>changeBagQuantity(index,1);
   controls.append(minus,node("output","",line.quantity),plus);info.append(controls);
   total+=p.price_cents*line.quantity;
  }
  side.append(node("strong","",found?money(p.price_cents*line.quantity):"—"));
  const remove=node("button","remove","Remover");remove.type="button";remove.onclick=()=>{
    const result=window.SaluzBag.remove(index);
    if(!result.ok){$("cart-feedback").textContent=result.message;return;}
    bag=result.items;saveBag();renderBag();
  };
  side.append(remove);row.append(thumb,info,side);root.append(row);
 });
 if(!bag.length)root.append(node("p","notice","Sua sacola está vazia. Explore as coleções para começar."));
 $("cart-total").textContent=money(total);
 $("checkout-open").disabled=!(checkoutEnabled||checkoutPreview)||!bag.length||unavailable;
 $("checkout-open").textContent=checkoutPreview?"Ver checkout de teste":checkoutEnabled?"Continuar com meus dados":"Pedidos em preparação";
 $("cart-feedback").textContent=checkoutPreview?"Prévia para validar valores, frete e experiência, sem cobranças.":checkoutEnabled?(unavailable?"Revise a disponibilidade dos itens.":""):"Você pode montar sua sacola. Os pedidos ainda não estão liberados.";
}
async function fetchCatalogPage(page){
 const response=await fetch((window.saluzD1PreviewUrl?.("/api/products?page="+page+"&limit=48")||"/api/products?page="+page+"&limit=48"),{cache:"no-store"});
 if(!response.ok)throw new Error("Não foi possível carregar os produtos.");
 const payload=await response.json();
 if(!payload.configured)throw new Error("A loja ainda está sendo configurada.");
 const incoming=Array.isArray(payload.products)?payload.products:[];
 const ids=new Set(products.map(p=>p.id));
 products.push(...incoming.filter(p=>p.id&&!ids.has(p.id)));
 catalogPage=page;
 catalogHasMore=payload.has_more===true;
 available=true;
 renderFilters();renderProducts();renderBag();
 return incoming.length;
}
async function loadNextPage(){
 if(catalogLoading||!catalogHasMore)return;
 catalogLoading=true;
 $("load-more").disabled=true;
 $("pagination-status").textContent="Carregando produtos...";
 try{await fetchCatalogPage(catalogPage+1);}
 catch(e){$("pagination-status").textContent=e.message;catalogHasMore=true;}
 finally{catalogLoading=false;$("load-more").disabled=false;$("load-more").hidden=!catalogHasMore;}
}
$("load-more").onclick=loadNextPage;
async function loadBagReferences(){
 const ids=[...new Set(window.SaluzBag.read().map(line=>line.id))];
 if(!ids.length){bagLookup=[];return;}
 try{
  const response=await fetch((window.saluzD1PreviewUrl?.("/api/products/favorites?ids="+encodeURIComponent(ids.join(",")))||"/api/products/favorites?ids="+encodeURIComponent(ids.join(","))),{cache:"no-store"});
  if(!response.ok)throw new Error("Dados indisponíveis");
  const result=await response.json();
  bagLookup=Array.isArray(result.products)?result.products:[];
 }catch{bagLookup=[];}
}
async function loadStore(){
  checkoutEnabled=false;checkoutPreview=false;
  catalogLoading=true;
  try{
    const st=await fetch("/api/status",{cache:"no-store"});
    if(!st.ok)throw new Error("Loja indisponível");
    const settings=await st.json();
    checkoutEnabled=settings.checkout_enabled===true;
    checkoutPreview=settings.checkout_preview===true&&location.hostname==="homologacao.saluz-loja.pages.dev";
    products=[];catalogPage=0;
    await fetchCatalogPage(1);
    await loadBagReferences();
  }catch{available=false;checkoutEnabled=false;checkoutPreview=false;products=[];catalogHasMore=false;}
  finally{catalogLoading=false;}
  $("checkout-status").textContent=checkoutEnabled?"Solicitação sem pagamento online. A SALUZ entrará em contato para confirmar valores, frete e forma de pagamento.":"O cadastro de pedidos está desativado até concluirmos a infraestrutura, segurança e políticas da loja.";
  $("checkout-submit").disabled=!checkoutEnabled;
  renderFilters();renderProducts();renderBag();saveBag();
  const target=products.find(p=>p.id===urlParams.get("produto"));if(target)showProductDetails(target,false);
}
async function syncBagFromOtherTab(){
 bag=window.SaluzBag.read();
 await loadBagReferences();
 const count=window.SaluzBag.count(bag);
 $("cart-count").textContent=count;
 $("mobile-cart-count").textContent=count;
 renderBag();
}
window.addEventListener("storage",event=>{
 if(event.key==="saluz-bag-v1"||event.key===null)syncBagFromOtherTab();
});
window.addEventListener("pageshow",event=>{
 if(event.persisted)syncBagFromOtherTab();
});
function close(dialog){if(dialog.open)dialog.close();}
if($("year"))$("year").textContent=new Date().getFullYear();
$("search").value=urlParams.get("q")||"";
$("search").addEventListener("input",renderProducts);
if(urlParams.get("busca")==="1"){
  window.addEventListener("load",()=>{
    const field=$("search");
    field.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
    field.focus({preventScroll:true});
  },{once:true});
}
$("sort").addEventListener("change",renderProducts);
$("cart-open").onclick=()=>{renderBag();$("cart-dialog").showModal();};
$("cart-close").onclick=()=>close($("cart-dialog"));
if(location.hash==="#sacola"){history.replaceState(null,"",location.pathname+location.search);$("cart-open").click();}
$("mobile-cart-open").onclick=()=>$("cart-open").click();



/* Prévia somente homologação. O checkout pago permanece bloqueado no servidor. */
async function refreshPaymentPreview(){
 const feedback=$("payment-preview-feedback");
 const list=$("payment-preview-items");
 feedback.textContent="Conferindo preço e estoque...";
 list.replaceChildren(node("p","","Conferindo itens da sacola..."));
 $("payment-preview-subtotal").textContent="A consultar";
 $("payment-preview-total").textContent="A confirmar";
 const rawCep=$("payment-preview-cep").value.trim();
 try{
   const response=await fetch("/api/checkout/quote",{
     method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify({items:bag.map(({id,color,size,quantity})=>({id,color,size,quantity})),postal_code:rawCep})
   });
   const quote=await response.json();
   if(!response.ok)throw Error(quote.error||"Não foi possível conferir o carrinho.");
   if(quote.payment_enabled!==false||quote.total_cents!==null||quote.shipping_cents!==null)
     throw Error("Cotação inesperada: pagamentos bloqueados até revisão.");
   list.replaceChildren();
   for(const item of quote.items||[]){
     const line=node("div","saluz-pay-product"),info=node("div","saluz-pay-product-info");
     info.append(node("strong","",item.name),node("small","",item.color+" · "+item.size+" · "+item.quantity+" un."));
     line.append(info,node("strong","",money(item.line_total_cents)));list.append(line);
   }
   $("payment-preview-subtotal").textContent=money(quote.subtotal_cents);
   $("payment-preview-shipping").textContent="A calcular";
   feedback.textContent=rawCep?"Carrinho conferido. Falta configurar o frete para este CEP; não haverá cobrança.":"Carrinho conferido. Informe o CEP para preparar a cotação do frete.";
 }catch(e){
   list.replaceChildren(node("p","","Não foi possível validar a sacola."));
   feedback.textContent=e.message;
 }
}
function openPaymentPreview(){
 if(!checkoutPreview||location.hostname!=="homologacao.saluz-loja.pages.dev")return;
 $("payment-preview-dialog").showModal();
 refreshPaymentPreview();
}
$("payment-preview-close").addEventListener("click",()=>close($("payment-preview-dialog")));
$("payment-preview-recalculate").addEventListener("click",refreshPaymentPreview);
for(const option of document.querySelectorAll('input[name="payment-preview-method"]')){
 option.addEventListener("change",()=>{
   $("payment-preview-brick").textContent=option.value==="credit_card"?
    "O formulário seguro de cartão será exibido aqui pelo Mercado Pago após as etapas técnicas de homologação.":
    "Após a integração, o Pix apresentará QR Code e código copia e cola. Nenhuma cobrança está habilitada.";
 });
}

$("checkout-close").onclick=()=>close($("checkout-dialog"));
$("checkout-open").onclick=()=>{
  if(!$("checkout-open").disabled){
    close($("cart-dialog"));
    if(checkoutPreview){openPaymentPreview();}else{$("checkout-dialog").showModal();}
    emit("checkout_start");
  }
};
$("email-link").addEventListener("click",()=>emit("contact_click","email"));
$("checkout-form").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!checkoutEnabled)return;
  const b=Object.fromEntries(new FormData(e.currentTarget).entries());
  b.privacy_accepted=$("checkout-form").elements.privacy_accepted.checked;
  b.items=bag.map(i=>({id:i.id,quantity:i.quantity,color:i.color,size:i.size}));
  const button=$("checkout-submit");
  button.disabled=true;$("checkout-result").textContent="Enviando solicitação...";
  try{
    const res=await fetch("/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
    const out=await res.json();
    if(!res.ok)throw new Error(out.error||"Falha ao enviar");
    $("checkout-result").textContent="Solicitação "+out.order_id.slice(0,8).toUpperCase()+" recebida. Nenhum pagamento foi efetuado. Aguarde contato da SALUZ.";
    bag=[];saveBag();renderBag();e.currentTarget.reset();button.hidden=true;
    emit("checkout_submit");
  }catch(err){$("checkout-result").textContent=err.message;button.disabled=false;}
});
if(location.hash==="#sacola"){addEventListener("load",()=>{$("cart-dialog").showModal();});}
analyticsConsent();if(localStorage.getItem("saluz-analytics")==="accepted")emit("page_view");
loadStore();

function detailVariant(){
 if(!detailProduct)return null;
 return (detailProduct.variants||[]).find(v=>(v.color||"Única")===$("details-color").value&&(v.size||"Único")===$("details-size").value)||null;
}
function fillDetailSizes(){
 const old=$("details-size").value,select=$("details-size");select.replaceChildren();
 const sizes=[...new Set((detailProduct?.variants||[]).filter(v=>(v.color||"Única")===$("details-color").value).map(v=>v.size||"Único"))];
 for(const size of sizes){const op=node("option","",size);op.value=size;select.append(op);}
 if(sizes.includes(old))select.value=old;
}
function renderDetailSelection(){
 const p=detailProduct,v=detailVariant();if(!p)return;
 const max=maxQuantity(v);detailCount=Math.max(1,Math.min(detailCount,max||1));
 $("details-quantity").textContent=detailCount;
 $("details-minus").disabled=detailCount<=1;
 $("details-plus").disabled=detailCount>=max;
 $("details-stock").textContent=max===0?"Esta combinação está indisponível.":max<=3?"Últimas unidades disponíveis nesta variação.":"Disponível para adicionar à sacola.";
 $("details-add").disabled=max===0;
 const image=$("details-image");image.replaceChildren();
 const url=variationImage(p,v);
 if(url){const img=node("img");img.src=url;img.alt=p.name+(v?.color?" na cor "+v.color:"");img.onerror=()=>{img.remove();image.textContent="✦";};image.append(img);}
 else image.textContent="✦";
 const thumbnails=$("details-thumbs");thumbnails.replaceChildren();
 const photos=[];const seen=new Set();
 if(p.image_url){photos.push({url:p.image_url,variant:null});seen.add(p.image_url);}
 for(const item of p.variants||[])if(item.image_url&&!seen.has(item.image_url)){seen.add(item.image_url);photos.push({url:item.image_url,variant:item});}
 thumbnails.hidden=photos.length<2;
 for(const photo of photos){
  const btn=node("button",photo.url===url?"selected":"");
  btn.type="button";btn.setAttribute("aria-label","Ver foto de "+(photo.variant?.color||p.name));
  const thumb=node("img");thumb.src=photo.url;thumb.alt="";thumb.loading="lazy";btn.append(thumb);
  btn.onclick=()=>{
   if(photo.variant){
    $("details-color").value=photo.variant.color||"Única";fillDetailSizes();
    $("details-size").value=photo.variant.size||"Único";detailCount=1;renderDetailSelection();
   }else{
    image.replaceChildren();const big=node("img");big.src=photo.url;big.alt=p.name;image.append(big);
    for(const other of thumbnails.children)other.classList.remove("selected");btn.classList.add("selected");
   }
  };
  thumbnails.append(btn);
 }
}
function showProductDetails(p,updateLink=true){
 detailProduct=p;detailCount=1;
 $("details-category").textContent=p.category||"SALUZ";
 $("details-title").textContent=p.name;
 $("details-description").textContent=p.description||"Detalhes disponíveis com a equipe SALUZ.";
 $("details-price").textContent=money(p.price_cents);
 $("details-feedback").textContent="";
 const variants=Array.isArray(p.variants)?p.variants:[];
 $("details-color").replaceChildren();
 for(const color of [...new Set(variants.map(v=>v.color||"Única"))]){
  const op=node("option","",color);op.value=color;$("details-color").append(op);
 }
 const first=variants.find(v=>maxQuantity(v)>0)||variants[0];
 if(first)$("details-color").value=first.color||"Única";
 fillDetailSizes();if(first)$("details-size").value=first.size||"Único";
 $("detail-options").hidden=!variants.length;
 renderDetailSelection();
 if(!$("product-dialog").open)$("product-dialog").showModal();
 if(updateLink){const u=new URL(location.href);u.searchParams.set("produto",p.id);history.replaceState(null,"",u);}
 emit("product_view",p.name);
}
$("details-close").onclick=()=>close($("product-dialog"));
$("product-dialog").addEventListener("close",()=>{
 detailProduct=null;const u=new URL(location.href);
 if(u.searchParams.has("produto")){u.searchParams.delete("produto");history.replaceState(null,"",u);}
});
$("details-color").onchange=()=>{fillDetailSizes();detailCount=1;renderDetailSelection();};
$("details-size").onchange=()=>{detailCount=1;renderDetailSelection();};
$("details-minus").onclick=()=>{detailCount=Math.max(1,detailCount-1);renderDetailSelection();};
$("details-plus").onclick=()=>{detailCount=Math.min(maxQuantity(detailVariant()),detailCount+1);renderDetailSelection();};
$("details-add").onclick=()=>{
 const result=addToBag(detailProduct,detailVariant(),detailCount);
 if(!result.ok){$("details-feedback").textContent=result.message;return;}
 close($("product-dialog"));$("cart-dialog").showModal();
};
$("details-share").onclick=async()=>{
 if(!detailProduct)return;
 const url=new URL(location.href);url.searchParams.set("produto",detailProduct.id);url.hash="produtos";
 try{
  if(navigator.share)await navigator.share({title:detailProduct.name,url:url.href});
  else if(navigator.clipboard){await navigator.clipboard.writeText(url.href);$("details-feedback").textContent="Link copiado.";}
  else $("details-feedback").textContent="Link: "+url.href;
 }catch(e){if(e.name!=="AbortError")$("details-feedback").textContent="Não foi possível compartilhar agora.";}
};

