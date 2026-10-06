const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const searchTrigger = document.querySelector("[data-search-trigger]");
const searchDialog = document.querySelector("[data-search-dialog]");
const newsletter = document.querySelector("[data-newsletter]");
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

searchTrigger?.addEventListener("click", () => searchDialog?.showModal());

newsletter?.addEventListener("submit", event => {
  event.preventDefault();
  const message = newsletter.querySelector("[data-form-message]");
  if (message) message.textContent = "Cadastro demonstrativo — integração será conectada depois.";
  newsletter.reset();
});

document.querySelectorAll('a[href="#"]').forEach(link => {
  link.addEventListener("click", event => event.preventDefault());
});