/* SALUZ Control — navegação mobile sem alterar autenticação */
(()=>{
 "use strict";
 const sidebar=document.querySelector(".sidebar"),menu=document.getElementById("mobile-menu-toggle"),more=document.getElementById("mobile-more");
 const mobileButtons=[...document.querySelectorAll("[data-mobile-tab]")];
 const navigate=tab=>{const button=document.querySelector('[data-tab="'+tab+'"]');if(!button)return;button.click();sidebar.classList.remove("mobile-menu-open");menu.setAttribute("aria-expanded","false");more.setAttribute("aria-expanded","false");window.scrollTo({top:0,behavior:"auto"});};
 for(const button of mobileButtons)button.addEventListener("click",()=>navigate(button.dataset.mobileTab));
 const toggle=()=>{const open=sidebar.classList.toggle("mobile-menu-open");menu.setAttribute("aria-expanded",String(open));more.setAttribute("aria-expanded",String(open));};
 menu.addEventListener("click",toggle);more.addEventListener("click",toggle);
 for(const button of document.querySelectorAll("[data-quick-tab]"))button.addEventListener("click",()=>navigate(button.dataset.quickTab));
 window.addEventListener("saluz:tabchange",event=>{
  const tab=event.detail?.tab;
  for(const button of mobileButtons){const active=button.dataset.mobileTab===tab;button.classList.toggle("selected",active);if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");}
  more.classList.toggle("selected",tab==="finance"||tab==="reports");
  sidebar.classList.remove("mobile-menu-open");menu.setAttribute("aria-expanded","false");more.setAttribute("aria-expanded","false");
 });
})();
