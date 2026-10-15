/* SALUZ Loja · no payment provider connected · no customer data stored in browser */
const $ = id => document.getElementById(id);
const money = cents => (Number(cents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const knownCategories=["Nécessaires","Porta-joias","Organizadores de maquiagem","Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"];
const urlParams=new URLSearchParams(location.search);
const requestedCategory=urlParams.get("categoria")||"all";
let products=[],bag=[],activeCategory=knownCategories.includes(requestedCategory)?requestedCategory:"all",available=false,checkoutEnabled=false,detailProduct=null,detailCount=1;
try { bag=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]"); if (!Array.isArray(bag)) bag=[]; } catch {bag=[]}
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
    button.style.cssText="border:1px solid #51443b;background:"+(value==="accepted"?"#51443b":"transparent")+";color:"+(value==="accepted"?"white":"#51443b")+";padding:9px 12px;cursor:pointer";
    button.onclick=()=>{localStorage.setItem("saluz-analytics",value);notice.remove();if(value==="accepted")emit("page_view");};
    row.append(button);
  }
  notice.append(row);document.body.append(notice);
}
function saveBag(){localStorage.setItem("saluz-bag-v1",JSON.stringify(bag));const total=bag.reduce((sum,i)=>sum+Math.max(0,Number(i.quantity)||0),0);$("cart-count").textContent=total;$("mobile-cart-count").textContent=total;}
function variationImage(p,v){return v?.image_url||p?.image_url||"";}
function maxQuantity(v){return Math.min(10,Math.max(0,Number(v?.stock)||0));}
function addToBag(p,v,quantity=1){
 if(!p||!v||maxQuantity(v)===0)return {ok:false,message:"Variação indisponível."};
 const key=p.id+"|"+(v.color||"")+"|"+(v.size||"");
 const current=bag.find(i=>i.key===key);
 const next=(current?Number(current.quantity):0)+quantity;
 if(!Number.isInteger(next)||next<1||next>maxQuantity(v))return {ok:false,message:"Quantidade indisponível para esta variação."};
 if(current)current.quantity=next;
 else bag.push({key,id:p.id,color:v.color||"",size:v.size||"",quantity:next});
 saveBag();renderBag();emit("add_to_cart",p.name);return {ok:true};
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
function productCard(p){
  const card=node("article","product");
  const image=node("div","product-image"+(p.image_url?"":" placeholder"));
  if(p.image_url){const img=node("img");img.src=p.image_url;img.loading="lazy";img.alt="Produto "+p.name;img.onerror=()=>{img.remove();image.classList.add("placeholder");};image.append(img);}
  const picture=node("button","product-image-button");picture.type="button";picture.setAttribute("aria-label","Ver detalhes de "+p.name);picture.append(image);picture.onclick=()=>showProductDetails(p);card.append(picture);
  const b=node("div","product-body");b.append(node("span","product-category",p.category||"SALUZ"),node("h3","",p.name),node("span","price",money(p.price_cents)));
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
      if(url){const img=node("img");img.src=url;img.loading="lazy";img.alt=p.name+" na cor "+color.value+", tamanho "+size.value;img.onerror=()=>{img.remove();image.classList.add("placeholder");};image.append(img);}
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
  const more=node("button","","Ver detalhes");more.type="button";more.className="view-details";more.onclick=()=>showProductDetails(p);b.append(more);
  card.append(b);return card;
}
function renderProducts(){
  const query=$("search").value.trim().toLocaleLowerCase("pt-BR");
  const chosen=products.filter(p=>(activeCategory==="all"||p.category===activeCategory)&&(p.name+" "+p.category+" "+p.description+" "+(p.variants||[]).map(v=>v.color+" "+v.size).join(" ")).toLocaleLowerCase("pt-BR").includes(query));
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
  $("catalog-status").textContent=available
    ? (chosen.length ? chosen.length+" produto(s) encontrado(s)" : "Ainda não há produtos disponíveis nesta categoria.")
    : (activeCategory!=="all" ? "A coleção "+activeCategory+" está em preparação. Os produtos serão exibidos quando o catálogo for ativado." : "O catálogo da SALUZ está em preparação. Os produtos reais aparecerão nesta vitrine.");
}
function findItem(i){
  const product=products.find(p=>p.id===i.id);
  const variation=product&&variantsFor(product).find(v=>(v.color||"")===i.color&&(v.size||"")===i.size);
  return product&&variation?{product,variation}:null;
}
function changeBagQuantity(index,delta){
 const line=bag[index],current=line?findItem(line):null;
 if(!current)return;
 const value=Number(line.quantity)+delta;
 if(value<=0){bag.splice(index,1);}
 else if(value>maxQuantity(current.variation)){$("cart-feedback").textContent="Quantidade maior que o estoque disponível.";return;}
 else line.quantity=value;
 saveBag();renderBag();
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
  const remove=node("button","remove","Remover");remove.type="button";remove.onclick=()=>{bag.splice(index,1);saveBag();renderBag();};
  side.append(remove);row.append(thumb,info,side);root.append(row);
 });
 if(!bag.length)root.append(node("p","notice","Sua sacola está vazia. Explore as coleções para começar."));
 $("cart-total").textContent=money(total);
 $("checkout-open").disabled=!checkoutEnabled||!bag.length||unavailable;
 $("checkout-open").textContent=checkoutEnabled?"Continuar com meus dados":"Pedidos em preparação";
 $("cart-feedback").textContent=checkoutEnabled?(unavailable?"Revise a disponibilidade dos itens.":""):"Você pode montar sua sacola. Os pedidos ainda não estão liberados.";
}
async function loadStore(){
  try{
    const [pr,st]=await Promise.all([fetch("/api/products",{cache:"no-store"}),fetch("/api/status",{cache:"no-store"})]);
    if(!pr.ok||!st.ok)throw new Error("A loja ainda não foi conectada");
    const a=await pr.json(),b=await st.json();
    available=!!a.configured;
    products=Array.isArray(a.products)?a.products:[];
    checkoutEnabled=b.checkout_enabled===true;
  }catch{available=false;checkoutEnabled=false;products=[];}
  $("checkout-status").textContent=checkoutEnabled?"Solicitação sem pagamento online. A SALUZ entrará em contato para confirmar valores, frete e forma de pagamento.":"O cadastro de pedidos está desativado até concluirmos a infraestrutura, segurança e políticas da loja.";
  $("checkout-submit").disabled=!checkoutEnabled;
  renderFilters();renderProducts();renderBag();saveBag();
}
function close(dialog){if(dialog.open)dialog.close();}
$("year").textContent=new Date().getFullYear();
$("search").value=urlParams.get("q")||"";
$("search").addEventListener("input",renderProducts);
$("cart-open").onclick=()=>{renderBag();$("cart-dialog").showModal();};
$("cart-close").onclick=()=>close($("cart-dialog"));
$("checkout-close").onclick=()=>close($("checkout-dialog"));
$("checkout-open").onclick=()=>{
  if(!$("checkout-open").disabled){
    close($("cart-dialog"));$("checkout-dialog").showModal();emit("checkout_start");
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

function showProductDetails(p){
 $("details-category").textContent=p.category||"SALUZ";
 $("details-title").textContent=p.name;
 $("details-description").textContent=p.description||"Descrição a definir.";
 $("details-price").textContent=money(p.price_cents);
 const first=variantsFor(p)[0];
 const image=$("details-image");image.replaceChildren();
 if(first?.image_url||p.image_url){const img=document.createElement("img");img.alt="Imagem de "+p.name;img.src=first?.image_url||p.image_url;image.append(img);}
 else image.textContent="✦";
 $("product-dialog").showModal();emit("product_view",p.name);
}
$("details-close").onclick=()=>close($("product-dialog"));
