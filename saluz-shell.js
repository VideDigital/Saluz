/* Navegação unificada SALUZ. Links são páginas reais; área administrativa não é alterada. */
(()=>{
const cats=[["Nécessaires","necessaires"],["Porta-joias","porta-joias"],["Organizadores de maquiagem","organizadores-maquiagem"],["Organizadores de bolsa","organizadores-bolsa"],["Acessórios de viagem","acessorios-viagem"],["Autocuidado","autocuidado"],["Acessórios femininos","acessorios-femininos"],["Kits e presentes","kits-presentes"]];
const current=location.pathname.split("/").pop()||"index.html";
const isShop=current==="loja.html";
const navLink=(href,label)=>'<a href="./'+href+'"'+(current===href?' aria-current="page"':'')+'>'+label+'</a>';
const submenu=cats.map(([label,slug])=>navLink("colecao-"+slug+".html",label)).join("");
const bagCount=(()=>{try{const b=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");return Array.isArray(b)?b.reduce((s,x)=>s+Math.max(0,Number(x.quantity)||0),0):0}catch{return 0}})();
const bag=isShop?'<button class="commerce-bag" id="cart-open" type="button">Sacola <span class="commerce-count" id="cart-count">'+bagCount+'</span></button>':'<a class="commerce-bag" href="./loja.html#sacola">Sacola <span class="commerce-count">'+bagCount+'</span></a>';
const header='<div class="commerce-top"><span>✦ SALUZ · Beleza nos detalhes</span><span>Atendimento de segunda a sexta, 8h às 19h</span></div>'+
'<header class="commerce-header"><div class="commerce-primary">'+
'<button class="commerce-menu-toggle" id="menu-toggle" type="button" aria-controls="loja-nav" aria-expanded="false" aria-label="Abrir menu">☰ <span>Menu</span></button>'+
'<a class="commerce-brand" href="./index.html" aria-label="SALUZ, página inicial">SALUZ <span>✦</span></a>'+
'<div class="commerce-actions"><a class="commerce-search" href="./loja.html#produtos">Buscar</a>'+bag+'</div></div>'+
'<nav class="commerce-nav" id="loja-nav" aria-label="Navegação principal">'+
navLink("index.html","Início")+navLink("colecoes.html","Todas as coleções")+
'<details class="commerce-mega"><summary>Categorias <span aria-hidden="true">⌄</span></summary><div class="commerce-mega-panel"><div><p class="commerce-overline">EXPLORE A SALUZ</p><h2>Cada detalhe conta.</h2><p>Encontre seus favoritos nas coleções.</p></div><div class="commerce-mega-links">'+submenu+'</div></div></details>'+
navLink("loja.html","Todos os produtos")+navLink("sobre.html","A SALUZ")+navLink("atendimento.html","Atendimento")+
'</nav></header>';
const footer='<footer class="commerce-footer"><div class="commerce-footer-inner">'+
'<section class="commerce-footer-brand"><a href="./index.html">SALUZ ✦</a><p>Beleza nos detalhes.</p><p>Organização, autocuidado, acessórios e presentes.</p></section>'+
'<section><h2>Coleções</h2>'+navLink("colecoes.html","Todas as coleções")+navLink("colecao-necessaires.html","Nécessaires")+navLink("colecao-porta-joias.html","Porta-joias")+navLink("colecao-kits-presentes.html","Kits e presentes")+'</section>'+
'<section><h2>Informações</h2>'+navLink("sobre.html","Sobre a SALUZ")+navLink("como-comprar.html","Como comprar")+navLink("atendimento.html","Atendimento")+navLink("privacidade.html","Privacidade")+'</section>'+
'<section><h2>Fale conosco</h2><a href="mailto:anny.csalustiano@gmail.com">anny.csalustiano@gmail.com</a><p>Segunda a sexta, das 8h às 19h</p><p>Pedidos online em preparação.</p></section>'+
'</div><div class="commerce-footer-end"><span>© '+new Date().getFullYear()+' SALUZ</span><span>Site em implantação · compras ainda não habilitadas</span></div></footer>';
document.querySelector(".topbar,.saluz-top")?.remove();
const oldHeader=document.querySelector("header.site-header,header.nav,header.commerce-header");
if(oldHeader)oldHeader.outerHTML=header;else document.body.insertAdjacentHTML("afterbegin",header);
const oldFooter=document.querySelector("footer.site-footer,footer:not(.commerce-footer)");
if(oldFooter)oldFooter.outerHTML=footer;else document.body.insertAdjacentHTML("beforeend",footer);
if(!isShop){
 const toggle=document.getElementById("menu-toggle"),nav=document.getElementById("loja-nav");
 toggle?.addEventListener("click",()=>{const active=toggle.getAttribute("aria-expanded")==="true";toggle.setAttribute("aria-expanded",String(!active));nav.classList.toggle("is-open",!active)});
 nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false")}));
}
})();