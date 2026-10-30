/* SALUZ Minimal — somente a experiência do painel em homologação.
 * Os elementos funcionais originais são movidos, nunca clonados:
 * listeners, campos, regras de validação e APIs permanecem os mesmos.
 */
(() => {
  "use strict";
  if (location.hostname !== "homologacao.saluz-admin.pages.dev") return;
  const root = document.getElementById("dashboard");
  if (!root || !document.body.classList.contains("saluz-v3")) return;
  if (document.body.classList.contains("saluz-minimal")) return;
  document.body.classList.add("saluz-minimal");

  const byId = id => document.getElementById(id);
  const make = (tag, className, label) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (label != null) el.textContent = label;
    return el;
  };

  // Navegação com nomes de tarefas e ícones originais preservados.
  const menuLabels = {
    overview: "Início", products: "Produtos", campaigns: "Campanhas",
    studio: "Visual da loja", orders: "Pedidos", customers: "Clientes",
    finance: "Simular taxas", reports: "Resultados"
  };
  for (const [key, label] of Object.entries(menuLabels)) {
    const button = root.querySelector('#admin-nav [data-tab="' + key + '"]');
    if (!button) continue;
    const trailingText = [...button.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (trailingText) trailingText.nodeValue = " " + label;
    button.setAttribute("aria-label", label);
  }
  const labels = root.querySelectorAll(".nav-group-label");
  if (labels[0]) labels[0].textContent = "MINHA LOJA";
  if (labels[1]) labels[1].textContent = "ACOMPANHAMENTO";
  const migration = root.querySelector(".saluz-migration-link");
  if (migration) {
    const dev = make("details", "saluz-dev-tools");
    dev.append(make("summary", "", "Ferramentas técnicas"), migration);
    root.querySelector("#admin-nav")?.append(dev);
  }

  // Guardar operações pouco frequentes sem desativar os botões.
  function extraActions(parent, buttons, summaryLabel) {
    if (!parent) return;
    const actions = buttons.map(byId).filter(Boolean);
    if (!actions.length) return;
    const box = make("details", "saluz-min-more");
    const inner = make("div", "saluz-min-more-content");
    box.append(make("summary", "", summaryLabel), inner);
    actions.forEach(button => inner.append(button));
    parent.append(box);
    return box;
  }
  function optionalNode(node, label) {
    if (!node || !node.parentElement) return;
    const group = make("details", "saluz-min-more");
    const inner = make("div", "saluz-min-more-content");
    group.append(make("summary", "", label), inner);
    node.before(group);
    inner.append(node);
    return group;
  }

  // Ajuda continua acessível, porém não ocupa uma coluna em cada módulo.
  for (const id of ["overview", "products", "campaigns", "studio", "orders",
                      "customers", "finance", "reports"]) {
    const tab = byId("tab-" + id);
    const guide = tab?.querySelector(".saluz-guide");
    if (!guide) continue;
    const details = make("details", "saluz-min-help");
    details.append(make("summary", "", "Precisa de ajuda nesta área?"), guide);
    tab.append(details);
  }

  // Início: foco nos dados, nas tarefas e nas pendências, não em instruções.
  const opTitle = root.querySelector(".saluz-op-title");
  if (opTitle) opTitle.textContent = "Sua loja em um só lugar";
  const opSubtitle = root.querySelector(".saluz-op-subtitle");
  if (opSubtitle) opSubtitle.textContent =
    "Veja o que precisa de atenção e escolha o que deseja fazer.";
  const opSource = root.querySelector(".saluz-op-source");
  if (opSource) opSource.textContent =
    "Dados da homologação. Os números não representam vendas confirmadas.";

  // Produto: arquivo enviado em primeiro plano, link da foto e prévia opcionais.
  const productForm = byId("product-form");
  if (productForm) {
    const urlInput = productForm.querySelector('input[name="image_url"]');
    optionalNode(urlInput?.closest("label"), "Usar endereço de imagem (opcional)");
    optionalNode(byId("product-preview"), "Ver prévia do produto");
  }

  // Campanhas: salvar o banner, publicar, ou abrir ações secundárias.
  const campaignForm = byId("campaign-banner-form");
  extraActions(campaignForm?.querySelector(".market-editor-actions"),
    ["campaign-copy", "campaign-delete"], "Duplicar ou excluir");
  extraActions(root.querySelector("#tab-campaigns .market-publish-actions"),
    ["campaign-save", "campaign-discard"], "Organizar ou desfazer alterações");
  const campaignPublish = byId("campaign-publish");
  if (campaignPublish) campaignPublish.textContent = "Publicar alterações";
  const campaignApply = byId("campaign-apply");
  if (campaignApply && campaignForm?.dataset.simpleEditor === "1")
    campaignApply.textContent = "Salvar banner";
  const campaignNote = byId("campaign-publish-explain");
  if (campaignNote) campaignNote.textContent =
    "Salvar não altera a loja. Ao publicar, confira também os rascunhos da área Visual da loja.";
  const bannerTitle = root.querySelector("#tab-campaigns .market-page-intro p");
  if (bannerTitle) bannerTitle.textContent = "Atualize os banners ou os descontos da loja.";

  // Visual da loja: upload é a ação usual; colar URLs fica disponível.
  for (const key of ["hero_image_url", "moment_image_url", "gift_image_url"]) {
    const input = root.querySelector('#studio-form input[name="' + key + '"]');
    optionalNode(input?.closest("label"), "Informar link da foto (opcional)");
  }
  extraActions(root.querySelector("#tab-studio .studio-actions"),
    ["studio-discard"], "Descartar rascunho");
  const studioTitle = root.querySelector("#tab-studio .easy-page-title h2");
  if (studioTitle) studioTitle.textContent = "Visual da loja";
  const studioText = root.querySelector("#tab-studio .easy-page-title p");
  if (studioText) studioText.textContent = "Escolha uma área, edite e confira a prévia.";

  // Taxas: diagnóstico de integração restrito ao suporte técnico, não à simulação.
  const connectivity = byId("mp-test-connectivity");
  optionalNode(connectivity, "Diagnóstico técnico do Mercado Pago");

  // Deixar explícito o ambiente sem confundir solicitações e pagamentos.
  const ordersText = root.querySelector("#tab-orders .tab-toolbar p");
  if (ordersText) ordersText.innerHTML =
    "Acompanhe as solicitações. <strong>Pedido recebido não significa pagamento confirmado.</strong>";
})();


/* SALUZ Focus V4: priorização real da informação, sem alterar integração ou eventos.
 * Usa os controles existentes, mantém IDs e preserva edição/publicação separadas.
 * O painel oficial continua sem executar este script. */
(() => {
 "use strict";
 if (location.hostname !== "homologacao.saluz-admin.pages.dev") return;
 const root=document.getElementById("dashboard");
 if (!root||!document.body.classList.contains("saluz-minimal")) return;
 document.body.classList.add("saluz-focus");
 const $=id=>document.getElementById(id);
 const node=(tag,cls,txt)=>{
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(txt!==undefined)el.textContent=txt;
   return el;
 };
 const wrapDetails=(el,heading,cls="saluz-focus-details")=>{
   if(!el||!el.parentElement)return null;
   const detail=node("details",cls),summary=node("summary","",heading);
   el.before(detail);detail.append(summary,el);return detail;
 };

 // Uma navegação curta para tarefas diárias; outras abas continuam acessíveis.
 const nav=$("admin-nav");
 const extraIds=["customers","finance","reports"];
 const extra=node("details","saluz-focus-nav-extra");
 extra.append(node("summary","","Mais opções"));
 for(const id of extraIds){
   const button=nav?.querySelector('[data-tab="'+id+'"]');
   if(button)extra.append(button);
 }
 if(nav){
   const firstGroup=nav.querySelectorAll(".nav-group-label");
   for(const item of firstGroup)item.remove();
   const dev=nav.querySelector(".saluz-dev-tools");
   if(dev)extra.append(dev);
   nav.append(extra);
 }
 const navNames={
   overview:"Início",products:"Produtos",orders:"Pedidos",
   campaigns:"Banners e ofertas",studio:"Editar loja",
   customers:"Clientes",finance:"Calcular taxas",reports:"Resultados"
 };
 for(const [id,name] of Object.entries(navNames)){
   const button=nav?.querySelector('[data-tab="'+id+'"]');
   if(!button)continue;
   const lastText=[...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
   if(lastText)lastText.nodeValue=" "+name;
   button.setAttribute("aria-label",name);
 }
 const tabTitle={
   overview:"Início",products:"Produtos",orders:"Pedidos",campaigns:"Banners e ofertas",
   studio:"Editar loja",customers:"Clientes",finance:"Calcular taxas",reports:"Resultados"
 };
 function syncTab(event){
   const id=event?.detail?.tab||"overview";
   const title=$("section-title");
   if(title&&tabTitle[id])title.textContent=tabTitle[id];
   if(extra)extra.open=extraIds.includes(id);
   const more=$("mobile-more");
   if(more)more.classList.toggle("selected",extraIds.includes(id)||id==="studio");
 }
 window.addEventListener("saluz:tabchange",syncTab);
 syncTab();
 // Campanhas têm prioridade sobre Clientes no atalho inferior, sem criar rota.
 const mobileCustomers=document.querySelector('[data-mobile-tab="customers"]');
 if(mobileCustomers){
   mobileCustomers.dataset.mobileTab="campaigns";
   const label=mobileCustomers.querySelector("small");
   if(label)label.textContent="Campanhas";
   const symbol=mobileCustomers.querySelector("span");
   if(symbol)symbol.textContent="◈";
 }

 // Uma única barra de ações na Home, seguida pelos indicadores reais e pendências.
 const overview=$("tab-overview");
 const head=overview?.querySelector(".saluz-op-head");
 const oldActions=head?.querySelector(".professional-welcome-actions");
 if(overview&&head&&oldActions){
   const primary=node("div","saluz-focus-home-actions");
   const label=node("div","saluz-focus-home-intro");
   label.append(node("strong","","O que você precisa fazer?"),
     node("span","","Acesse as tarefas mais usadas."));
   primary.append(label,oldActions);
   const info=overview.querySelector(".saluz-op-info");
   if(info){
     info.classList.add("saluz-focus-state");
     primary.append(info);
   }
   head.replaceWith(primary);
   const main=overview.querySelector(".saluz-op-main");
   main?.querySelector(".saluz-op-task-panel")?.remove();
   const metrics=overview.querySelector(".saluz-op-metrics");
   const metricsHeader=metrics?.querySelector(".professional-section-heading");
   if(metricsHeader){
     const note=metricsHeader.querySelector("p");
     if(note)note.remove();
   }
   const originalSource=overview.querySelector(".saluz-op-source");
   if(originalSource)originalSource.textContent=
     "Indicadores do ambiente de testes; não significam pagamentos confirmados.";
   const orderDetails=overview.querySelector(".overview-more>summary");
   if(orderDetails)orderDetails.textContent="Consultar pedidos recentes";
 }

 // Um título por tela; os botões continuam no topo.
 for(const [tab,selector] of [
   ["products",".easy-page-title"],["campaigns",".easy-page-title"],
   ["studio",".easy-page-title"],["customers",".panel-intro"],["finance",".panel-intro"]]){
   const heading=$("tab-"+tab)?.querySelector(selector);
   if(heading)heading.classList.add("saluz-focus-secondary-title");
 }
 const actions=$("tab-products")?.querySelector(".professional-product-actions");
 const exportButton=$("product-export-csv");
 if(actions&&exportButton){
   const details=node("details","saluz-focus-compact-actions");
   details.append(node("summary","","Outras ações"),exportButton);
   actions.append(details);
 }
 const listHeading=$("tab-products")?.querySelector(".product-list-header h2");
 if(listHeading)listHeading.textContent="Todos os produtos";
 const productIntro=$("tab-products")?.querySelector(".product-list-header");
 if(productIntro)productIntro.classList.add("saluz-focus-product-intro");

 // Banners: escolha um item no catálogo; mostre o formulário apenas ao editar.
 // Nunca interfere no estado de formulário nem nos requests originais.
 const campaigns=$("tab-campaigns");
 const list=$("#campaign-list"),form=$("campaign-banner-form");
 const arrange=$("campaign-new")?.parentElement;
 if(campaigns&&list&&form&&arrange){
   campaigns.classList.add("saluz-focus-browse");
   const toggle=node("button","saluz-focus-arrange","Organizar");
   toggle.type="button";
   toggle.setAttribute("aria-pressed","false");
   arrange.insertBefore(toggle,$("campaign-new"));
   toggle.addEventListener("click",()=>{
     const isOn=campaigns.classList.toggle("saluz-focus-arranging");
     toggle.textContent=isOn?"Concluir":"Organizar";
     toggle.setAttribute("aria-pressed",String(isOn));
   });
   const saveOrder=$("campaign-save");
   if(saveOrder){
     saveOrder.textContent="Salvar ordem";
     arrange.insertBefore(saveOrder,toggle);
   }
   const back=$("campaign-editor-close");
   if(back)back.textContent="← Voltar aos banners";
   campaigns.addEventListener("click",event=>{
     const button=event.target.closest("#campaign-new, .market-list-open, #campaign-editor-close");
     if(!button)return;
     // Este listener executa após a lógica existente, sem impedir confirmação.
     queueMicrotask(()=>{
       if(button.id==="campaign-editor-close"){
         if(form.hidden){
           campaigns.classList.remove("saluz-focus-editing");
           campaigns.classList.add("saluz-focus-browse");
         }
         return;
       }
       if(!form.hidden){
         campaigns.classList.add("saluz-focus-editing");
         campaigns.classList.remove("saluz-focus-browse");
       }
     });
   });
   // A interface da lista é o ponto de entrada, inclusive após recarregar os banners.
   const heading=campaigns.querySelector(".market-top-actions h3");
   if(heading)heading.firstChild.textContent="Seus banners ";
   const editorHead=campaigns.querySelector(".market-form-head p");
   if(editorHead)editorHead.textContent="Altere o conteúdo e salve antes de publicar.";
   const previewTitle=campaigns.querySelector(".market-preview-heading");
   if(previewTitle)previewTitle.querySelector("span")?.remove();
   const publishText=campaigns.querySelector(".market-publish-bar>div:first-child strong");
   if(publishText)publishText.textContent="Pronto para mostrar na loja?";
 }
 // Mais opções de conteúdo ficam recolhidas, sem sumir com os valores existentes.
 const studio=$("tab-studio");
 const studioForm=$("studio-form");
 if(studio&&studioForm){
   const preview=studio.querySelector(".studio-preview-wrap");
   const editor=studio.querySelector(".studio-editor");
   if(preview&&editor){
     const details=node("details","saluz-focus-store-preview");
     details.append(node("summary","","Ver prévia da loja"),preview);
     studioForm.append(details);
   }
   const title=studio.querySelector(".studio-card-head h3");
   if(title)title.textContent="Página inicial";
   const active=studio.querySelector('.studio-nav [data-studio-section="principal"]');
   if(active)active.textContent="Início";
   const blocks=studio.querySelector('.studio-nav [data-studio-section="homeblocks"]');
   if(blocks)blocks.textContent="Seções";
   const vitr=studio.querySelector('.studio-nav [data-studio-section="vitrine"]');
   if(vitr)vitr.textContent="Vitrine";
   const contact=studio.querySelector('.studio-nav [data-studio-section="contato"]');
   if(contact)contact.textContent="Contato";
   const actions=studio.querySelector(".studio-actions");
   if(actions)actions.classList.add("saluz-focus-publish-actions");
   const studioState=studio.querySelector(".studio-summary");
   if(studioState)studioState.classList.add("saluz-focus-studio-status");
 }

 // Calcular primeiro, configurar regras quando for necessário.
 const finance=$("tab-finance");
 const financeLayout=finance?.querySelector(".finance-layout");
 const feeForm=$("fee-form");
 if(financeLayout&&feeForm){
   const compare=financeLayout.querySelector('[aria-labelledby="fee-compare-title"]');
   if(compare)financeLayout.prepend(compare);
   const details=wrapDetails(feeForm,"Cadastrar ou editar taxa","saluz-focus-fee-settings");
   // Ao editar uma condição existente, o formulário deve ser aberto antes do scroll.
   const table=$("fee-table");
   table?.addEventListener("click",event=>{
     if(event.target.closest("button")&&details)details.open=true;
   },true);
   const createRate=finance?.querySelector(".management-notice:not(#mp-test-connectivity)");
   if(createRate)createRate.classList.add("saluz-focus-fee-notice");
 }

 // Relatórios: explicações ficam acessíveis, sem disputar espaço com gráfico.
 const reports=$("tab-reports");
 const metricsNote=reports?.querySelector(":scope > .hint");
 if(metricsNote)wrapDetails(metricsNote,"Como interpretar estes números");
 const reportToolbar=reports?.querySelector(".tab-toolbar p");
 if(reportToolbar)reportToolbar.textContent="Dados de visitas e cliques com consentimento.";
})();
