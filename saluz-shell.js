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
  /* Menu de categorias: hover no desktop, toque/click no celular e teclado. */
  if(mega){
    const summary=mega.querySelector("summary");
    const hoverQuery=window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 931px)");
    const canHover=()=>hoverQuery.matches;
    let hoverTimer;
    const cancelTimer=()=>window.clearTimeout(hoverTimer);
    mega.addEventListener("pointerenter",e=>{
      if(e.pointerType==="mouse"&&canHover()){cancelTimer();mega.open=true;}
    });
    mega.addEventListener("pointerleave",e=>{
      if(e.pointerType==="mouse"&&canHover()){
        cancelTimer();
        hoverTimer=window.setTimeout(()=>{
          if(!mega.matches(":hover")&&!mega.contains(document.activeElement))mega.open=false;
        },130);
      }
    });
    mega.addEventListener("focusin",()=>{cancelTimer();mega.open=true;});
    mega.addEventListener("focusout",e=>{
      if(!mega.contains(e.relatedTarget)){
        window.setTimeout(()=>{if(!mega.contains(document.activeElement)&&!mega.matches(":hover"))mega.open=false;},100);
      }
    });
    mega.addEventListener("keydown",e=>{
      if(e.key==="Escape"){
        e.preventDefault();cancelTimer();mega.open=false;summary?.focus();
      }
    });
    document.addEventListener("pointerdown",e=>{
      if(!mega.contains(e.target))mega.open=false;
    });
    window.addEventListener("resize",()=>{
      if(!canHover()&&!nav?.classList.contains("is-open"))mega.open=false;
    },{passive:true});
  }

  /* Movimento delicado: conteúdo continua visível sem JavaScript ou para movimento reduzido. */
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(!reducedMotion.matches&&"IntersectionObserver" in window){
    const revealTargets=[
      ...document.querySelectorAll("main > section, main .quick-categories, main .product-section, main .collections, main .category-list-section, main .commerce-page-intro, main .commerce-editorial, main .commerce-next"),
      ...document.querySelectorAll(".category-card, .collection-tile, .collection-index-card, .product-card, .category-product")
    ];
    const unique=[...new Set(revealTargets)].filter(el=>el instanceof HTMLElement);
    const observer=new IntersectionObserver((entries,watcher)=>{
      for(const entry of entries){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          watcher.unobserve(entry.target);
        }
      }
    },{rootMargin:"0px 0px -5% 0px",threshold:0.04});
    for(const el of unique){
      const bounds=el.getBoundingClientRect();
      if(bounds.top>innerHeight*0.85){
        el.classList.add("saluz-reveal");
        observer.observe(el);
      }
    }
  }

  // A busca do menu leva diretamente ao campo de pesquisa da vitrine.
  document.querySelectorAll(".commerce-search").forEach(link=>{
    link.href="./loja.html?busca=1#produtos";
    if(location.pathname.endsWith("/loja.html")){
      link.addEventListener("click",event=>{
        event.preventDefault();
        const field=document.getElementById("search");
        if(!field)return;
        field.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
        field.focus({preventScroll:true});
      });
    }
  });
  document.querySelectorAll("[data-commerce-year]").forEach(el=>el.textContent=String(new Date().getFullYear()));
  const refreshFavoritesCount=()=>{
    const count=window.SaluzFavorites?.count()||0;
    document.querySelectorAll("[data-favorites-count]").forEach(el=>el.textContent=String(count));
  };
  refreshFavoritesCount();
  window.addEventListener("saluz:favorites",refreshFavoritesCount);
  window.addEventListener("storage",event=>{
    if(event.key==="saluz-favorites-v1"||event.key===null)refreshFavoritesCount();
  });
  const refreshBagCount=()=>{
    let count=0;
    if(window.SaluzBag){
      count=window.SaluzBag.count(window.SaluzBag.read());
    }else{
      try{
        const bag=JSON.parse(localStorage.getItem("saluz-bag-v1")||"[]");
        count=Array.isArray(bag)?
          bag.reduce((total,item)=>total+Math.max(0,Math.min(10,Number(item.quantity)||0)),0):0;
      }catch{}
    }
    document.querySelectorAll("[data-bag-count]").forEach(el=>el.textContent=String(count));
  };
  refreshBagCount();
  window.addEventListener("storage",event=>{
    if(event.key==="saluz-bag-v1"||event.key===null)refreshBagCount();
  });
})();
/* Modo diagnóstico apenas na loja já aprovada em homologação:
   adicionar ?d1=1 ao endereço da loja, ou ?d1=0 para desativar. */
(()=>{
 const isStage=window.location?.hostname==="homologacao.saluz-loja.pages.dev";
 let enabled=false;
 if(isStage){
  const value=new URLSearchParams(window.location.search).get("d1");
  try{
   if(value==="1")window.sessionStorage.setItem("saluz-d1-preview","1");
   if(value==="0")window.sessionStorage.removeItem("saluz-d1-preview");
   enabled=window.sessionStorage.getItem("saluz-d1-preview")==="1";
  }catch{enabled=value==="1";}
 }
 window.saluzD1PreviewEnabled=enabled;
 window.saluzD1PreviewUrl=path=>{
  if(!enabled||typeof path!=="string"||!/^\/api\/(?:products(?:\/|\?|$)|site-content(?:\?|$))/.test(path))return path;
  const url=new URL(path,window.location.origin);
  url.searchParams.set("source","d1");
  return url.pathname+url.search;
 };
})();
