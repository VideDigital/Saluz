/* SALUZ admin · only authorized users can query /api/admin/* */
const $=id=>document.getElementById(id);
const fmt=n=>(Number(n||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value===undefined?"":String(value);if(cls)n.className=cls;return n;};
const displayDate=s=>new Date(s).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
let catalog=[],orders=[],currentTab="orders";
const statusNames={
 solicitacao_recebida:"Solicitação recebida",contatado:"Cliente contatado",
 aguardando_pagamento:"Aguardando pagamento",pago_confirmado:"Pago — confirmado",
 em_preparacao:"Em preparação",enviado:"Enviado",cancelado:"Cancelado"
};
async function api(path,opts={}){
 const res=await fetch("/api/"+path,{cache:"no-store",credentials:"same-origin",
   ...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});
 const b=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(b.error||"Erro de comunicação com o sistema");
 return b;
}
function message(t){$("action-message").textContent=t||"";}
function showLogin(msg){
 $("dashboard").classList.add("hidden");$("login-screen").classList.remove("hidden");
 $("login-message").textContent=msg||"Acesse com sua conta autorizada.";
}
function showDashboard(){
 $("login-screen").classList.add("hidden");$("dashboard").classList.remove("hidden");
 changeTab("orders");
}
async function checkSession(){
 try{
   const r=await api("auth/me");
   if(r.admin)showDashboard();else showLogin("Entre com a conta administrativa da SALUZ.");
 }catch{showLogin("Painel aguardando conexão ao Supabase e à Cloudflare Pages.");}
}
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();const fd=new FormData(e.currentTarget);
 $("login-message").textContent="Validando acesso...";
 try{
  await api("auth/login",{method:"POST",body:JSON.stringify({email:fd.get("email"),password:fd.get("password")})});
  e.currentTarget.reset();showDashboard();
 }catch{showLogin("Não foi possível entrar. Verifique autorização e credenciais.");}
});
$("logout").onclick=async()=>{try{await api("auth/logout",{method:"POST",body:"{}"});}catch{}showLogin("Sessão encerrada.");};
function changeTab(name){
 currentTab=name;
 for(const b of document.querySelectorAll("[data-tab]"))b.classList.toggle("selected",b.dataset.tab===name);
 for(const name2 of ["orders","products","reports"])$("tab-"+name2).classList.toggle("hidden",name!==name2);
 $("section-title").textContent={orders:"Pedidos",products:"Produtos",reports:"Relatórios"}[name];
 message("");
 if(name==="orders")loadOrders();
 if(name==="products")loadProducts();
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
function renderProductList(){
 const root=$("admin-products");root.replaceChildren();
 if(!catalog.length){root.append(text("p","Nenhum produto cadastrado.","muted"));return;}
 for(const p of catalog){
  const row=text("div",undefined,"product-row"),summary=text("div");
  summary.append(text("strong",p.name),text("small",fmt(p.price_cents)+" · "+(p.is_active?"Ativo":"Inativo")+" · "+(p.variants||[]).length+" variação(ões)"));
  const actions=text("div",undefined,"product-row-actions");
  const toggle=text("button",p.is_active?"Ocultar no site":"Exibir no site",p.is_active?"visibility active":"visibility");
  toggle.type="button";
  toggle.onclick=async()=>{
    toggle.disabled=true;
    try{
      await api("admin/products/"+p.id,{method:"PATCH",body:JSON.stringify({...p,is_active:!p.is_active})});
      message(!p.is_active?"Produto ativado na vitrine.":"Produto ocultado da vitrine.");
      await loadProducts();
    }catch(e){message(e.message);toggle.disabled=false;}
  };
  const btn=text("button","Editar");btn.type="button";btn.onclick=()=>editProduct(p);
  actions.append(toggle,btn);row.append(summary,actions);root.append(row);
 }
}
function editProduct(p){
 const f=$("product-form");f.reset();f.elements.id.value=p.id;
 f.elements.name.value=p.name;f.elements.description.value=p.description;
 f.elements.category.value=p.category;f.elements.price.value=(p.price_cents/100).toFixed(2);
 f.elements.image_url.value=p.image_url||"";
 $("variant-rows").replaceChildren();(p.variants||[]).forEach(addVariantRow);
 f.elements.is_active.checked=!!p.is_active;
 $("main-preview").replaceChildren();if(p.image_url){const img=document.createElement("img");img.src=p.image_url;img.alt="Imagem principal";$("main-preview").append(img);}
 $("product-form-label").textContent="EDITANDO PRODUTO";
 f.scrollIntoView({behavior:"smooth",block:"start"});
}
function newProduct(){
 const f=$("product-form");f.reset();f.elements.id.value="";$("variant-rows").replaceChildren();addVariantRow();$("main-preview").replaceChildren();
 $("product-form-label").textContent="NOVO PRODUTO";
}
$("new-product").onclick=()=>{newProduct();$("product-form").scrollIntoView({behavior:"smooth"});};
async function loadProducts(){
 try{const r=await api("admin/products");catalog=r.products||[];renderProductList();}
 catch(e){message(e.message);}
}
$("product-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget;
 let variants=[];
 try{
  variants=[...$("variant-rows").children].map(row=>({color:row.querySelector('[data-field="color"]').value.trim(),size:row.querySelector('[data-field="size"]').value.trim(),stock:Number(row.querySelector('[data-field="stock"]').value),image_url:row.querySelector('[data-field="image"]').value.trim()}));
  if(!variants.length)throw new Error("Adicione pelo menos uma variação.");
  if(variants.some(v=>!v.color||!v.size||!Number.isInteger(v.stock)||v.stock<0))throw new Error("Preencha cor, tamanho e estoque em cada variação.");
  const price=Number(f.elements.price.value);
  if(!Number.isFinite(price))throw new Error("Preço inválido");
  const product={name:f.elements.name.value,category:f.elements.category.value,
   description:f.elements.description.value,image_url:f.elements.image_url.value,
   price_cents:Math.round(price*100),is_active:f.elements.is_active.checked,variants};
  const id=f.elements.id.value;
  await api(id?"admin/products/"+id:"admin/products",{method:id?"PATCH":"POST",body:JSON.stringify(product)});
  message("Produto salvo. Confira as variações e o estoque antes de ativar.");
  newProduct();await loadProducts();
 }catch(err){message(err.message);}
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
   try{const url=await uploadPhoto(upload.files[0]);row.querySelector('[data-field="image"]').value=url;current();message("Foto enviada com sucesso.");}
   catch(e){message(e.message);}
   finally{upload.disabled=false;upload.value="";}
 };
 imageWrap.append(preview,upload);row.append(imageWrap);
 const remove=text("button","Remover variação","outline");remove.type="button";remove.onclick=()=>row.remove();row.append(remove);
 $("variant-rows").append(row);
}
$("add-variant").onclick=()=>addVariantRow();
$("main-photo").onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 e.target.disabled=true;message("Enviando imagem principal...");
 try{const url=await uploadPhoto(f);$("product-form").elements.image_url.value=url;const preview=$("main-preview");preview.replaceChildren();const image=document.createElement("img");image.src=url;image.alt="Imagem principal";preview.append(image);message("Foto principal enviada.");}
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
checkSession();