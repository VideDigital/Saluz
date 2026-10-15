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
  { title: "Nécessaires", type: "Categoria", keywords: "necessaire nécessaires bolsa organização organizacao maquiagem", href: "./loja.html?categoria=N%C3%A9cessaires#produtos" },
  { title: "Porta-joias", type: "Categoria", keywords: "porta joias joias organização organizacao acessórios acessorios", href: "./loja.html?categoria=Porta-joias#produtos" },
  { title: "Organização de maquiagem", type: "Categoria", keywords: "maquiagem organizador organização organizacao beleza", href: "./loja.html?categoria=Organizadores%20de%20maquiagem#produtos" },
  { title: "Viagem", type: "Categoria", keywords: "viagem mala organizadores necessaire acessórios acessorios", href: "./loja.html?categoria=Acess%C3%B3rios%20de%20viagem#produtos" },
  { title: "Autocuidado", type: "Categoria", keywords: "autocuidado rotina cuidado espelho pente escova", href: "./loja.html?categoria=Autocuidado#produtos" },
  { title: "Presentes", type: "Categoria", keywords: "presente presentes para ela kits gift", href: "./loja.html?categoria=Kits%20e%20presentes#produtos" },
  { title: "Kit Nova Rotina", type: "Kit", keywords: "kit nova rotina autocuidado organização organizacao", href: "./loja.html?categoria=Kits%20e%20presentes#produtos" },
  { title: "Kit Organização", type: "Kit", keywords: "kit organização organizacao bolsa maquiagem", href: "./loja.html?categoria=Kits%20e%20presentes#produtos" },
  { title: "Presente para Ela", type: "Kit", keywords: "kit presente para ela feminino", href: "./loja.html?categoria=Kits%20e%20presentes#produtos" },
  { title: "Organizar minha bolsa", type: "Momento", keywords: "bolsa organizar organização organizacao", href: "./loja.html?categoria=Organizadores%20de%20bolsa#produtos" },
  { title: "Preparar uma viagem", type: "Momento", keywords: "viagem mala preparar organizador", href: "./loja.html?categoria=Acess%C3%B3rios%20de%20viagem#produtos" }
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
// The official bag is on the new storefront; no faux checkout on this prototype.

searchInput?.addEventListener("keydown", event => { if(event.key==='Enter'){const query=event.target.value.trim();if(query)window.location.href='./loja.html?q='+encodeURIComponent(query)+'#produtos';} });

// The sacola badge on the homepage reflects selections kept on this device.
try {
 const item=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");
 const badge=document.querySelector(".header-actions .bag span");
 if(badge&&Array.isArray(item))badge.textContent=String(item.reduce((total,line)=>total+Math.max(0,Number(line.quantity)||0),0));
}catch{ /* Corrupted local bag should not block navigation. */ }
