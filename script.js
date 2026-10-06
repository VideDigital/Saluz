const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const searchTrigger = document.querySelector("[data-search-trigger]");
const searchDialog = document.querySelector("[data-search-dialog]");
const newsletter = document.querySelector("[data-newsletter]");
const year = document.querySelector("[data-year]");

const detailCopy = {
  "01": "Forma e função pensadas para conviver sem esforço.",
  "02": "Pequenas decisões visuais que tornam o uso mais agradável.",
  "03": "Detalhes que ajudam a organizar sem transformar a rotina em tarefa."
};

year.textContent = new Date().getFullYear();

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  mobileNav.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  });
});

searchTrigger?.addEventListener("click", () => {
  searchDialog.showModal();
});

document.querySelectorAll("[data-detail]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.detail;
    document.querySelectorAll("[data-detail]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    document.querySelector("[data-detail-number]").textContent = id;
    document.querySelector("[data-detail-text]").textContent = detailCopy[id];
  });
});

newsletter.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.querySelector("[data-form-message]");
  message.textContent = "Cadastro demonstrativo — integração será conectada na etapa comercial.";
  newsletter.reset();
});

document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});
