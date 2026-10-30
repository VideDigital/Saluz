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
