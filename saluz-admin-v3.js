/* SALUZ | Painel Operacional v3. Somente apresentação, sem alterar endpoints ou dados. */
(()=>{
 "use strict";
 if(location.hostname!=="homologacao.saluz-admin.pages.dev")return;
 const overview=document.getElementById("tab-overview");
 const sidebar=document.querySelector("#dashboard .sidebar");
 if(!overview||!sidebar||overview.querySelector(".saluz-op-head"))return;

 const make=(tag,className,value)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==undefined)node.textContent=value;
  return node;
 };
 const welcome=overview.querySelector(":scope > .professional-welcome");
 const actions=welcome?.querySelector(".professional-welcome-actions");
 const notice=overview.querySelector(":scope > .management-notice");
 const metricHeading=overview.querySelector(":scope > .professional-section-heading:not(.professional-tools-heading)");
 const kpis=document.getElementById("overview-health-kpis");
 const caption=document.getElementById("overview-health-caption");
 const dataOrigin=overview.querySelector(":scope > .saluz-data-origin");
 const shortcutHeading=overview.querySelector(":scope > .professional-tools-heading");
 const dashboardGrid=overview.querySelector(":scope > .professional-dashboard-grid");
 const shortcuts=dashboardGrid?.querySelector(".easy-shortcuts");
 const attention=dashboardGrid?.querySelector(".professional-attention");
 const orders=overview.querySelector(":scope > .overview-more");
 const assurance=overview.querySelector(":scope > .professional-assurance");
 const guide=overview.querySelector(":scope > .saluz-guide");
 // Abort before moving anything if essential nodes are not present.
 if(![welcome,actions,notice,metricHeading,kpis,caption,shortcutHeading,dashboardGrid,shortcuts,attention,orders,assurance,guide].every(Boolean))return;
 document.body.classList.add("saluz-v3");
 const opHead=make("section","saluz-op-head");
 opHead.setAttribute("aria-labelledby","saluz-op-title");
 const left=make("div","saluz-op-copy");
 const eyebrow=make("span","saluz-op-kicker","ÁREA DE TRABALHO");
 const title=make("h2","saluz-op-title","Gestão da loja");
 title.id="saluz-op-title";
 const copy=make("p","saluz-op-subtitle","Estoque, publicações e solicitações — o que precisa da sua atenção.");
 left.append(eyebrow,title,copy);
 const right=make("div","saluz-op-actions");
 right.append(actions);
 opHead.append(left,right);
 const board=make("div","saluz-op-board");
 const main=make("section","saluz-op-main");
 main.setAttribute("aria-label","Indicadores da operação");
 const aside=make("aside","saluz-op-aside");
 aside.setAttribute("aria-label","Pendências e explicações");
 const metrics=make("div","saluz-op-metrics");
 metrics.append(metricHeading,kpis,caption);
 if(dataOrigin)metrics.append(dataOrigin);
 const taskBar=make("div","saluz-op-task-head");
 const taskTitle=make("div","saluz-op-task-label");
 taskTitle.append(make("span","saluz-op-kicker","AÇÕES MAIS USADAS"),make("h3","", "Ir direto para uma tarefa"));
 taskBar.append(taskTitle);
 const taskPanel=make("section","saluz-op-task-panel");
 taskPanel.append(taskBar,shortcuts);
 main.append(metrics,taskPanel);
 aside.append(attention);
 // Keep instructions discoverable, but not as a second hero.
 const guidePanel=make("div","saluz-op-guide");
 guidePanel.append(guide);
 aside.append(guidePanel);
 board.append(main,aside);
 const quickInfo=make("div","saluz-op-info");
 quickInfo.append(notice);
 // New semantic order: actual tasks and data before secondary information.
 welcome.replaceWith(opHead);
 opHead.after(quickInfo,board);
 dashboardGrid.remove();
 shortcutHeading.remove();
 assurance.remove();
 // Details still available, behind one collapsible section.
 board.after(orders);
 const state=overview.querySelector(".saluz-op-info strong");
 if(state)state.textContent="Homologação — pagamentos desativados.";
 // Keep the old legal text available in a less prominent sidebar help.
 // In the remaining sections, prioritize the work area and put explanations below.
 for(const tabId of ["campaigns","studio","reports"]){
  const tab=document.getElementById("tab-"+tabId);
  const help=tab?.querySelector(":scope > .saluz-guide");
  if(help)tab.append(help);
 }
 const navTitle=sidebar.querySelector(".nav-group-label");
 if(navTitle)navTitle.textContent="OPERAR A LOJA";
 // Contextual semantics from existing source only; never synthesize counts.
 const storage=document.createElement("p");
 storage.className="saluz-op-source";
 storage.textContent="Os números acima vêm da integração atual. O catálogo D1 de testes está na aba Produtos.";
 const existing=main.querySelector(".saluz-data-origin");
 if(existing)existing.replaceWith(storage);else caption.after(storage);
})();
