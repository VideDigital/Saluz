/* SALUZ — interações do cabeçalho compartilhado.
   O HTML do cabeçalho e do rodapé já está nas páginas; não substituí-los ao carregar. */
(()=>{
  const menu=document.getElementById("menu-toggle");
  const nav=document.getElementById("loja-nav");
  const mega=nav?.querySelector(".commerce-mega");
  const closeMenu=()=>{
    if(!menu||!nav)return;
    menu.setAttribute("aria-expanded","false");
    menu.setAttribute("aria-label","Abrir menu");
    nav.classList.remove("is-open");
    if(mega)mega.open=false;
  };
  if(menu&&nav){
    menu.addEventListener("click",()=>{
      const active=menu.getAttribute("aria-expanded")==="true";
      menu.setAttribute("aria-expanded",String(!active));
      menu.setAttribute("aria-label",active?"Abrir menu":"Fechar menu");
      nav.classList.toggle("is-open",!active);
      if(active&&mega)mega.open=false;
    });
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMenu));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();});
    document.addEventListener("click",e=>{
      if(!e.target.closest(".commerce-header"))closeMenu();
    });
  }
  document.querySelectorAll("[data-commerce-year]").forEach(el=>el.textContent=String(new Date().getFullYear()));
  try{
    const bag=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");
    const quantity=Array.isArray(bag)?bag.reduce((total,item)=>total+Math.max(0,Number(item.quantity)||0),0):0;
    document.querySelectorAll("[data-bag-count]").forEach(el=>el.textContent=String(quantity));
  }catch{}
})();