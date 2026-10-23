(() => {
const $=id=>document.getElementById(id);
const msg=(message,error=false)=>{$("message").textContent=message;$("message").classList.toggle("error",error);};
const req=async(path,opt={})=>{
 const r=await fetch("/api/"+path,{credentials:"same-origin",cache:"no-store",...opt});
 const data=await r.json().catch(()=>({error:"Resposta inválida"}));
 if(!r.ok)throw Error(data.error||"Falha HTTP "+r.status);
 return data;
};
let products=[],revision=0,draft={};
const qs={};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{
 document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x===b));
 for(const id of ["products","storage","content","orders","auth"])$("view-"+id).hidden=b.dataset.view!==id;
 if(b.dataset.view==="storage")loadStorage();if(b.dataset.view==="content")loadContent();
 if(b.dataset.view==="auth")checkAuthCapabilities();
});
async function access(){
 try{
  const r=await req("auth/me");
  if(!r.admin)throw Error("É necessário entrar no painel da SALUZ antes de acessar o laboratório.");
  $("auth-wall").hidden=true;$("workspace").hidden=false;
  await loadProducts();
 }catch(e){$("auth-wall").replaceChildren(document.createTextNode(e.message+" "));
  const a=document.createElement("a");a.href="./";a.textContent="Entrar no painel";$("auth-wall").append(a);
 }
}
function clearForm(){
 const form=$("product-form");form.reset();form.elements.id.value="";form.elements.revision.value="0";
 form.elements.color.value="Padrão";form.elements.size.value="Único";$("form-title").textContent="Cadastrar produto de teste";
}
$("clear-product").onclick=clearForm;
function fill(p){
 const f=$("product-form");
 const fields=["id","revision","name","category","description","image_url"];
 for(const k of fields)if(f.elements[k])f.elements[k].value=p[k]??"";
 f.elements.price.value=(p.price_cents/100).toFixed(2);
 f.elements.original_price.value=p.original_price_cents==null?"":(p.original_price_cents/100).toFixed(2);
 const v=p.variants?.[0]||{};
 f.elements.color.value=v.color||"Padrão";f.elements.size.value=v.size||"Único";f.elements.stock.value=v.stock||0;
 f.elements.is_active.checked=!!p.is_active;f.elements.is_featured.checked=!!p.is_featured;
 $("form-title").textContent="Editar produto de teste";
 f.scrollIntoView({behavior:"smooth",block:"start"});
}
function entry(p){
 const node=document.createElement("div");node.className="entry";
 if(p.image_url){const img=document.createElement("img");img.src=p.image_url;img.alt="Foto";node.append(img);}
 const info=document.createElement("div");info.className="entry-info";
 const name=document.createElement("strong");name.textContent=p.name;
 const details=document.createElement("small");details.textContent=p.category+" • R$ "+(p.price_cents/100).toFixed(2)+" • "+(p.is_active?"Visível no teste":"Oculto");
 info.append(name,details);node.append(info);
 const b=document.createElement("button");b.textContent="Editar";b.onclick=()=>fill(p);node.append(b);return node;
}
async function loadProducts(){
 try{const data=await req("migration-admin/products");products=data.products||[];
  $("product-list").replaceChildren(...products.map(entry));
  if(!products.length)$("product-list").textContent="O banco de homologação ainda não tem produtos.";
 }catch(e){msg(e.message,true);}
}
$("refresh-products").onclick=loadProducts;
function money(value){const n=Number(value);if(!Number.isFinite(n)||n<0)return null;return Math.round(n*100);}
$("product-form").onsubmit=async(e)=>{
 e.preventDefault();const f=e.currentTarget,p=new FormData(f),id=p.get("id");
 const price=money(p.get("price")),old=p.get("original_price")?money(p.get("original_price")):null;
 if(price===null||old!==null&&old<=price){msg("Confira os preços do produto.",true);return;}
 const draftProduct={
  revision:Number(p.get("revision")),name:p.get("name"),category:p.get("category"),description:p.get("description"),
  image_url:p.get("image_url"),price_cents:price,original_price_cents:old,
  variants:[{color:p.get("color"),size:p.get("size"),stock:Number(p.get("stock")),image_url:""}],
  is_active:p.has("is_active"),is_featured:p.has("is_featured")
 };
 const b=f.querySelector("[type=submit]");b.disabled=true;
 try{
  const data=await req("migration-admin/products"+(id?"/"+id:""),{method:id?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(draftProduct)});
  msg("Produto salvo no D1 da homologação. A loja oficial não foi alterada.");
  clearForm();await loadProducts();
 }catch(e){msg(e.message,true)}finally{b.disabled=false}
};
async function optimize(file){
 const bitmap=await createImageBitmap(file);const c=document.createElement("canvas"),scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
 c.width=Math.max(1,Math.floor(bitmap.width*scale));c.height=Math.max(1,Math.floor(bitmap.height*scale));
 c.getContext("2d").drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
 for(const q of [.82,.66,.50,.38]){
  const blob=await new Promise(resolve=>c.toBlob(resolve,"image/webp",q));
  if(blob&&blob.size<=500000)return blob;
 }
 throw Error("Imagem grande demais; escolha outra ou reduza a resolução.");
}
$("photo").onchange=async(e)=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!["image/jpeg","image/webp","image/png"].includes(file.type)){msg("Formato inválido",true);return;}
 e.target.disabled=true;msg("Otimizando e enviando foto de teste ao KV...");
 try{
  const blob=await optimize(file);
  const data=await req("migration-admin/upload",{method:"POST",headers:{"content-type":"image/webp","x-saluz-media-purpose":"product","x-saluz-filename":file.name},body:blob});
  $("product-form").elements.image_url.value=data.url;msg("Foto armazenada no KV. Salve o produto para vinculá-la.");
  await loadStorage();
 }catch(err){msg(err.message,true)}finally{e.target.disabled=false;}
};
async function loadStorage(){
 try{const data=await req("migration-admin/storage");
  $("storage-metrics").textContent=data.file_count+" arquivo(s) • "+(data.used_bytes/1024/1024).toFixed(2)+" de "+(data.quota_bytes/1024/1024).toFixed(0)+" MB internos";
  const nodes=(data.files||[]).map(f=>{
   const el=document.createElement("div");el.className="entry";
   const inf=document.createElement("div");inf.className="entry-info";
   const name=document.createElement("strong");name.textContent=f.original_name;
   const caption=document.createElement("small");caption.textContent=f.purpose+" • "+(f.byte_size/1024).toFixed(1)+" KB • "+new Date(f.uploaded_at).toLocaleDateString("pt-BR");
   inf.append(name,caption);el.append(inf);return el;
  });
  $("storage-list").replaceChildren(...nodes);if(!nodes.length)$("storage-list").textContent="Nenhum arquivo no KV da homologação.";
 }catch(e){msg(e.message,true)}
}
async function loadContent(){
 try{const d=await req("migration-admin/content");draft=d.content.draft||{};revision=d.content.revision||0;
  $("content-form").elements.hero_title.value=draft.hero_title||"";
  $("content-form").elements.hero_description.value=draft.hero_description||"";
 }catch(e){msg(e.message,true)}
}
$("content-form").onsubmit=async(e)=>{
 e.preventDefault();const f=e.currentTarget;
 try{await req("migration-admin/content",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({
 revision,draft:{...draft,hero_title:f.elements.hero_title.value,hero_description:f.elements.hero_description.value}})});
  msg("Rascunho salvo somente no D1. Não foi publicado.");await loadContent();
 }catch(err){msg(err.message,true)}
};

async function checkAuthCapabilities(){
 const form=$("d1-auth-setup"),button=form.querySelector('[type="submit"]');
 try{
  const data=await req("migration-auth/capabilities");
  if(data.kdf?.supported!==true){
   button.disabled=true;
   form.querySelectorAll('input').forEach(x=>x.disabled=true);
   authFeedback("d1-setup-feedback","O runtime Cloudflare não aceita o método de proteção de senha configurado. Esta opção foi bloqueada para sua segurança. Continue utilizando o login atual do painel até disponibilizarmos uma alternativa segura.");
   return;
  }
  button.disabled=false;
 }catch{
  button.disabled=true;
  authFeedback("d1-setup-feedback","Não foi possível verificar a segurança deste método. Cadastro temporariamente indisponível; seu login atual permanece funcionando.");
 }
}
/* A ativação D1 é um segundo acesso de TESTE, nunca autentica /api/admin.
   O painel atual continua dependendo do Supabase. */
function authFeedback(id,message){$(id).textContent=message;}
$("d1-auth-setup").onsubmit=async event=>{
 event.preventDefault();
 const form=event.currentTarget,button=form.querySelector("[type=submit]");
 const password=form.elements.password.value;
 if(password!==form.elements.confirm.value){authFeedback("d1-setup-feedback","As senhas não coincidem.");return;}
 if(password.length<14||password.length>128){authFeedback("d1-setup-feedback","Use entre 14 e 128 caracteres.");return;}
 button.disabled=true;authFeedback("d1-setup-feedback","Configurando acesso de testes...");
 try{
  await req("migration-auth/setup",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({password,confirm_reset:form.elements.confirm_reset.checked})});
  authFeedback("d1-setup-feedback","Senha Cloudflare preparada. Faça o teste de login abaixo.");
  form.reset();
 }catch(e){authFeedback("d1-setup-feedback",e.message);}
 finally{button.disabled=false;}
};
$("d1-auth-login").onsubmit=async event=>{
 event.preventDefault();
 const form=event.currentTarget,button=form.querySelector("[type=submit]");
 button.disabled=true;authFeedback("d1-login-feedback","Testando autenticação Cloudflare...");
 try{
  const r=await req("migration-auth/login",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({email:form.elements.email.value.trim(),password:form.elements.password.value})});
  form.elements.password.value="";
  authFeedback("d1-login-feedback",r.ok?"Login D1 confirmado. Esta sessão é experimental; seu painel atual permanece conectado.":"Resposta de teste inesperada.");
 }catch(e){authFeedback("d1-login-feedback",e.message);form.elements.password.value="";}
 finally{button.disabled=false;}
};
$("d1-auth-logout").onclick=async()=>{
 try{
  await req("migration-auth/logout",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  authFeedback("d1-login-feedback","Sessão D1 encerrada. A sessão atual do painel continua independente.");
 }catch(e){authFeedback("d1-login-feedback",e.message);}
};

access();
})();