/* SALUZ | Workspace 2 — reorganiza a apresentação, sem mudar APIs, dados ou formulários. */
(()=>{
 "use strict";
 if(location.hostname!=="homologacao.saluz-admin.pages.dev")return;
 const $=s=>document.querySelector(s);
 const panel=$("#dashboard");
 if(!panel)return;
 document.body.classList.add("saluz-v2");
 const place=(tabId,parts)=>{
  const root=$("#tab-"+tabId);
  if(!root||root.querySelector(":scope > .saluz-workspace-split"))return;
  const guide=root.querySelector(":scope > .saluz-guide");
  const mainNodes=parts.map(selector=>root.querySelector(":scope > "+selector));
  if(!guide||mainNodes.some(node=>!node))return;
  const split=document.createElement("div");
  split.className="saluz-workspace-split";
  const main=document.createElement("div");main.className="saluz-workspace-main";
  const side=document.createElement("aside");side.className="saluz-workspace-side";
  side.setAttribute("aria-label","Orientações da seção");
  const marker=document.createComment("saluz-v2-layout-position");
  root.insertBefore(marker,mainNodes[0]);
  for(const node of mainNodes)main.append(node);
  side.append(guide);
  split.append(main,side);
  marker.replaceWith(split);
 };
 // Informações de trabalho primeiro; ajuda de leitura depois, sem repetir dois banners.
 const overview=$("#tab-overview");
 if(overview){
  const guide=overview.querySelector(":scope > .saluz-guide");
  if(guide)overview.append(guide);
  const welcome=overview.querySelector(".professional-welcome");
  const heading=welcome?.querySelector("h2");
  const description=welcome?.querySelector("p");
  if(heading)heading.textContent="Tudo o que importa na sua loja, em um só lugar.";
  if(description)description.textContent="Acompanhe o catálogo, revise pendências e continue suas tarefas.";
 }
 place("products",[".product-list"]);
 place("orders",[".orders-toolbar","#orders"]);
 place("customers",[".customer-summary",".panel-filter","#customers-list"]);
 const finance=$("#tab-finance");
 if(finance){
   const guide=finance.querySelector(":scope > .saluz-guide");
   const saved=finance.querySelector(":scope > .fee-saved");
   if(guide&&saved)saved.after(guide);
 }
 const studio=$("#tab-studio");
 if(studio){
   const guide=studio.querySelector(":scope > .saluz-guide");
   const title=studio.querySelector(":scope > .easy-page-title");
   if(guide&&title)title.after(guide);
 }
 const reports=$("#tab-reports");
 if(reports){
   const guide=reports.querySelector(":scope > .saluz-guide");
   const toolbar=reports.querySelector(":scope > .tab-toolbar");
   if(guide&&toolbar)toolbar.after(guide);
 }
 const campaigns=$("#tab-campaigns");
 if(campaigns){
   const guide=campaigns.querySelector(":scope > .saluz-guide");
   const first=campaigns.querySelector(":scope > .market-page-intro, :scope > .market-page-header");
   if(guide&&first)first.after(guide);
 }
})();
