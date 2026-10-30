/* SALUZ / orientações das abas: informativo, sem alterar dados. */
(()=>{
 "use strict";
 const guides={
  overview:["Comece pelo que precisa de atenção","Consulte produtos, banners e tarefas pendentes. O resumo usa os dados carregados pelo sistema.",["Resumo da loja","Contagens reais de produtos e banners."],["Pendências","Itens que precisam de revisão ou reposição."],["Pedidos","Solicitações; não equivalem a pagamentos confirmados."],"Loja em homologação: checkout permanece desativado."],
  products:["Organize seu catálogo","Edite os itens, as fotos, os preços e o estoque. Filtre para localizar um produto.",["Visível / oculto","Controla a exibição na vitrine sem apagar o produto."],["Destaque / oferta","Destaque promove a exibição; oferta utiliza preço promocional."],["Variações","Cor e tamanho possuem estoques individuais."],"Em homologação, os produtos são dados de testes no D1."],
  campaigns:["Planeje seus banners e ofertas","Crie ou edite banners e ofertas dos produtos que já existem.",["Banner","Peça de divulgação nas áreas existentes do site."],["Rascunho","Alterações salvas, ainda não publicadas."],["Publicar","Aplica mudanças depois da revisão."],"Confira links e datas antes de publicar."],
  studio:["Personalize sua vitrine","Altere textos, fotos e links existentes e confira a prévia.",["Imagem principal","Foto da abertura da loja."],["Prévia","Representação visual das alterações."],["Publicar","Aplica o rascunho à vitrine."],"Não cria novas páginas nem ativa pagamentos."],
  orders:["Acompanhe suas solicitações","Busque um pedido e atualize sua etapa após verificar o ocorrido.",["Recebido","Pedido registrado, sem prova de pagamento."],["Aguardando pagamento","Pagamento ainda não confirmado."],["Pago confirmado","Exige conferência no extrato, sem conciliação automática validada."],"Não confirme pagamento somente por comprovante enviado."],
  customers:["Entenda seus contatos","Os clientes exibidos são derivados dos pedidos carregados.",["Identificados","Contatos únicos no conjunto de pedidos retornados."],["Recorrentes","Contatos com mais de uma solicitação registrada."],["Marcado como pago","Soma de pedidos com confirmação manual."],"Não é um CRM completo. Use dados pessoais apenas para atendimento legítimo."],
  finance:["Compare custos sem cobrar","Registre taxas de cada provedor e simule quanto restaria em uma venda.",["Taxa percentual e fixa","Ambas são descontadas no cálculo estimado."],["Prazo","Dias para recebimento registrados na condição."],["Teste Mercado Pago","Consulta de credencial, sem criar cobrança."],"Taxas manuais salvas só neste navegador; confirme valores contratados."],
  reports:["Interprete seus resultados","Consulte visitas e ações registradas no período selecionado.",["Visualizações","Aberturas de páginas; não representam pessoas únicas."],["Sessões","Acessos medidos, não indivíduos identificados."],["Conversões","Interações e solicitações; não são vendas pagas."],"Os números podem omitir usuários sem consentimento ou com bloqueadores."]
 };
 const create=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=value;return el;};
 for(const [name,parts] of Object.entries(guides)){
  const tab=document.getElementById("tab-"+name);
  if(!tab||tab.querySelector(".saluz-guide"))continue;
  const [title,lead,...rest]=parts;
  const box=create("section","saluz-guide");box.setAttribute("aria-label","Ajuda: "+title);
  const head=create("div","saluz-guide-head");
  const symbol=create("span","saluz-guide-symbol","✦");symbol.setAttribute("aria-hidden","true");
  const intro=create("div","saluz-guide-intro");
  intro.append(create("span","saluz-guide-eyebrow","ENTENDA ESTA ÁREA"),create("h2","saluz-guide-title",title),create("p","saluz-guide-desc",lead));
  head.append(symbol,intro);
  const details=create("details","saluz-guide-details");
  details.append(create("summary","saluz-guide-summary","O que significa cada item?"));
  const dl=create("dl","saluz-guide-grid");
  for(const [term,meaning] of rest.slice(0,3)){const item=create("div","saluz-guide-item");item.append(create("dt","",term),create("dd","",meaning));dl.append(item);}
  details.append(dl,create("p","saluz-guide-note",rest[3]));
  box.append(head,details);tab.prepend(box);
 }
 const nav=()=>document.querySelectorAll("#admin-nav [data-tab]").forEach(b=>{
  if(b.classList.contains("selected"))b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
 });
 nav();window.addEventListener("saluz:tabchange",nav);
})();