/* SALUZ Studio: editor autenticado de conteudo, revisao e publicacao. */
(()=>{"use strict";
const fields=["top_bar","hero_title","hero_description","hero_button","hero_image_url","featured_title","new_title","featured_description","new_description","business_hours","contact_email","store_notice"];
const defaults={top_bar:"Atendimento de segunda a sexta, 8h às 19h",hero_title:"Um detalhe pode mudar tudo.",hero_description:"Descubra possibilidades para organizar, presentear e acompanhar cada momento com a delicadeza que faz sentido para você.",hero_button:"Explorar a loja",featured_title:"Produtos em destaque.",new_title:"Novidades na loja.",featured_description:"Peças selecionadas pela SALUZ para você descobrir.",new_description:"Confira os produtos publicados mais recentemente pela SALUZ.",business_hours:"Segunda a sexta, das 8h às 19h",contact_email:"anny.csalustiano@gmail.com",hero_image_url:"",store_notice:""};
let data=null,initialized=false,busy=false;
const el=id=>document.getElementById(id);
const form=()=>el("studio-form");
function read(){const f=new FormData(form());return Object.fromEntries(fields.map(key=>[key,String(f.get(key)||"").trim()]));}
function fill(obj){for(const key of fields){const input=form().elements.namedItem(key);if(input)input.value=obj[key]??defaults[key]??"";}preview();}
function preview(){if(!form())return;const v=read();const put=(id,key)=>{const target=el(id);if(target)target.textContent=v[key]||defaults[key]||"";};
 put("studio-preview-headline","hero_title");put("studio-preview-subtitle","hero_description");put("studio-preview-cta","hero_button");put("studio-preview-featured","featured_title");put("studio-preview-featured-desc","featured_description");put("studio-preview-top","top_bar");
 const art=el("studio-preview-art");if(art){if(/^https:\/\//.test(v.hero_image_url)){art.style.backgroundImage="url("+JSON.stringify(v.hero_image_url)+")";art.classList.add("has-image");}else{art.style.backgroundImage="";art.classList.remove("has-image");}}
}
const equal=(a,b)=>JSON.stringify(fields.map(k=>a[k]||""))===JSON.stringify(fields.map(k=>b[k]||""));
function status(){if(!data)return;const changed=!equal(data.draft||{},data.published||{});const local=!equal(read(),data.draft||{});
el("studio-state").textContent=local?"● Alterações não salvas":changed?"● Rascunho aguardando publicação":"● Loja sincronizada";
el("studio-version").textContent="Revisão "+data.revision+(data.published_at?" · Última publicação: "+new Date(data.published_at).toLocaleString("pt-BR"):" · Ainda não publicada pelo editor");}
function note(msg,err=false){el("studio-feedback").textContent=msg;el("studio-feedback").classList.toggle("is-error",err);}
async function call(path,opts){const res=await fetch("/api/"+path,{cache:"no-store",credentials:"same-origin",headers:{"content-type":"application/json"},...opts});const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error||"Falha ao comunicar com o servidor");return json;}
async function run(action){if(busy)return;busy=true;for(const id of ["studio-save","studio-publish","studio-discard"])el(id).disabled=true;
try{
 if(action==="publish" && !equal(read(),data.draft||{}))throw new Error("Salve o rascunho antes de publicar.");
 if(action==="discard" && !confirm("Descartar o rascunho e voltar à última versão publicada?"))return;
 const path="admin/site-content"+(action==="publish"?"/publish":action==="discard"?"/discard":"");
 const opts=action==="save"?{method:"PUT",body:JSON.stringify({revision:data.revision,draft:read()})}:{method:"POST",body:JSON.stringify({revision:data.revision})};
 const {content}=await call(path,opts);data=content;fill(data.draft||{});
 note(action==="save"?"Rascunho salvo. A loja não foi alterada.":action==="publish"?"Conteúdo publicado! Confira a loja em outra aba.":"Rascunho descartado.");
 status();
}catch(err){note(err.message,true);}finally{busy=false;for(const id of ["studio-save","studio-publish","studio-discard"])el(id).disabled=false;}
}
async function open(){if(!initialized){initialized=true;form().addEventListener("input",()=>{preview();status();});form().addEventListener("submit",e=>{e.preventDefault();run("save")});el("studio-publish").addEventListener("click",()=>run("publish"));el("studio-discard").addEventListener("click",()=>run("discard"));}
note("Carregando as configurações da loja...");
try{const response=await call("admin/site-content");data=response.content;fill(data.draft||{});status();note("Edite os campos, salve o rascunho e publique quando estiver satisfeita.");}catch(err){note("Não foi possível carregar o conteúdo: "+err.message,true);}
}
window.SaluzStudio={open};
})();