/* SALUZ — Editor de banners simplificado.
   Atua apenas na homologação D1. Reorganiza campos existentes: não apaga
   informação, não cria banners fictícios e não faz requisições.
 */
(()=>{
 "use strict";
 if(location.hostname!=="homologacao.saluz-admin.pages.dev"||
   typeof saluzD1AdminPreview==="undefined"||!saluzD1AdminPreview)return;
 const root=document.getElementById("tab-campaigns");
 const form=document.getElementById("campaign-banner-form");
 if(!root||!form||form.dataset.simpleEditor==="1")return;
 const actions=form.querySelector(".market-editor-actions");
 const head=form.querySelector(".market-form-head");
 const preview=form.querySelector(".market-preview");
 const schedule=form.querySelector(".market-schedule");
 const field=name=>form.elements.namedItem(name)?.closest("label");
 const upload=name=>form.querySelector('[data-market-upload="'+name+'"]')?.closest("label");
 const required=["title","placement","link","active","style","eyebrow","description",
   "button_label","image_url","mobile_image_url"];
 if(!actions||!head||!preview||!schedule||required.some(name=>!field(name))||
    !upload("image_url")||!upload("mobile_image_url"))return;
 form.dataset.simpleEditor="1";
 root.classList.add("saluz-campaigns-simple");
 const el=(tag,cls,label)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(label!==undefined)e.textContent=label;return e;
 };
 const easy=el("section","market-easy-content");
 easy.setAttribute("aria-label","Informações principais do banner");
 const intro=el("div","market-easy-intro");
 intro.append(el("span","market-easy-kicker","COMECE AQUI"),
   el("h4","","Informações principais"),
   el("p","","Título, imagem e local de exibição. O restante é opcional."));
 easy.append(intro);
 const title=field("title");
 title.classList.add("market-title-field");
 title.firstChild.textContent="Título do banner";
 title.append(el("small","market-field-hint","Ex.: Presentes para surpreender"));
 easy.append(title);
 const image=el("section","market-easy-image");
 image.append(el("strong","","Imagem do banner"),el("p","","Escolha uma foto. Você verá o resultado na prévia."));
 const mainUpload=upload("image_url");
 mainUpload.classList.add("market-main-upload");
 image.append(mainUpload);
 easy.append(image);
 const row=el("div","market-form-grid market-easy-row");
 const placement=field("placement"),destination=field("link");
 placement.firstChild.textContent="Onde o banner aparece?";
 destination.firstChild.textContent="Para onde o botão leva?";
 row.append(placement,destination);
 easy.append(row);
 const active=field("active"),checkbox=form.elements.namedItem("active");
 active.classList.add("market-easy-active");
 active.replaceChildren(checkbox);
 const activeText=el("span");
 activeText.append(el("strong","","Mostrar este banner depois de publicar"),
  el("small","","Desmarcado = não aparece para clientes, mesmo após a publicação."));
 active.append(activeText);
 easy.append(active);
 const pretitle=el("div","market-preview-heading");
 pretitle.append(el("strong","","Prévia do banner"),el("span","","Simulação visual"));
 easy.append(pretitle,preview);
 const advanced=el("details","market-easy-advanced");
 advanced.id="campaign-advanced";
 const summary=el("summary");
 const texts=el("span");
 texts.append(el("strong","","Personalizar mais"),
  el("small","","Descrição, estilo, imagem para celular e agendamento"));
 summary.append(texts,el("span","market-advanced-arrow","⌄"));
 advanced.append(summary);
 const extra=el("div","market-advanced-content");
 const advancedRow=el("div","market-form-grid");
 advancedRow.append(field("style"),field("eyebrow"));
 const desc=field("description");
 const button=field("button_label");
 const urlRow=el("div","market-form-grid");
 urlRow.append(field("image_url"),field("mobile_image_url"));
 const mobile=upload("mobile_image_url");
 mobile.classList.add("market-mobile-upload");
 const scheduleText=schedule.querySelector("legend");
 if(scheduleText)scheduleText.textContent="Agendamento (opcional)";
 schedule.append(el("p","market-schedule-help",
  "Deixe as datas vazias para não agendar. A publicação só mostra banners com a opção de visibilidade marcada."));
 extra.append(advancedRow,desc,button,urlRow,mobile,schedule);
 advanced.append(extra);
 // Moving the existing controls preserves their names, values and registered
 // listeners. FormData and uploadPhoto continue to use the original fields.
 form.insertBefore(easy,actions);
 form.insertBefore(advanced,actions);
 for(const group of form.querySelectorAll(":scope > .market-form-grid,:scope > .market-images"))
  if(!group.children.length)group.remove();
 head.querySelector("p").textContent="Edite o essencial e salve. Publicar é uma ação separada.";
 const guide=root.querySelector(".market-guide");
 if(guide)guide.textContent="1. Crie o banner  ·  2. Salve o rascunho  ·  3. Publique quando estiver pronto.";
 const listTitle=root.querySelector(".market-catalog-heading strong");
 if(listTitle)listTitle.textContent="Seus banners";
 const listDescription=root.querySelector(".market-catalog-heading small");
 if(listDescription)listDescription.textContent="Selecione um banner para editar.";
 const apply=document.getElementById("campaign-apply");
 if(apply)apply.textContent="Salvar rascunho";
 const copy=document.getElementById("campaign-copy");
 if(copy)copy.textContent="Fazer cópia";
 const save=document.getElementById("campaign-save");
 if(save)save.textContent="Salvar mudanças na lista";
 const pub=root.querySelector(".market-publish-bar > div:first-child");
 if(pub){
  const heading=pub.querySelector("strong"),note=pub.querySelector("small");
  if(heading)heading.textContent="Publicação";
  if(note){note.id="campaign-publish-explain";
    note.textContent="Salvar o rascunho não altera a loja. Publicar também aplica outras alterações salvas na aba Aparência.";}
 }
 const count=document.getElementById("campaign-count");
 if(count)count.title="Até 24 banners por loja";
})();
