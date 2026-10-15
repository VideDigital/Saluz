/* SALUZ admin · only authorized users can query /api/admin/* */
const $=id=>document.getElementById(id);
const fmt=n=>(Number(n||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value===undefined?"":String(value);if(cls)n.className=cls;return n;};
const displayDate=s=>new Date(s).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
let catalog=[],orders=[],currentTab="overview";
let adminPage=0,adminHasMore=false,adminLoading=false;
const statusNames={
 solicitacao_recebida:"Solicitação recebida",contatado:"Cliente contatado",
 aguardando_pagamento:"Aguardando pagamento",pago_confirmado:"Pago — confirmado",
 em_preparacao:"Em preparação",enviado:"Enviado",cancelado:"Cancelado"
};
async function api(path,opts={}){
 const res=await fetch("/api/"+path,{cache:"no-store",credentials:"same-origin",
   ...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});
 const b=await res.json().catch(()=>({}));
 if(!res.ok){const detail=b.error||"Erro de comunicação com o sistema";throw new Error(res.status===503?"Painel em configuração: falta concluir a conexão segura com o Supabase.":detail);}
 return b;
}
function message(t){$("action-message").textContent=t||"";}
let authRequestId=0;
let loginSubmitting=false;
function showLogin(msg){
 $("dashboard").classList.add("hidden");
 $("login-screen").classList.remove("hidden");
 $("login-message").textContent=msg||"Acesse com sua conta autorizada.";
}
function showDashboard(){
 $("login-screen").classList.add("hidden");
 $("dashboard").classList.remove("hidden");
 // A conta já foi autenticada. Um erro de renderização jamais pode ser
 // confundido com senha inválida e devolver o usuário à tela de login.
 try { changeTab("overview"); }
 catch (err) {
   console.error("SALUZ: erro ao iniciar o painel",err);
   $("section-title").textContent="Visão geral";
   message("Seu acesso foi confirmado, mas houve uma falha ao carregar o painel. Atualize esta página.");
 }
}
async function checkSession(){
 const requestId=++authRequestId;
 try {
   const result=await api("auth/me");
   if(requestId!==authRequestId || loginSubmitting)return;
   if(result.admin===true)showDashboard();
   else showLogin("Entre com sua conta administrativa da SALUZ.");
 }catch(err){
   if(requestId!==authRequestId || loginSubmitting)return;
   showLogin("Não foi possível verificar a sessão. Confira sua conexão e tente entrar.");
 }
}
function loginErrorMessage(error,stage){
 const detail=String(error?.message||"");
 if(detail.includes("Muitas tentativas"))return "Muitas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.";
 if(detail.includes("Credenciais inválidas"))return "E-mail ou senha incorretos para a conta administrativa SALUZ.";
 if(detail.includes("Acesso negado")||detail.includes("Acesso não autorizado"))return "Conta autenticada, mas sem permissão administrativa na SALUZ.";
 if(detail.includes("Painel em configuração")||detail.includes("Proteção de acesso aguardando configuração"))return "O serviço de acesso não está configurado ou está temporariamente indisponível.";
 if(detail.includes("Sessão não confirmada")||stage==="session")return "A senha foi aceita, mas a sessão não foi confirmada no navegador. Tente atualizar a página. Se persistir, abra diretamente no Chrome.";
 if(stage==="login")return "Não foi possível concluir o login. Verifique sua conexão e tente novamente.";
 return "Ocorreu um erro ao abrir o painel. Atualize a página para tentar novamente.";
}
$("login-form").addEventListener("submit",async event=>{
 event.preventDefault();
 if(loginSubmitting)return;
 loginSubmitting=true;
 const requestId=++authRequestId;
 const form=event.currentTarget;
 const submit=form.querySelector('button[type="submit"]');
 const fd=new FormData(form);
 let stage="login";
 submit.disabled=true;
 form.setAttribute("aria-busy","true");
 $("login-message").textContent="Validando acesso...";
 try {
   await api("auth/login",{method:"POST",body:JSON.stringify({
     email:String(fd.get("email")||"").trim().toLowerCase(),
     password:String(fd.get("password")||"")
   })});
   if(requestId!==authRequestId)return;
   stage="session";
   $("login-message").textContent="Credenciais aceitas. Confirmando sessão...";
   const session=await api("auth/me");
   if(requestId!==authRequestId)return;
   if(session.admin!==true)throw new Error("Sessão não confirmada");
   stage="dashboard";
   form.reset();
   showDashboard();
 }catch(err){
   if(requestId===authRequestId){
     console.error("SALUZ: falha na etapa de autenticação",stage,err);
     showLogin(loginErrorMessage(err,stage));
   }
 }finally{
   if(requestId===authRequestId)loginSubmitting=false;
   submit.disabled=false;
   form.removeAttribute("aria-busy");
 }
});
$("logout").onclick=async()=>{
 const requestId=++authRequestId;
 try { await api("auth/logout",{method:"POST",body:"{}"}); }
 catch (err) { console.warn("SALUZ: não foi possível concluir o logout remoto",err); }
 if(requestId!==authRequestId)return;
 showLogin("Sessão encerrada. Entre novamente com sua senha.");
};
function changeTab(name){
 currentTab=name;
 for(const b of document.querySelectorAll("[data-tab]"))b.classList.toggle("selected",b.dataset.tab===name);
 for(const name2 of ["overview","orders","customers","products","finance","reports"])$("tab-"+name2).classList.toggle("hidden",name!==name2);
 $("section-title").textContent={overview:"Visão geral",orders:"Pedidos",customers:"Clientes",products:"Produtos",finance:"Financeiro",reports:"Relatórios"}[name];
 message("");
 if(name==="overview")window.SaluzAdminExtras?.loadOverview();
 if(name==="orders")loadOrders();
 if(name==="customers")window.SaluzAdminExtras?.loadCustomers();
 if(name==="products")loadProducts();
 if(name==="finance")window.SaluzAdminExtras?.openFinance();
 if(name==="reports")loadReports();
}
for(const b of document.querySelectorAll("[data-tab]"))b.onclick=()=>changeTab(b.dataset.tab);
function line(parent,label,value){
 const p=text("p");p.append(text("strong",label+": "),text("span",value));parent.append(p);
}
function renderOrders(){
 const root=$("orders");root.replaceChildren();
 if(!orders.length){root.append(text("p","Nenhuma solicitação recebida até o momento.","muted"));return;}
 for(const o of orders){
  const card=text("article",undefined,"order-card"),head=text("div",undefined,"order-top");
  head.append(text("strong","Pedido #"+o.id.slice(0,8).toUpperCase()),text("span",statusNames[o.status]||o.status,"pill"));card.append(head);
  const details=text("div",undefined,"order-details"),left=text("div"),right=text("div");
  line(left,"Cliente",o.customer_name);line(left,"E-mail",o.customer_email);
  line(left,"Telefone",o.customer_phone);
  line(left,"CPF",o.customer_cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4"));
  line(right,"Endereço",o.address_line+", "+o.address_number+(o.address_extra?", "+o.address_extra:"")+", "+o.neighborhood+", "+o.city+"/"+o.state+" - "+o.postal_code);
  line(right,"Produtos",(o.items||[]).map(i=>i.quantity+"× "+i.name+" ("+i.color+" "+i.size+")").join("; "));
  line(right,"Subtotal",fmt(o.subtotal_cents));line(right,"Frete","A confirmar");
  line(right,"Recebido",displayDate(o.created_at));
  details.append(left,right);card.append(details);
  const controls=text("div",undefined,"order-footer");
  const select=document.createElement("select");
  select.setAttribute("aria-label","Situação do pedido");
  for(const [val,label] of Object.entries(statusNames)){
   const option=document.createElement("option");option.value=val;option.textContent=label;
   if(o.status===val)option.selected=true;
   select.append(option);
  }
  const save=text("button","Salvar status");save.type="button";
  save.onclick=async()=>{
    const isPaid=select.value==="pago_confirmado";
    if(isPaid&&!confirm("Você verificou no extrato da conta o recebimento real desse pagamento? CPF ou comprovante enviado não bastam."))return;
    save.disabled=true;
    try{
      await api("admin/orders/"+o.id,{method:"PATCH",body:JSON.stringify({status:select.value,bank_verified:isPaid})});
      message("Status atualizado. Nenhuma mensagem foi enviada automaticamente.");
      await loadOrders();
    }catch(e){message(e.message);save.disabled=false;}
  };
  controls.append(select,save);
  const phone=String(o.customer_phone).replace(/\D/g,"");
  if(phone.length>=10&&phone.length<=13){
    const a=text("a","Conversar no WhatsApp ↗");a.target="_blank";a.rel="noopener noreferrer";
    const full=phone.startsWith("55")?phone:"55"+phone;
    a.href="https://wa.me/"+full+"?text="+encodeURIComponent("Olá, "+o.customer_name+"! Aqui é da SALUZ sobre sua solicitação de pedido "+o.id.slice(0,8).toUpperCase()+".");
    controls.append(a);
  }
  card.append(controls);root.append(card);
 }
}
async function loadOrders(){
 try{const r=await api("admin/orders");orders=r.orders||[];renderOrders();}
 catch(e){message(e.message);}
}
$("refresh-orders").onclick=loadOrders;
function productStock(p){
  return (Array.isArray(p.variants)?p.variants:[]).reduce((total,v)=>total+Math.max(0,Number(v.stock)||0),0);
}
function productMatches(p){
  const q=$("product-search").value.trim().toLocaleLowerCase("pt-BR");
  const mode=$("product-filter").value;
  if(q&&!(p.name+" "+p.category).toLocaleLowerCase("pt-BR").includes(q))return false;
  if(mode==="active"&&!p.is_active)return false;
  if(mode==="featured"&&!(p.is_active&&p.is_featured))return false;
  if(mode==="inactive"&&p.is_active)return false;
  if(mode==="out"&&productStock(p)>0)return false;
  return true;
}
function renderProductList(){
 const root=$("admin-products");root.replaceChildren();
 const visible=catalog.filter(p=>p.is_active).length;
 const stockless=catalog.filter(p=>productStock(p)===0).length;
 $("product-summary").textContent=catalog.length+" cadastrado(s) · "+visible+" visível(is) · "+stockless+" sem estoque";
 const items=catalog.filter(productMatches);
 if(!items.length){
  root.append(text("p",catalog.length?"Nenhum produto corresponde aos filtros.":"Nenhum produto cadastrado ainda.","muted"));
  return;
 }
 for(const p of items){
  const row=text("article",undefined,"product-row"),summary=text("div",undefined,"product-row-details");
  const imgWrap=text("div",undefined,"product-list-image");
  const imgUrl=p.image_url||(p.variants||[]).find(v=>v.image_url)?.image_url;
  if(imgUrl){const img=document.createElement("img");img.src=imgUrl;img.alt="Foto do produto "+p.name;img.loading="lazy";imgWrap.append(img);}
  else imgWrap.append(text("span","✦"));
  const body=text("div",undefined,"product-row-info");
  const head=text("strong",p.name),meta=text("small",fmt(p.price_cents)+" · "+p.category);
  const badges=text("div",undefined,"product-row-badges");
  badges.append(text("span",p.is_active?"Visível na loja":"Oculto",p.is_active?"product-badge public":"product-badge"));
  if(p.is_featured)badges.append(text("span",p.is_active?"✦ Destaque na Home":"✦ Destaque aguardando ativação","product-badge"));
  const units=productStock(p);
  badges.append(text("span",units?units+" unidade(s)":"Sem estoque",units?"product-badge":"product-badge warning"));
  body.append(head,meta,badges);summary.append(imgWrap,body);
  const actions=text("div",undefined,"product-row-actions");
  const toggle=text("button",p.is_active?"Ocultar":"Exibir no site",p.is_active?"visibility active":"visibility");
  toggle.type="button";
  toggle.setAttribute("aria-label",(p.is_active?"Ocultar ":"Exibir ")+p.name+" no site");
  toggle.onclick=async()=>{
    toggle.disabled=true;
    try{
      if(!p.is_active && !(p.variants||[]).length)throw new Error("Cadastre pelo menos uma variação antes de publicar.");
      await api("admin/products/"+p.id,{method:"PATCH",body:JSON.stringify({...p,is_active:!p.is_active})});
      await loadProducts();
      message(p.is_active?"Produto ocultado da loja.":"Produto publicado na loja.");
    }catch(e){message(e.message);toggle.disabled=false;}
  };
  const featured=text("button",p.is_featured?"Remover destaque":"✦ Destacar",p.is_featured?"outline":"visibility");
  featured.type="button";
  featured.setAttribute("aria-label",(p.is_featured?"Remover destaque de ":"Destacar na Home: ")+p.name);
  featured.onclick=async()=>{
    featured.disabled=true;
    try{
      if(!p.is_featured&&!p.is_active)throw new Error("Ative o produto antes de destacá-lo na Home.");
      await api("admin/products/"+p.id,{method:"PATCH",body:JSON.stringify({...p,is_featured:!p.is_featured})});
      message("Configuração de destaque atualizada.");
      await loadProducts();
    }catch(e){message(e.message);featured.disabled=false;}
  };
  actions.append(featured);
  const btn=text("button","Editar","outline");btn.type="button";btn.onclick=()=>editProduct(p);
  actions.append(toggle,btn);row.append(summary,actions);root.append(row);
 }
}
$("product-search").addEventListener("input",renderProductList);
$("product-filter").addEventListener("change",renderProductList);
function publishingChecklist(){
  const form=$("product-form"),rows=[...$("variant-rows").children];
  const name=form.elements.name.value.trim(),priceString=form.elements.price.value.trim();
  const price=Number(priceString);
  const hasName=name.length>=2;
  const hasPrice=priceString!==""&&Number.isFinite(price)&&price>=0&&price<=500000;
  const validPhoto=url=>/^https:\/\//i.test(String(url||"").trim());
  const hasPhoto=validPhoto(form.elements.image_url.value)||rows.some(row=>validPhoto(row.querySelector('[data-field="image"]')?.value));
  const validVariants=rows.length>0&&rows.every(row=>{
    const color=row.querySelector('[data-field="color"]').value.trim();
    const size=row.querySelector('[data-field="size"]').value.trim();
    const stock=row.querySelector('[data-field="stock"]').value;
    return color.length>0&&size.length>0&&stock!==""&&Number.isInteger(Number(stock))&&Number(stock)>=0;
  });
  const unique=new Set();
  const noDuplicates=rows.every(row=>{
    const key=JSON.stringify([row.querySelector('[data-field="color"]').value.trim().toLocaleLowerCase("pt-BR"),row.querySelector('[data-field="size"]').value.trim().toLocaleLowerCase("pt-BR")]);
    if(unique.has(key))return false;unique.add(key);return true;
  });
  const checks=[
    {ok:hasName,label:"Nome do produto preenchido"},
    {ok:hasPrice,label:"Preço informado corretamente"},
    {ok:hasPhoto,label:"Foto principal ou de variação em HTTPS"},
    {ok:validVariants,label:"Cores, tamanhos e estoques preenchidos"},
    {ok:noDuplicates,label:"Variações sem combinações repetidas"}
  ];
  return {checks,ready:checks.every(x=>x.ok)};
}
function renderPublishingChecklist(){
  const list=$("publish-check-list"),info=$("publish-check-status");
  if(!list||!info)return;
  const {checks,ready}=publishingChecklist();
  list.replaceChildren();
  for(const check of checks){
    const item=text("li",(check.ok?"✓ ":"○ ")+check.label,check.ok?"complete":"incomplete");
    list.append(item);
  }
  const visible=$("product-form").elements.is_active.checked;
  info.textContent=visible?(ready?"Pronto para ativação":"Complete os itens pendentes"):(ready?"Cadastro conferido":"Rascunho em edição");
  info.classList.toggle("complete",ready);
}
function updateProductPreview(){
 const f=$("product-form"),p=$("preview-photo");p.replaceChildren();
 const name=f.elements.name.value.trim(),price=Number(f.elements.price.value);
 $("preview-name").textContent=name||"Seu produto aparecerá aqui";
 $("preview-price").textContent=Number.isFinite(price)&&price>=0?fmt(Math.round(price*100)):"Preço a definir";
 const rows=[...$("variant-rows").children];
 const units=rows.reduce((n,row)=>n+(Number(row.querySelector('[data-field="stock"]')?.value)||0),0);
 $("preview-variants").textContent=rows.length+" variação(ões) · "+Math.max(0,units)+" unidade(s) cadastrada(s)";
 $("preview-visibility").textContent=f.elements.is_active.checked?(f.elements.is_featured.checked?"Visível na loja e marcado como destaque":"Marcado para exibir no site"):"Oculto até publicar";
 $("preview-visibility").classList.toggle("public",f.elements.is_active.checked);
 const source=f.elements.image_url.value.trim()||rows.find(row=>row.querySelector('[data-field="image"]')?.value)?.querySelector('[data-field="image"]').value||"";
 if(/^https:\/\//.test(source)){
  const img=document.createElement("img");img.src=source;img.alt="Prévia do produto";
  img.onerror=()=>{p.replaceChildren(text("span","✦"));};p.append(img);
 }else p.append(text("span","✦"));
 renderPublishingChecklist();
}
$("product-form").addEventListener("input",updateProductPreview);
$("product-form").addEventListener("change",updateProductPreview);
function editProduct(p){
 const f=$("product-form");f.reset();f.elements.id.value=p.id;
 f.elements.name.value=p.name;f.elements.description.value=p.description;
 f.elements.category.value=p.category;f.elements.price.value=(p.price_cents/100).toFixed(2);
 f.elements.image_url.value=p.image_url||"";
 $("variant-rows").replaceChildren();(p.variants||[]).forEach(addVariantRow);
 f.elements.is_active.checked=!!p.is_active;
 f.elements.is_featured.checked=!!p.is_featured;
 $("main-preview").replaceChildren();if(p.image_url){const img=document.createElement("img");img.src=p.image_url;img.alt="Imagem principal";$("main-preview").append(img);}
 $("product-form-label").textContent="EDITANDO PRODUTO";
 $("cancel-edit").hidden=false;
 const visit=$("visit-product");
 visit.hidden=!p.is_active;
 if(p.is_active)visit.href="./produto.html?id="+encodeURIComponent(p.id);
 updateProductPreview();
 f.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
function newProduct(){
 const f=$("product-form");f.reset();f.elements.id.value="";$("variant-rows").replaceChildren();addVariantRow();$("main-preview").replaceChildren();
 $("product-form-label").textContent="NOVO PRODUTO";
 $("cancel-edit").hidden=true;
 $("visit-product").hidden=true;
 updateProductPreview();
}
$("new-product").onclick=()=>{newProduct();$("product-form").scrollIntoView({behavior:"smooth"});};
$("cancel-edit").onclick=()=>{
 newProduct();
 message("Edição cancelada. Nenhuma alteração foi salva.");
 $("product-form").scrollIntoView({behavior:"auto",block:"start"});
};
async function loadAdminPage(page){
 if(adminLoading)return;
 adminLoading=true;
 const btn=$("admin-load-more");btn.disabled=true;
 $("admin-page-status").textContent="Carregando catálogo...";
 try{
  const result=await api("admin/products?page="+page);
  const current=new Set(catalog.map(p=>p.id));
  if(page===1){catalog=[];current.clear();}
  catalog.push(...(result.products||[]).filter(p=>!current.has(p.id)));
  adminPage=page;adminHasMore=result.has_more===true;
  renderProductList();
  $("admin-page-status").textContent=adminHasMore?"Existem mais produtos para carregar.":"Catálogo carregado nesta consulta.";
 }catch(e){message(e.message);$("admin-page-status").textContent="Não foi possível carregar esta página.";}
 finally{adminLoading=false;btn.disabled=false;btn.hidden=!adminHasMore;}
}
async function loadProducts(){return loadAdminPage(1);}
$("admin-load-more").onclick=()=>{if(adminHasMore)loadAdminPage(adminPage+1);};
$("product-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,button=$("save-product");
 if(button.disabled)return;
 button.disabled=true;button.textContent="Salvando...";
 let variants=[];
 try{
  variants=[...$("variant-rows").children].map(row=>({color:row.querySelector('[data-field="color"]').value.trim(),size:row.querySelector('[data-field="size"]').value.trim(),stock:Number(row.querySelector('[data-field="stock"]').value),image_url:row.querySelector('[data-field="image"]').value.trim()}));
  if(f.elements.is_active.checked&&!publishingChecklist().ready)
     throw new Error("Antes de publicar, complete a conferência do cadastro.");
  if(!variants.length)throw new Error("Adicione pelo menos uma variação.");
  if(variants.some(v=>!v.color||!v.size||!Number.isInteger(v.stock)||v.stock<0))throw new Error("Preencha cor, tamanho e estoque em cada variação.");
  const price=Number(f.elements.price.value);
  if(!Number.isFinite(price))throw new Error("Preço inválido");
  const product={name:f.elements.name.value,category:f.elements.category.value,
   description:f.elements.description.value,image_url:f.elements.image_url.value,
   price_cents:Math.round(price*100),is_active:f.elements.is_active.checked,is_featured:f.elements.is_featured.checked,variants};
  const id=f.elements.id.value;
  await api(id?"admin/products/"+id:"admin/products",{method:id?"PATCH":"POST",body:JSON.stringify(product)});
  message("Produto salvo. Confira as variações e o estoque antes de ativar.");
  newProduct();await loadProducts();
 }catch(err){message(err.message);}
 finally{button.disabled=false;button.textContent="Salvar produto";}
});

async function uploadPhoto(file){
 if(!file)return "";
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw new Error("Use uma foto JPG, PNG ou WebP de até 5 MB.");
 const res=await fetch("/api/admin/upload",{method:"POST",credentials:"same-origin",headers:{"content-type":file.type},body:file});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||"Não foi possível enviar a foto.");
 return data.url;
}
function addVariantRow(v={color:"",size:"Único",stock:0,image_url:""}){
 const row=text("div",undefined,"variant-row");
 for(const [field,label,type,value] of [["color","Cor","text",v.color],["size","Tamanho","text",v.size],["stock","Estoque","number",v.stock],["image","URL da foto","url",v.image_url]]){
  const wrap=text("label",label),input=document.createElement("input");
  input.dataset.field=field;input.type=type;input.value=value??"";input.required=field!=="image";
  if(field==="stock")input.min="0";
  input.maxLength=field==="image"?650:40;wrap.append(input);row.append(wrap);
 }
 const imageWrap=text("div",undefined,"variant-photo");
 const preview=document.createElement("img");preview.alt="Prévia da variação";preview.loading="lazy";
 const current=()=>{const url=row.querySelector('[data-field="image"]').value;preview.hidden=!url;if(url)preview.src=url;};
 row.querySelector('[data-field="image"]').addEventListener("input",current);current();
 const upload=document.createElement("input");upload.type="file";upload.accept="image/jpeg,image/png,image/webp";
 upload.setAttribute("aria-label","Enviar foto desta cor e tamanho");
 upload.onchange=async()=>{
   if(!upload.files?.[0])return;
   upload.disabled=true;message("Enviando imagem...");
   try{const url=await uploadPhoto(upload.files[0]);row.querySelector('[data-field="image"]').value=url;current();updateProductPreview();message("Foto enviada com sucesso.");}
   catch(e){message(e.message);}
   finally{upload.disabled=false;upload.value="";}
 };
 imageWrap.append(preview,upload);row.append(imageWrap);
 const remove=text("button","Remover variação","outline");remove.type="button";remove.onclick=()=>{row.remove();updateProductPreview();};row.append(remove);
 $("variant-rows").append(row);
 row.addEventListener("input",updateProductPreview);
 updateProductPreview();
}
$("add-variant").onclick=()=>addVariantRow();
$("main-photo").onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 e.target.disabled=true;message("Enviando imagem principal...");
 try{const url=await uploadPhoto(f);$("product-form").elements.image_url.value=url;const preview=$("main-preview");preview.replaceChildren();const image=document.createElement("img");image.src=url;image.alt="Imagem principal";preview.append(image);updateProductPreview();message("Foto principal enviada.");}
 catch(err){message(err.message);}finally{e.target.value="";e.target.disabled=false;}
};

const statNames={page_views:"Visualizações de página",visitors:"Sessões únicas",product_views:"Visualizações de produto",add_to_cart:"Adições à sacola",checkout_starts:"Inícios de checkout",checkout_submits:"Solicitações enviadas",contact_clicks:"Cliques no contato"};
function renderReports(stats){
 const root=$("stats"),chart=$("daily-chart");root.replaceChildren();chart.replaceChildren();
 for(const [key,name] of Object.entries(statNames)){
  const card=text("div",undefined,"stat");card.append(text("small",name),text("strong",Number(stats?.[key]||0).toLocaleString("pt-BR")));root.append(card);
 }
 const days=Array.isArray(stats?.daily)?stats.daily:[];
 if(!days.length){chart.append(text("p","Ainda não há visitas consentidas no período.","muted"));return;}
 const top=Math.max(1,...days.map(x=>Number(x.page_views)||0));
 for(const d of days){
  const col=text("div",undefined,"bar-item"),bar=text("div",undefined,"bar");
  bar.style.height=(Math.max(2,(Number(d.page_views)||0)/top*170))+"px";
  bar.title=d.page_views+" visualizações";
  col.append(text("span",d.page_views),bar,text("span",d.day.slice(5)));chart.append(col);
 }
}
async function loadReports(){
 try{const r=await api("admin/metrics?days="+$("period").value);renderReports(r.metrics||{});}
 catch(e){message(e.message);}
}
$("period").onchange=loadReports;
addVariantRow();
updateProductPreview();
checkSession();