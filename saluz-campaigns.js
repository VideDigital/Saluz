/* SALUZ: campanhas, banners e ofertas. Nenhuma criacao de paginas, nenhum HTML do cliente. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const hrefs=new Set(["./loja.html","./colecoes.html","./colecao-necessaires.html",
    "./colecao-porta-joias.html","./colecao-organizadores-maquiagem.html","./colecao-organizadores-bolsa.html",
    "./colecao-acessorios-viagem.html","./colecao-acessorios-femininos.html",
    "./colecao-autocuidado.html","./colecao-kits-presentes.html","./atendimento.html"]);
  const locations={
    home_after_hero:"Início · após o topo",home_before_featured:"Início · antes dos destaques",
    home_before_new:"Início · antes das novidades",home_bottom:"Início · final da página",
    catalog_after_hero:"Loja · após o topo",catalog_before_products:"Loja · antes dos produtos",
    catalog_bottom:"Loja · final do catálogo"
  };
  const maxBanners=24;
  const money=cents=>(Number(cents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const node=(tag,cl,content)=>{
    const el=document.createElement(tag);if(cl)el.className=cl;if(content!==undefined)el.textContent=String(content);return el;
  };
  const form=()=>$("campaign-banner-form");
  let initialized=false,doc=null,banners=[],editing=null,formDirty=false,busy=false;
  let activeView="banners",offers=[],offersPage=0,moreOffers=true,offersLoading=false;
  function setFeedback(message,error=false,id="campaign-feedback"){
    const target=$(id);if(!target)return;
    target.textContent=message;target.classList.toggle("is-error",error);
  }
  const validUrl=value=>!value||/^https:\/\/[^\s<>"']+$/i.test(value);
  function localDate(value){
    if(!value)return "";
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return "";
    const pad=x=>String(x).padStart(2,"0");
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
  }
  function utcDate(value){
    if(!value)return "";
    const result=new Date(value);
    if(!Number.isFinite(result.getTime()))throw Error("Confira as datas de início e fim.");
    return result.toISOString();
  }
  function blank(){
    return {id:crypto.randomUUID(),placement:"home_before_featured",style:"editorial",
      eyebrow:"ESCOLHAS SALUZ",title:"",description:"",button_label:"Ver produtos",link:"./loja.html",
      image_url:"",mobile_image_url:"",active:false,starts_at:"",ends_at:""};
  }
  function clean(input){
    return {id:String(input.id||""),placement:String(input.placement||"home_before_featured"),
      style:String(input.style||"editorial"),eyebrow:String(input.eyebrow||""),
      title:String(input.title||""),description:String(input.description||""),
      button_label:String(input.button_label||""),
      link:String(input.link||"./loja.html"),image_url:String(input.image_url||""),
      mobile_image_url:String(input.mobile_image_url||""),active:input.active===true,
      starts_at:String(input.starts_at||""),ends_at:String(input.ends_at||"")};
  }
  function fromLegacy(values){
    if(Array.isArray(values?.banners))return values.banners.map(clean);
    if(values?.promo_enabled!=="yes"||!values.promo_title)return [];
    return [{...blank(),title:values.promo_title,description:values.promo_description||"",
      button_label:values.promo_button||"Ver produtos",link:hrefs.has(values.promo_link)?
        values.promo_link:"./loja.html",image_url:values.promo_image_url||"",active:true}];
  }
  function dataDifferent(){
    const stored=Array.isArray(doc?.draft?.banners)?doc.draft.banners:[];
    return JSON.stringify(banners.map(clean))!==JSON.stringify(stored.map(clean)) ||
      (doc?.draft?.promo_enabled==="yes" && !Array.isArray(doc?.draft?.banners));
  }
  function publishedDifferent(){
    return JSON.stringify((doc?.draft?.banners||[]).map(clean))!==JSON.stringify((doc?.published?.banners||[]).map(clean)) ||
      doc?.draft?.promo_enabled!==doc?.published?.promo_enabled;
  }
  function state(){
    const label=$("campaign-state"),counter=$("campaign-count");
    if(!label||!doc)return;
    counter.textContent=banners.length+" de "+maxBanners;
    label.textContent=formDirty?"● Edição não salva":
      dataDifferent()?"● Alterações pendentes":
      publishedDifferent()?"● Rascunho salvo, ainda não publicado":
      !banners.length?"Nenhum banner criado":"✓ Alterações publicadas";
    $("campaign-last-publish").textContent=doc.published_at?
      "Última publicação: "+new Date(doc.published_at).toLocaleString("pt-BR"):
      "Nenhum banner publicado pelo editor";
    $("campaign-save").disabled=busy||formDirty||!dataDifferent();
    $("campaign-publish").disabled=busy||formDirty||dataDifferent()||!publishedDifferent();
    $("campaign-discard").disabled=busy||(!dataDifferent()&&!publishedDifferent()&&!formDirty);
    $("campaign-apply").disabled=busy;
    $("campaign-new").disabled=busy||banners.length>=maxBanners;
    for(const file of document.querySelectorAll("[data-market-upload]"))file.disabled=busy;
  }
  function readEditor(){
    const data=new FormData(form());
    const item={
      id:String(data.get("id")||editing||crypto.randomUUID()),placement:String(data.get("placement")||""),
      style:String(data.get("style")||"editorial"),eyebrow:String(data.get("eyebrow")||"").trim(),
      title:String(data.get("title")||"").trim(),description:String(data.get("description")||"").trim(),
      button_label:String(data.get("button_label")||"").trim(),link:String(data.get("link")||""),
      image_url:String(data.get("image_url")||"").trim(),mobile_image_url:String(data.get("mobile_image_url")||"").trim(),
      active:data.get("active")==="on",starts_at:utcDate(String(data.get("starts_at")||"")),
      ends_at:utcDate(String(data.get("ends_at")||""))
    };
    if(!item.title)throw Error("Informe o título do banner.");
    if(!hrefs.has(item.link))throw Error("Escolha um link que já existe na SALUZ.");
    if(!validUrl(item.image_url)||!validUrl(item.mobile_image_url))throw Error("Foto inválida. Use uma URL HTTPS.");
    if(item.starts_at&&item.ends_at&&Date.parse(item.ends_at)<=Date.parse(item.starts_at))
      throw Error("A data final deve ser posterior à data inicial.");
    return item;
  }
  function preview(){
    if(!form())return;
    const data=new FormData(form());
    const set=(id,value)=>{$(id).textContent=String(value||"");};
    set("campaign-preview-eyebrow",data.get("eyebrow")||"SALUZ");
    set("campaign-preview-title",data.get("title")||"Sua nova campanha");
    set("campaign-preview-description",data.get("description")||"Adicione uma descrição para o banner.");
    set("campaign-preview-button",(data.get("button_label")||"Ver produtos")+" ↗");
    const url=String(data.get("image_url")||"");
    const visual=$("campaign-preview-image");
    visual.style.backgroundImage=validUrl(url)&&url?"url("+JSON.stringify(url)+")":"";
    visual.classList.toggle("has-image",!!visual.style.backgroundImage);
  }
  function edit(record){
    const b=clean(record);
    editing=b.id;form().hidden=false;
    for(const [key,value] of Object.entries(b)){
      const input=form().elements.namedItem(key);
      if(!input)continue;
      if(input.type==="checkbox")input.checked=!!value;
      else input.value=key==="starts_at"||key==="ends_at"?localDate(value):value;
    }
    $("campaign-editor-title").textContent=banners.some(x=>x.id===b.id)?"Editar banner":"Criar banner";
    $("campaign-editor-caption").textContent=locations[b.placement]||"BANNER";
    $("campaign-copy").hidden=!banners.some(x=>x.id===b.id);
    $("campaign-delete").hidden=$("campaign-copy").hidden;
    formDirty=false;
    renderList();preview();state();
  }
  function dateStatus(b){
    if(!b.active)return "Desativado";
    const now=Date.now();
    if(b.ends_at&&Date.parse(b.ends_at)<=now)return "Encerrado";
    if(b.starts_at&&Date.parse(b.starts_at)>now)return "Programado";
    return "Ativo";
  }
  function renderList(){
    const root=$("campaign-list");root.replaceChildren();
    if(!banners.length){
      const empty=node("div","market-empty");
      empty.append(node("strong","","Nenhum banner cadastrado"),node("p","","Crie seu primeiro banner e escolha onde ele vai aparecer."));
      root.append(empty);return;
    }
    banners.forEach((b,i)=>{
      const card=node("article","market-list-card"+(editing===b.id?" is-selected":""));
      const main=node("button","market-list-open");main.type="button";
      const thumb=node("div","market-list-thumb");
      if(validUrl(b.image_url)&&b.image_url){thumb.style.backgroundImage="url("+JSON.stringify(b.image_url)+")";thumb.classList.add("has-image");}
      else thumb.textContent="✦";
      const info=node("div","market-list-info");
      info.append(node("strong","",b.title||"Banner sem título"),
        node("small","",locations[b.placement]||"Local não definido"));
      const tag=node("span","market-list-tag is-"+dateStatus(b).toLowerCase(),dateStatus(b));
      info.append(tag);
      main.append(thumb,info);
      main.addEventListener("click",()=>{
        if(formDirty&&!confirm("Descartar a edição ainda não guardada neste formulário?"))return;
        edit(b);
      });
      const actions=node("div","market-list-order");
      for(const [label,delta] of [["↑",-1],["↓",1]]){
        const button=node("button","",label);
        button.type="button";button.title=delta===-1?"Mover para cima":"Mover para baixo";
        button.setAttribute("aria-label",button.title+": "+b.title);
        button.disabled=i+delta<0||i+delta>=banners.length||busy;
        button.addEventListener("click",()=>{
          if(formDirty){setFeedback("Guarde a edição atual antes de organizar a lista.",true);return;}
          const j=i+delta;
          [banners[i],banners[j]]=[banners[j],banners[i]];
          renderList();state();
          setFeedback("Ordem alterada. Salve o rascunho para confirmar.");
        });
        actions.append(button);
      }
      card.append(main,actions);root.append(card);
    });
  }
  async function apply(event){
    event.preventDefault();
    if(busy)return;
    try{
      const item=readEditor();
      const index=banners.findIndex(x=>x.id===item.id);
      if(index<0){
        if(banners.length>=maxBanners)throw Error("Você já atingiu o limite de 24 banners.");
        banners.push(item);
      }else banners[index]=item;
      formDirty=false;edit(item);
      // No staging D1, um clique valida e salva o rascunho no banco.
      // Publicação continua SEMPRE separada. Produção mantém o fluxo anterior.
      if(typeof saluzD1AdminPreview!=="undefined"&&saluzD1AdminPreview){
        if(dataDifferent())await execute("save");
        else setFeedback("O banner já está salvo. Ele só aparece depois de publicar.");
      }else{
        setFeedback("Banner guardado na lista. Clique em Salvar rascunho e depois em Publicar na loja.");
      }
    }catch(error){setFeedback(error.message,true);}
  }
  async function request(path,options={}){
    // Homologação: editores e preços no mesmo D1 da vitrine.
    // Nenhum fallback ao Supabase caso a API D1 falhe.
    const preview=typeof saluzD1AdminPreview!=="undefined"&&saluzD1AdminPreview;
    if(preview&&/^admin\/site-content(?:\/|$)/.test(path))
      path=path.replace(/^admin\/site-content/,"migration-admin/content");
    if(preview&&/^admin\/products(?:\/|\?|$)/.test(path))
      path=path.replace(/^admin\/products/,"migration-admin/products");

    const r=await fetch("/api/"+path,{...options,cache:"no-store",credentials:"same-origin",
      headers:{"content-type":"application/json"}});
    await ensureAdminResponse(r);
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||"Não foi possível conectar ao sistema.");
    return data;
  }
  function syncPublished(data){
    doc=data;
    banners=fromLegacy(doc.draft);
    formDirty=false;
    edit(banners[0]||blank());
    state();
  }
  async function reload(){
    const {content}=await request("admin/site-content");
    if(!content)throw Error("Não foi possível carregar as configurações.");
    syncPublished(content);
    setFeedback(banners.length?"Seus banners foram carregados.":"Crie seu primeiro banner para começar.");
  }
  async function execute(action){
    if(busy||!doc)return;
    if(formDirty){setFeedback("Clique em Guardar na lista antes de salvar ou publicar.",true);return;}
    if(action==="save"&&!dataDifferent()){setFeedback("Não há alterações pendentes para salvar.");return;}
    if(action==="publish"&&dataDifferent()){setFeedback("Salve o rascunho antes de publicar.",true);return;}
    if(action==="publish"&&!confirm("Publicar os banners da loja? As mudanças de aparência que estiverem salvas no mesmo rascunho também serão publicadas."))return;
    if(action==="discard"&&!confirm("Descartar TODOS os rascunhos de banners e aparência ainda não publicados?"))return;
    busy=true;state();
    try{
      const path="admin/site-content"+(action==="publish"?"/publish":action==="discard"?"/discard":"");
      const options=action==="save"?{method:"PUT",body:JSON.stringify({revision:doc.revision,
        draft:{...doc.draft,banners, promo_enabled:"no"}})}:
        {method:"POST",body:JSON.stringify({revision:doc.revision})};
      const {content}=await request(path,options);
      syncPublished(content);
      setFeedback(action==="save"?"Rascunho salvo com sucesso. Falta clicar em Publicar na loja.":
        action==="publish"?"Campanhas publicadas. Confira a loja em outra aba.":"Rascunho descartado. A publicação anterior continua na loja.");
    }catch(error){
      setFeedback(error.message,true);
      if(error.message.includes("desatualizada"))setFeedback("Outra alteração foi feita neste painel. Copie suas mudanças, recarregue e tente novamente.",true);
    }finally{busy=false;state();}
  }
  async function upload(event){
    const input=event.currentTarget,file=input.files?.[0];
    if(!file)return;
    input.value="";
    if(busy)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
      setFeedback("Envie JPG, PNG ou WebP de até 5 MB.",true);return;
    }
    busy=true;state();setFeedback("Enviando imagem...");
    try{
      if(typeof uploadPhoto!=="function")throw Error("Serviço de imagens indisponível.");
      const url=await uploadPhoto(file);
      const field=form().elements.namedItem(input.dataset.marketUpload);
      if(!field)throw Error("Campo de imagem inválido");
      field.value=url;formDirty=true;preview();
      setFeedback(typeof saluzD1AdminPreview!=="undefined"&&saluzD1AdminPreview
        ?"Foto enviada. Clique em Salvar rascunho para guardar a alteração."
        :"Foto enviada. Clique em Guardar na lista para salvar esta alteração.");
    }catch(error){setFeedback(error.message,true);}
    finally{busy=false;state();}
  }
  function newBanner(){
    if(banners.length>=maxBanners){setFeedback("Limite de 24 banners atingido.",true);return;}
    if(formDirty&&!confirm("Descartar alterações que ainda não foram guardadas?"))return;
    edit(blank());
  }
  function duplicate(){
    if(banners.length>=maxBanners){setFeedback("Limite de banners atingido.",true);return;}
    if(formDirty){setFeedback("Guarde o banner antes de duplicar.",true);return;}
    const current=banners.find(x=>x.id===editing);if(!current)return;
    const cloned={...current,id:crypto.randomUUID(),title:current.title.slice(0,83)+" (cópia)",active:false,
      starts_at:"",ends_at:""};
    banners.splice(banners.indexOf(current)+1,0,cloned);edit(cloned);
    setFeedback("Cópia criada e desativada. Edite e salve antes de publicar.");
  }
  function remove(){
    const current=banners.find(x=>x.id===editing);if(!current)return;
    if(!confirm("Excluir o banner "+current.title+" do rascunho? A loja só muda quando você publicar."))return;
    banners=banners.filter(x=>x.id!==editing);edit(banners[0]||blank());
    setFeedback("Banner removido da lista. Salve o rascunho e publique para confirmar.");
  }
  function setView(next){
    activeView=next;
    document.querySelectorAll("[data-campaign-view]").forEach(b=>{
      const on=b.dataset.campaignView===next;b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));
    });
    document.querySelectorAll("[data-market-view]").forEach(section=>section.hidden=section.dataset.marketView!==next);
    if(next==="offers"&&!offersPage)loadOffers();
  }
  function dealFilter(p){
    const q=String($("offers-search").value||"").trim().toLocaleLowerCase("pt-BR");
    const filter=$("offers-filter").value;
    if(q&&!(p.name+" "+p.category).toLocaleLowerCase("pt-BR").includes(q))return false;
    if(filter==="offers"&&!(Number(p.original_price_cents)>p.price_cents))return false;
    if(filter==="available"&&!p.is_active)return false;
    if(filter==="hidden"&&p.is_active)return false;
    return true;
  }
  function offerCard(product){
    const p=product;
    const card=node("article","market-offer-card");
    const photo=node("div","market-offer-photo");
    const image=p.image_url||p.variants?.find(v=>v.image_url)?.image_url;
    if(validUrl(image)&&image){const img=node("img");img.src=image;img.loading="lazy";img.alt="Foto de "+p.name;photo.append(img);}
    else photo.textContent="✦";
    const main=node("div","market-offer-info");
    main.append(node("strong","",p.name),node("small","",p.category));
    const sale=Number(p.original_price_cents)>p.price_cents;
    const price=node("div","market-offer-price");
    if(sale)price.append(node("s","",money(p.original_price_cents)));
    price.append(node("b","",money(p.price_cents)));
    main.append(price);
    const badges=node("div","market-offer-tags");
    badges.append(node("span","market-tag"+(sale?" is-sale":""),sale?"Em oferta":"Preço normal"));
    if(!p.is_active)badges.append(node("span","market-tag is-hidden","Oculto na loja"));
    main.append(badges);
    const actions=node("div","market-offer-actions");
    const edit=node("button","outline",sale?"Editar oferta":"Criar oferta");edit.type="button";
    const panel=node("form","market-offer-edit");panel.hidden=true;
    panel.append(node("p","market-offer-help","Use um preço anterior real. O desconto será mostrado no produto e nas vitrines."));
    const fields=node("div","market-form-grid");
    const label=(caption,amount,name)=>{
      const l=node("label","",caption);
      const input=node("input");input.type="number";input.min="0.01";input.max="500000";input.step="0.01";
      input.name=name;input.required=true;input.value=amount.toFixed(2);l.append(input);return l;
    };
    fields.append(label("Preço normal (R$)",Number(sale?p.original_price_cents:p.price_cents)/100,"normal"),
      label("Preço em promoção (R$)",Number(p.price_cents)/100,"discount"));
    const featured=node("label","market-checkbox");
    const flag=node("input");flag.type="checkbox";flag.name="featured";flag.checked=!!p.is_featured;
    featured.append(flag,node("span","","Destacar o produto na página inicial"));
    const note=node("p","market-offer-note",p.is_active?
      "Ao salvar, a oferta aparece na loja imediatamente.":"Este produto está oculto: a oferta só será vista quando você ativá-lo em Produtos.");
    const submit=node("button","primary","Salvar oferta");submit.type="submit";
    const cancel=node("button","outline","Cancelar");cancel.type="button";cancel.onclick=()=>{panel.hidden=true;edit.disabled=false;};
    const foot=node("div","market-offer-foot");foot.append(submit,cancel);
    panel.append(fields,featured,note,foot);
    panel.addEventListener("submit",async event=>{
      event.preventDefault();
      if(offersLoading)return;
      const normal=Number(panel.elements.normal.value),discount=Number(panel.elements.discount.value);
      if(!Number.isFinite(normal)||!Number.isFinite(discount)||normal<=0||discount<=0||
        discount>=normal||normal>500000||discount>500000){
        setFeedback("O preço promocional deve ser maior que zero e menor que o preço normal.",true,"offers-feedback");
        return;
      }
      const payload={...p,price_cents:Math.round(discount*100),
        original_price_cents:Math.round(normal*100),is_featured:flag.checked};
      await updateOffer(p,payload,submit);
    });
    edit.onclick=()=>{panel.hidden=false;edit.disabled=true;panel.elements.normal.focus();};
    actions.append(edit);
    if(sale){
      const end=node("button","market-end-offer","Encerrar oferta");end.type="button";
      end.onclick=async()=>{
        if(!confirm("Encerrar esta oferta e restaurar o preço anterior de "+p.name+"?"))return;
        const payload={...p,price_cents:p.original_price_cents,original_price_cents:null};
        await updateOffer(p,payload,end);
      };
      actions.append(end);
    }
    card.append(photo,main,actions,panel);
    return card;
  }
  async function updateOffer(product,payload,button){
    button.disabled=true;setFeedback("Salvando oferta... ",false,"offers-feedback");
    try{
      const result=await request("admin/products/"+encodeURIComponent(product.id),
        {method:"PATCH",body:JSON.stringify(payload)});
      if(!result.product)throw Error("Produto não encontrado. Atualize a lista.");
      const index=offers.findIndex(x=>x.id===product.id);
      if(index>=0)offers[index]=result.product;
      renderOffers();setFeedback("Oferta atualizada. Os preços foram salvos no produto.",false,"offers-feedback");
    }catch(error){setFeedback(error.message,true,"offers-feedback");}
    finally{button.disabled=false;}
  }
  function renderOffers(){
    const root=$("offers-list");root.replaceChildren();
    const items=offers.filter(dealFilter);
    $("offers-summary").textContent=offers.length+" produto(s) carregado(s) · "+
      offers.filter(p=>Number(p.original_price_cents)>p.price_cents).length+" em oferta"+
      (moreOffers?" · Há mais produtos para carregar":"");
    if(!items.length){
      root.append(node("p","market-empty","Nenhum produto corresponde aos filtros escolhidos."));
    }else for(const item of items)root.append(offerCard(item));
    $("offers-load-more").hidden=!moreOffers||offersLoading;
  }
  async function loadOffers(reset=false){
    if(offersLoading)return;
    offersLoading=true;$("offers-load-more").disabled=true;
    if(reset){offers=[];offersPage=0;moreOffers=true;}
    setFeedback("Buscando produtos...",false,"offers-feedback");
    try{
      if(!moreOffers)return;
      const data=await request("admin/products?page="+(offersPage+1));
      const existing=new Set(offers.map(p=>p.id));
      offers.push(...(data.products||[]).filter(p=>!existing.has(p.id)));
      offersPage++;moreOffers=data.has_more===true;
      renderOffers();setFeedback("Produtos carregados. Você pode gerenciar cada oferta aqui.",false,"offers-feedback");
    }catch(error){setFeedback(error.message,true,"offers-feedback");}
    finally{offersLoading=false;$("offers-load-more").disabled=false;$("offers-load-more").hidden=!moreOffers;}
  }
  async function open(){
    if(!initialized){
      initialized=true;
      form().addEventListener("submit",apply);
      form().addEventListener("input",()=>{formDirty=true;preview();state();});
      form().addEventListener("change",event=>{
        if(event.target.matches('input[type=file]'))return;
        formDirty=true;preview();state();
      });
      for(const file of document.querySelectorAll("[data-market-upload]"))file.addEventListener("change",upload);
      $("campaign-new").addEventListener("click",newBanner);
      $("campaign-copy").addEventListener("click",duplicate);
      $("campaign-delete").addEventListener("click",remove);
      $("campaign-editor-close").addEventListener("click",()=>{
        if(formDirty&&!confirm("Fechar sem guardar estas alterações?"))return;
        form().hidden=true;formDirty=false;state();
      });
      $("campaign-save").addEventListener("click",()=>execute("save"));
      $("campaign-publish").addEventListener("click",()=>execute("publish"));
      $("campaign-discard").addEventListener("click",()=>execute("discard"));
      for(const b of document.querySelectorAll("[data-campaign-view]"))b.addEventListener("click",()=>setView(b.dataset.campaignView));
      $("offers-refresh").addEventListener("click",()=>loadOffers(true));
      $("offers-load-more").addEventListener("click",()=>loadOffers());
      $("offers-search").addEventListener("input",renderOffers);
      $("offers-filter").addEventListener("change",renderOffers);
    }
    if(doc && (dataDifferent()||formDirty)){state();return;}
    try{await reload();}catch(error){setFeedback("Erro ao carregar campanhas: "+error.message,true);}
  }
  window.SaluzCampaigns={open};
})();
