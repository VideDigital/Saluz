/* SALUZ / Editor simples de banners, vitrine e contato. Apenas areas existentes da loja. */
(() => {
  "use strict";
  const keys = [
    "top_bar","hero_title","hero_description","hero_button","hero_link","hero_image_url",
    "featured_title","featured_description","new_title","new_description",
    "business_hours","contact_email","whatsapp_number","instagram_url","store_notice",
    "moment_label","moment_title","moment_image_url",
    "moment_link1_title","moment_link1_href","moment_link2_title","moment_link2_href",
    "moment_link3_title","moment_link3_href","moment_link4_title","moment_link4_href",
    "gift_label","gift_title","gift_description","gift_image_url","gift_button","gift_link",
    "kits_title","kit1_title","kit1_description","kit1_link",
    "kit2_title","kit2_description","kit2_link",
    "kit3_title","kit3_description","kit3_link"
  ];
  const defaults = {
    top_bar:"Atendimento de segunda a sexta, 8h às 19h",
    hero_title:"Um detalhe pode mudar tudo.",
    hero_description:"Descubra possibilidades para organizar, presentear e acompanhar cada momento com a delicadeza que faz sentido para você.",
    hero_button:"Explorar a loja",hero_link:"./loja.html",hero_image_url:"",
    promo_enabled:"no",promo_title:"Novidades para sua rotina",
    promo_description:"Descubra nossa seleção especial.",promo_button:"Ver coleção",
    promo_link:"./loja.html",promo_image_url:"",
    featured_title:"Produtos em destaque.",featured_description:"Peças selecionadas pela SALUZ para você descobrir.",
    new_title:"Novidades na loja.",new_description:"Confira os produtos publicados mais recentemente pela SALUZ.",
    business_hours:"Segunda a sexta, das 8h às 19h",contact_email:"anny.csalustiano@gmail.com",
    whatsapp_number:"",instagram_url:"",store_notice:"",
    moment_label:"COMPRE PELO MOMENTO",moment_title:"Pequenos rituais. Grandes diferenças.",moment_image_url:"",
    moment_link1_title:"Organizar minha bolsa",moment_link1_href:"./colecao-organizadores-bolsa.html",
    moment_link2_title:"Preparar uma viagem",moment_link2_href:"./colecao-acessorios-viagem.html",
    moment_link3_title:"Organizar minha maquiagem",moment_link3_href:"./colecao-organizadores-maquiagem.html",
    moment_link4_title:"Melhorar minha rotina",moment_link4_href:"./colecao-autocuidado.html",
    gift_label:"PRESENTES SALUZ",gift_title:"Presentear também é cuidar.",
    gift_description:"Kits, embalagem e curadoria pensados para transformar a escolha em experiência.",
    gift_image_url:"",gift_button:"Descobrir presentes",gift_link:"#kits",
    kits_title:"Escolhas prontas para momentos reais.",
    kit1_title:"Nova Rotina",kit1_description:"Uma curadoria para começar pequenas mudanças de organização e cuidado.",
    kit1_link:"./colecao-kits-presentes.html",
    kit2_title:"Organização",kit2_description:"Itens que funcionam juntos para deixar cada coisa no seu lugar.",
    kit2_link:"./colecao-kits-presentes.html",
    kit3_title:"Presente para Ela",kit3_description:"Uma seleção pensada para presentear com intenção e apresentação.",
    kit3_link:"./colecao-kits-presentes.html"
  };
  const el=id=>document.getElementById(id);
  const form=()=>el("studio-form");
  const normalize=object=>Object.fromEntries(keys.map(key=>[key,String(object?.[key]??defaults[key]??"")]));
  let stored=null,loaded=false,busy=false;
  const getForm=()=>{
    const data=new FormData(form());
    return Object.fromEntries(keys.map(key=>[key,String(data.get(key)||"").trim()]));
  };
  const same=(a,b)=>keys.every(key=>normalize(a)[key]===normalize(b)[key]);
  function feedback(message,kind=""){const node=el("studio-feedback");node.textContent=message;node.classList.toggle("is-error",kind==="error");}
  function fill(values){
    const normalized=normalize(values);
    for(const key of keys){const field=form()?.elements.namedItem(key);if(field)field.value=normalized[key];}
    preview();
  }
  function preview(){
    if(!form())return;
    const v=getForm(),set=(id,key)=>{const n=el(id);if(n)n.textContent=v[key]||defaults[key]||"";};
    set("studio-preview-headline","hero_title");
    set("studio-preview-subtitle","hero_description");
    set("studio-preview-cta","hero_button");
    set("studio-preview-featured","featured_title");
    set("studio-preview-featured-desc","featured_description");
    set("studio-preview-top","top_bar");
    const art=el("studio-preview-art");
    if(art){
      art.style.backgroundImage=/^https:\/\//.test(v.hero_image_url)?"url("+JSON.stringify(v.hero_image_url)+")":"";
      art.classList.toggle("has-image",!!art.style.backgroundImage);
    }
    const promo=el("studio-preview-promo");
    promo.hidden=v.promo_enabled!=="yes";
    set("studio-preview-promo-title","promo_title");
    set("studio-preview-promo-desc","promo_description");
    set("studio-preview-promo-cta","promo_button");
    const promoArt=el("studio-preview-promo-art");
    promoArt.style.backgroundImage=/^https:\/\//.test(v.promo_image_url)?"url("+JSON.stringify(v.promo_image_url)+")":"";
  }
  function status(){
    if(!stored)return;
    const unsaved=!same(getForm(),stored.draft);
    const unpublished=!same(stored.draft,stored.published)||JSON.stringify(stored.draft?.banners||[])!==JSON.stringify(stored.published?.banners||[]);
    el("studio-state").textContent=unsaved?"● Você tem mudanças para salvar":
      unpublished?"● Rascunho salvo, ainda não publicado":"✓ Tudo salvo";
    el("studio-version").textContent=stored.published_at?
      "Publicado em "+new Date(stored.published_at).toLocaleDateString("pt-BR"):
      "Sem alterações publicadas pelo editor";
    el("studio-publish").disabled=busy||unsaved||!unpublished;
    el("studio-save").disabled=busy||!unsaved;
    el("studio-discard").disabled=busy||!unpublished;
  }
  async function request(path,options={}){
    const response=await fetch("/api/"+path,{
      ...options,headers:{"content-type":"application/json"},
      credentials:"same-origin",cache:"no-store"
    });
    await ensureAdminResponse(response);
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Não foi possível salvar. Tente novamente.");
    return data;
  }
  async function act(action){
    if(busy||!stored)return;
    const edited=getForm();
    if(action==="publish"){
      if(!same(edited,stored.draft)){feedback("Salve o rascunho antes de publicar.","error");return;}
      if(!confirm("Publicar estas mudanças para as clientes da loja agora?"))return;
    }
    if(action==="discard"&&!confirm("Descartar o rascunho e voltar à última versão publicada?"))return;
    busy=true;status();
    try{
      const url="admin/site-content"+(action==="publish"?"/publish":action==="discard"?"/discard":"");
      const options=action==="save"?
        {method:"PUT",body:JSON.stringify({revision:stored.revision,draft:{...stored.draft,...edited}})}:
        {method:"POST",body:JSON.stringify({revision:stored.revision})};
      const {content}=await request(url,options);
      stored=content;
      fill(stored.draft);
      feedback(action==="save"?"Rascunho salvo. Agora clique em Publicar mudanças para atualizar a loja.":
        action==="publish"?"Mudanças publicadas! Abra a loja para conferir.":
        "Rascunho desfeito. A loja não foi alterada.");
    }catch(error){feedback(error.message,"error");}
    finally{busy=false;status();}
  }
  function changePanel(section){
    for(const button of document.querySelectorAll("[data-studio-section]")){
      const active=button.dataset.studioSection===section;
      button.classList.toggle("selected",active);
      button.setAttribute("aria-pressed",String(active));
    }
    for(const panel of document.querySelectorAll("[data-studio-panel]"))panel.hidden=panel.dataset.studioPanel!==section;
  }
  async function uploadImage(input){
    const file=input.files?.[0];
    if(!file)return;
    if(busy)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
      feedback("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.","error");input.value="";return;
    }
    busy=true;input.disabled=true;status();
    feedback("Enviando foto...");
    try{
      // uploadPhoto() pertence ao arquivo admin.js; a autenticacao permanece no servidor.
      if(typeof uploadPhoto!=="function")throw new Error("Envio de fotos indisponível.");
      const url=await uploadPhoto(file);
      const name=input.dataset.studioUpload;
      if(!["hero_image_url","promo_image_url","moment_image_url","gift_image_url"].includes(name))throw new Error("Campo de imagem não autorizado.");
      const field=form().elements.namedItem(name);
      field.value=url;
      preview();
      feedback("Foto enviada! Salve o rascunho e publique para mostrar no site.");
    }catch(error){feedback(error.message,"error");}
    finally{busy=false;input.disabled=false;input.value="";status();}
  }
  function init(){
    const links=[
      ["Todos os produtos","./loja.html"],["Todas as coleções","./colecoes.html"],
      ["Nécessaires","./colecao-necessaires.html"],["Porta-joias","./colecao-porta-joias.html"],
      ["Organizadores de maquiagem","./colecao-organizadores-maquiagem.html"],
      ["Organizadores de bolsa","./colecao-organizadores-bolsa.html"],
      ["Acessórios de viagem","./colecao-acessorios-viagem.html"],
      ["Acessórios femininos","./colecao-acessorios-femininos.html"],
      ["Autocuidado","./colecao-autocuidado.html"],["Kits e presentes","./colecao-kits-presentes.html"],
      ["Atendimento","./atendimento.html"]
    ];
    for(const field of document.querySelectorAll("[data-saluz-link-choice]")){
      const choices=field.dataset.saluzLinkChoice==="gift"?[["Ver os kits desta página","#kits"],...links]:links;
      for(const [label,href] of choices){const option=document.createElement("option");
        option.value=href;option.textContent=label;field.append(option);}
    }
    form().addEventListener("input",()=>{preview();status();});
    form().addEventListener("change",()=>{preview();status();});
    form().addEventListener("submit",e=>{e.preventDefault();act("save");});
    el("studio-publish").addEventListener("click",()=>act("publish"));
    el("studio-discard").addEventListener("click",()=>act("discard"));
    for(const b of document.querySelectorAll("[data-studio-section]"))
      b.addEventListener("click",()=>changePanel(b.dataset.studioSection));
    for(const file of document.querySelectorAll("[data-studio-upload]"))
      file.addEventListener("change",()=>uploadImage(file));
    changePanel("principal");
  }
  async function open(){
    if(!form())return;
    if(!loaded){init();loaded=true;}
    if(stored && !same(getForm(),stored.draft)){status();return;}
    stored=null;
    feedback("Carregando suas configurações...");
    for(const id of ["studio-save","studio-publish","studio-discard"])el(id).disabled=true;
    try{
      const {content}=await request("admin/site-content");
      stored=content;
      fill(stored.draft);
      status();
      feedback("Escolha uma área acima e faça as alterações que desejar.");
    }catch(error){feedback("Não foi possível abrir o editor: "+error.message,"error");}
  }
  window.SaluzStudio={open};
})();
