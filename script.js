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
  { title: "Nécessaires", type: "Categoria", keywords: "necessaire nécessaires bolsa organização organizacao maquiagem", href: "#novidades" },
  { title: "Porta-joias", type: "Categoria", keywords: "porta joias joias organização organizacao acessórios acessorios", href: "#novidades" },
  { title: "Organização de maquiagem", type: "Categoria", keywords: "maquiagem organizador organização organizacao beleza", href: "#novidades" },
  { title: "Viagem", type: "Categoria", keywords: "viagem mala organizadores necessaire acessórios acessorios", href: "#categorias" },
  { title: "Autocuidado", type: "Categoria", keywords: "autocuidado rotina cuidado espelho pente escova", href: "#categorias" },
  { title: "Presentes", type: "Categoria", keywords: "presente presentes para ela kits gift", href: "#presentes" },
  { title: "Kit Nova Rotina", type: "Kit", keywords: "kit nova rotina autocuidado organização organizacao", href: "#kits" },
  { title: "Kit Organização", type: "Kit", keywords: "kit organização organizacao bolsa maquiagem", href: "#kits" },
  { title: "Presente para Ela", type: "Kit", keywords: "kit presente para ela feminino", href: "#kits" },
  { title: "Organizar minha bolsa", type: "Momento", keywords: "bolsa organizar organização organizacao", href: "#momentos" },
  { title: "Preparar uma viagem", type: "Momento", keywords: "viagem mala preparar organizador", href: "#momentos" }
];

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
      '<div class="search-empty"><strong>Nenhum resultado encontrado.</strong><span>O catálogo ainda está sendo definido. Tente outro termo.</span></div>';
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

searchTrigger?.addEventListener("click", openSearch);
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