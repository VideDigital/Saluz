const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const searchTrigger = document.querySelector("[data-search-trigger]");
const searchDialog = document.querySelector("[data-search-dialog]");
const searchClose = document.querySelector("[data-search-close]");
const searchInput = document.querySelector("[data-search-input]");
const searchResults = document.querySelector("[data-search-results]");
const year = document.querySelector("[data-year]");

if (year) year.textContent = new Date().getFullYear();

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mobileNav?.classList.toggle("is-open", !open);
  document.body.classList.toggle("menu-open", !open);
});

mobileNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  });
});

const searchIndex = [
  {title:"Nécessaires",type:"Coleção",keywords:"necessaire necessaires bolsa organizacao maquiagem",href:"./colecao-necessaires.html"},
  {title:"Porta-joias",type:"Coleção",keywords:"porta joias joias acessorios organizar",href:"./colecao-porta-joias.html"},
  {title:"Organizadores de maquiagem",type:"Coleção",keywords:"maquiagem organizador organizacao beleza",href:"./colecao-organizadores-maquiagem.html"},
  {title:"Organizadores de bolsa",type:"Coleção",keywords:"bolsa organizadores divisorias organizacao",href:"./colecao-organizadores-bolsa.html"},
  {title:"Acessórios de viagem",type:"Coleção",keywords:"viagem mala acessorios viagem",href:"./colecao-acessorios-viagem.html"},
  {title:"Autocuidado",type:"Coleção",keywords:"autocuidado rotina cuidado",href:"./colecao-autocuidado.html"},
  {title:"Acessórios femininos",type:"Coleção",keywords:"acessorios feminino cabelo",href:"./colecao-acessorios-femininos.html"},
  {title:"Kits e presentes",type:"Coleção",keywords:"kits presentes presente para ela",href:"./colecao-kits-presentes.html"}
]

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderSearchResults(query = "") {
  if (!searchResults) return;

  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    searchResults.innerHTML =
      '<p class="search-hint">Experimente buscar por “viagem”, “presente”, “nécessaire” ou “organização”.</p>';
    return;
  }

  const matches = searchIndex
    .filter(item => normalizeText(item.title + " " + item.type + " " + item.keywords).includes(normalizedQuery))
    .slice(0, 7);

  if (!matches.length) {
    searchResults.innerHTML =
      '<div class="search-empty"><strong>Nenhuma coleção correspondente.</strong><span>Você também pode procurar pelo nome de um produto no catálogo completo.</span></div>';
    return;
  }

  searchResults.innerHTML = matches
    .map(item => `
      <a class="search-result" href="${item.href}">
        <span>
          <small>${item.type}</small>
          <strong>${item.title}</strong>
        </span>
        <b aria-hidden="true">↗</b>
      </a>
    `)
    .join("");
  const goToCatalog = document.createElement("a");
  goToCatalog.className = "search-result";
  goToCatalog.href = "./loja.html?q=" + encodeURIComponent(query.trim()) + "#produtos";
  goToCatalog.textContent = "Buscar “" + query.trim().slice(0,70) + "” em todos os produtos ↗";
  searchResults.append(goToCatalog);

  searchResults.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeSearch);
  });
}

function openSearch() {
  if (!searchDialog) return;

  if (typeof searchDialog.showModal === "function") {
    if (!searchDialog.open) searchDialog.showModal();
  } else {
    searchDialog.setAttribute("open", "");
  }

  document.body.classList.add("menu-open");
  renderSearchResults("");
  window.setTimeout(() => searchInput?.focus(), 50);
}

function closeSearch() {
  if (!searchDialog) return;

  if (typeof searchDialog.close === "function" && searchDialog.open) {
    searchDialog.close();
  } else {
    searchDialog.removeAttribute("open");
  }

  document.body.classList.remove("menu-open");
  if (searchInput) searchInput.value = "";
}

searchTrigger?.addEventListener("click", event => { event.preventDefault(); openSearch(); });
searchClose?.addEventListener("click", closeSearch);
searchInput?.addEventListener("input", event => renderSearchResults(event.target.value));

searchDialog?.addEventListener("click", event => {
  if (event.target === searchDialog) closeSearch();
});

searchDialog?.addEventListener("cancel", event => {
  event.preventDefault();
  closeSearch();
});


document.querySelectorAll('a[href="#"]').forEach(link => {
  link.addEventListener("click", event => event.preventDefault());
});
// The official bag is on the new storefront; no faux checkout on this prototype.

searchInput?.addEventListener("keydown", event => { if(event.key==='Enter'){const query=event.target.value.trim();if(query)window.location.href='./loja.html?q='+encodeURIComponent(query)+'#produtos';} });

// The sacola badge on the homepage reflects selections kept on this device.
try {
 const item=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");
 const badge=document.querySelector(".header-actions .bag span");
 if(badge&&Array.isArray(item))badge.textContent=String(item.reduce((total,line)=>total+Math.max(0,Number(line.quantity)||0),0));
}catch{ /* Corrupted local bag should not block navigation. */ }
