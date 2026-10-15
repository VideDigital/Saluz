/* SALUZ Loja · no payment provider connected · no customer data stored in browser */
const $ = id => document.getElementById(id);
const money = cents => (Number(cents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let products=[],bag=[],activeCategory="all",available=false,checkoutEnabled=false;
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
  notice.style.cssText="position:fixed;z-index:200;left:14px;bottom:14px;width:min(430px,calc(100% - 28px));background:#fffdf9;border:1px solid #ddd0c6;box-shadow:0 8px 32px #0002;padding:18px;color:#51443b;font:13px/1.55 'DM Sans',sans-serif";
  notice.textContent="Podemos registrar visitas e cliques de forma agregada para melhorar a loja? Não usamos esses dados para identificar compradores.";
  const row=document.createElement("div");row.style.cssText="display:flex;gap:10px;margin-top:12px";
  for(const [label,value] of [["Não aceitar","declined"],["Aceitar métricas","accepted"]]){
    const button=document.createElement("button");button.type="button";button.textContent=label;
    button.style.cssText="border:1px solid #51443b;background:"+(value==="accepted"?"#51443b":"transparent")+";color:"+(value==="accepted"?"white":"#51443b")+";padding:9px 12px;cursor:pointer";
    button.onclick=()=>{localStorage.setItem("saluz-analytics",value);notice.remove();if(value==="accepted")emit("page_view");};
    row.append(button);
  }
  notice.append(row);document.body.append(notice);
}
function saveBag(){localStorage.setItem("saluz-bag-v1",JSON.stringify(bag));$("cart-count").textContent=bag.reduce((sum,i)=>sum+i.quantity,0);}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function variantsFor(p){return Array.isArray(p.variants)?p.variants.filter(v=>Number(v.stock)>0):[];}
function renderFilters(){
  const root=$("filters");root.replaceChildren();
  const categories=["all",...new Set(products.map(p=>p.category).filter(Boolean))];
  categories.forEach(cat=>{
    const button=node("button","filter"+(cat===activeCategory?" active":""),cat==="all"?"Todos":cat);
    button.type="button";button.onclick=()=>{activeCategory=cat;renderFilters();renderProducts();};root.append(button);
  });
}
function productCard(p){
  const card=node("article","product");
  const image=node("div","product-image"+(p.image_url?"":" placeholder"));
  if(p.image_url){const img=node("img");img.src=p.image_url;img.loading="lazy";img.alt="Produto "+p.name;img.onerror=()=>{img.remove();image.classList.add("placeholder");};image.append(img);}
  card.append(image);
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
    fillSizes();color.onchange=fillSizes;
    color.setAttribute("aria-label","Cor");size.setAttribute("aria-label","Tamanho");
    opts.append(color,size);b.append(opts);
    const add=node("button","","Adicionar à sacola");
    add.type="button";add.onclick=()=>{
      const selected=inStock.find(v=>(v.color||"Única")===color.value&&(v.size||"Único")===size.value);
      if(!selected)return;
      const chosenColor=selected.color||"",chosenSize=selected.size||"";
      const key=p.id+"|"+chosenColor+"|"+chosenSize;
      const existing=bag.find(i=>i.key===key);
      if(existing){if(existing.quantity>=Math.min(10,Number(selected.stock)))return alert("Quantidade indisponível.");existing.quantity++;}
      else bag.push({key,id:p.id,color:chosenColor,size:chosenSize,quantity:1});
      saveBag();renderBag();emit("add_to_cart",p.name);$("cart-dialog").showModal();
    };
    b.append(add);
  }else{
    const noStock=node("button","","Indisponível");noStock.disabled=true;b.append(noStock);
  }
  card.append(b);return card;
}
function renderProducts(){
  const query=$("search").value.trim().toLocaleLowerCase("pt-BR");
  const chosen=products.filter(p=>(activeCategory==="all"||p.category===activeCategory)&&(p.name+" "+p.category+" "+p.description).toLocaleLowerCase("pt-BR").includes(query));
  $("products").replaceChildren(...chosen.map(productCard));
  $("catalog-status").textContent=available
    ? (chosen.length?chosen.length+" produto(s) encontrado(s)":"Nenhum produto disponível com esses filtros.")
    : "O catálogo está sendo configurado. Nenhuma compra está disponível nesta demonstração.";
}
function findItem(i){
  const product=products.find(p=>p.id===i.id);
  const variation=product&&variantsFor(product).find(v=>(v.color||"")===i.color&&(v.size||"")===i.size);
  return product&&variation?{product,variation}:null;
}
function renderBag(){
  const root=$("cart-items");root.replaceChildren();
  let total=0;
  bag.forEach((line,index)=>{
    const current=findItem(line);
    const row=node("div","cart-line"),info=node("div"),right=node("div");
    info.append(node("strong","",current?.product.name||"Produto indisponível"));
    info.append(node("span","",line.color+" · "+line.size+" · "+line.quantity+" un."));
    right.append(node("strong","",current?money(current.product.price_cents*line.quantity):"—"));
    if(current) total+=current.product.price_cents*line.quantity;
    const remove=node("button","","Remover");remove.type="button";
    remove.onclick=()=>{bag.splice(index,1);saveBag();renderBag();};
    right.append(remove);row.append(info,right);root.append(row);
  });
  if(!bag.length)root.append(node("p","notice","Sua sacola está vazia."));
  $("cart-total").textContent=money(total);
  $("checkout-open").disabled=!bag.length||!bag.every(i=>!!findItem(i));
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