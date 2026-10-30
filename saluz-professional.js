/* SALUZ Backoffice — navegação rápida, saúde do catálogo e exportação local. */
(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const safe=(tag,className,label)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(label!==undefined)node.textContent=String(label);
    return node;
  };
  const tabs=[
    {tab:"overview",title:"Visão geral",desc:"Início e indicadores",keys:"inicio resumo dashboard"},
    {tab:"products",title:"Produtos",desc:"Catálogo, fotos e estoque",keys:"produtos adicionar categoria estoque fotos"},
    {tab:"campaigns",title:"Campanhas e ofertas",desc:"Banners, descontos e campanhas",keys:"banner promoção oferta desconto campanha"},
    {tab:"studio",title:"Aparência e links",desc:"Cores da marca, imagens, textos e links existentes",keys:"aparencia layout texto imagem home contato links"},
    {tab:"orders",title:"Pedidos",desc:"Acompanhar pedidos",keys:"compras encomendas atendimento"},
    {tab:"customers",title:"Clientes",desc:"Contatos dos pedidos",keys:"clientes cadastro"},
    {tab:"finance",title:"Simular taxas",desc:"Comparar taxas de pagamento",keys:"taxas mercado pago pix liquido"},
    {tab:"reports",title:"Resultados",desc:"Visitas e indicadores",keys:"relatorios analytics acessos visitas"},
  ];
  const descriptions={
    overview:"Acompanhe o catálogo, as campanhas e as tarefas importantes.",
    products:"Cadastre, encontre e atualize os produtos da sua loja.",
    campaigns:"Gerencie banners, promoções e ofertas do catálogo.",
    studio:"Personalize imagens, mensagens e links das áreas existentes.",
    orders:"Consulte e acompanhe pedidos registrados.",
    customers:"Veja os contatos associados aos pedidos.",
    finance:"Simule taxas e valores líquidos sem movimentar dinheiro.",
    reports:"Acompanhe visitas e interações registradas."
  };
  function activateTab(tab){
    const button=document.querySelector('[data-tab="'+tab+'"]');
    if(button)button.click();
    closeSearch();
  }
  function normalize(s){
    return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();
  }
  const search=el("admin-quick-search"),popover=el("admin-search-suggestions");
  function closeSearch(){
    popover.hidden=true;
    search.setAttribute("aria-expanded","false");
  }
  function executeSearch(item){
    if(item.tab==="products"&&item.query){
      const productSearch=el("product-search");
      productSearch.value=item.query;
      productSearch.dispatchEvent(new Event("input",{bubbles:true}));
    }
    activateTab(item.tab);
    search.value="";
  }
  function drawSuggestions(){
    const q=search.value.trim();
    popover.replaceChildren();
    if(!q){closeSearch();return;}
    const norm=normalize(q);
    let matches=tabs.filter(x=>normalize(x.title+" "+x.desc+" "+x.keys).includes(norm)).slice(0,6);
    const candidate=norm.replace(/[^\p{L}\p{N}\s-]/gu,"").slice(0,90);
    if(candidate&&!matches.some(x=>x.tab==="products")){
      matches=[...matches,{tab:"products",title:'Buscar produto: "'+candidate+'"',desc:"Pesquisar em todo o catálogo",query:candidate}];
    }
    if(!matches.length){closeSearch();return;}
    for(const item of matches){
      const button=safe("button","admin-search-result");button.type="button";button.setAttribute("role","option");
      const symbol=safe("span","admin-search-result-icon",item.tab==="products"?"▣":item.tab==="campaigns"?"◈":"⌕");
      const content=safe("span","admin-search-result-text");
      content.append(safe("strong","",item.title),safe("small","",item.desc));
      button.append(symbol,content,safe("span","admin-search-enter","↵"));
      button.addEventListener("click",()=>executeSearch(item));
      popover.append(button);
    }
    popover.hidden=false;search.setAttribute("aria-expanded","true");
  }
  search.addEventListener("input",drawSuggestions);
  search.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closeSearch();search.blur();return;}
    if(event.key==="Enter"){
      event.preventDefault();const first=popover.querySelector("button");if(first)first.click();
    }
    if(event.key==="ArrowDown"){
      const first=popover.querySelector("button");if(first){event.preventDefault();first.focus();}
    }
  });
  popover.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closeSearch();search.focus();}
    const buttons=[...popover.querySelectorAll("button")],n=buttons.indexOf(document.activeElement);
    if(event.key==="ArrowDown"&&n<buttons.length-1){event.preventDefault();buttons[n+1].focus();}
    if(event.key==="ArrowUp"){event.preventDefault();if(n>0)buttons[n-1].focus();else search.focus();}
  });
  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
      event.preventDefault();search.focus();search.select();
    }
  });
  document.addEventListener("click",event=>{
    if(!event.target.closest(".admin-global-search"))closeSearch();
  });
  window.addEventListener("saluz:tabchange",event=>{
    const tab=event.detail?.tab;
    el("section-description").textContent=descriptions[tab]||"Gerencie a sua loja em um só lugar.";
    if(tab==="overview")loadHealth();
    else healthCache=null;
    if(tab==="products")el("product-export-csv")?.removeAttribute("aria-busy");
  });
  const kpiConfigs=[
    ["total","Produtos cadastrados","▣","total"],
    ["active","Visíveis na loja","✓","active"],
    ["lowStock","Estoque baixo","!","warning"],
    ["banners","Banners ativos","◈","banner"],
  ];
  let healthCache=null,loading=false;
  function detailAction(tab,filter,searchText=""){
    activateTab(tab);
    if(tab==="products"){
      const input=el("product-search"),mode=el("product-filter");
      if(searchText){input.value=searchText;input.dispatchEvent(new Event("input",{bubbles:true}));}
      else if(filter&&input.value){input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));}
      if(filter){mode.value=filter;mode.dispatchEvent(new Event("change",{bubbles:true}));}
    }
  }
  function renderHealth(data){
    healthCache=data;
    const grid=el("overview-health-kpis");
    grid.replaceChildren();
    const numbers={...data.counts,banners:data.activeBanners};
    for(const [key,label,icon,tone] of kpiConfigs){
      const d1Banner=key==="banners"&&data.source==="D1 staging";
      const displayLabel=d1Banner?"Banners no D1":label;
      const card=safe("button","professional-kpi-card professional-kpi-"+tone);
      card.type="button";
      card.setAttribute("aria-label",displayLabel+": "+String(numbers[key]??0));
      card.append(safe("span","professional-kpi-symbol",icon));
      const number=safe("strong","professional-kpi-value",Number(numbers[key]||0).toLocaleString("pt-BR"));
      const main=safe("span","professional-kpi-label",displayLabel);
      const footer=safe("span","professional-kpi-foot",key==="total"?"Itens no catálogo":
        key==="active"?"Produtos publicados":
        key==="lowStock"?"De 1 a 5 unidades":d1Banner?"Editor ainda no legado":"Campanhas disponíveis");
      card.append(number,main,footer);
      if(d1Banner){
        card.setAttribute("aria-disabled","true");
        card.title="Editor de campanhas ainda não migrou para D1. Indicador apenas informativo.";
      }else{
        card.addEventListener("click",()=>{
          if(key==="banners")detailAction("campaigns");
          else detailAction("products",key==="lowStock"?"low":key==="active"?"active":"all");
        });
      }
      grid.append(card);
    }
    const source=data.source==="D1 staging"
      ?"Fonte: banco D1 de homologação (mesmo catálogo da vitrine de testes)."
      :"Fonte: integração anterior (Supabase).";
    el("overview-health-caption").textContent=data.truncated?
      "Resumo parcial: o catálogo excedeu 2.000 itens. "+source:
      "Última consulta: "+new Date(data.updatedAt).toLocaleString("pt-BR")+". "+source;
    const attention=el("overview-attention-list");attention.replaceChildren();
    const items=[];
    if(data.unpublished)items.push({icon:"✎",title:"Alterações aguardando publicação",subtitle:"Há um rascunho não publicado em Aparência e links ou Campanhas.",tab:"studio"});
    if(data.counts.outOfStock>0)items.push({icon:"!",title:data.counts.outOfStock+" produto(s) sem estoque",subtitle:"Revise as quantidades antes de divulgar os itens.",tab:"products",filter:"out"});
    if(data.counts.lowStock>0)items.push({icon:"!",title:data.counts.lowStock+" produto(s) com poucas unidades",subtitle:"Estoque baixo: entre 1 e 5 unidades restantes.",tab:"products",filter:"low"});
    if(data.scheduledBanners>0)items.push({icon:"◷",title:data.scheduledBanners+" banner(s) programado(s)",subtitle:"Campanhas com início agendado para uma data futura.",tab:"campaigns"});
    if(data.counts.hidden>0)items.push({icon:"◌",title:data.counts.hidden+" produto(s) oculto(s)",subtitle:"Eles não aparecem para clientes até a ativação.",tab:"products",filter:"inactive"});
    if(!items.length){
      const good=safe("div","professional-attention-item is-success");
      good.append(safe("span","attention-item-icon","✓"),
        safe("span","attention-item-text","Nenhuma pendência encontrada no catálogo."));
      attention.append(good);
    }else{
      for(const item of items.slice(0,4)){
        const button=safe("button","professional-attention-item");button.type="button";
        const icon=safe("span","attention-item-icon",item.icon);
        const body=safe("span","attention-item-content");
        body.append(safe("strong","",item.title),safe("small","",item.subtitle));
        button.append(icon,body,safe("span","attention-arrow","↗"));
        button.addEventListener("click",()=>detailAction(item.tab,item.filter));
        attention.append(button);
      }
    }
  }
  async function loadHealth(force=false){
    if(loading||!el("overview-health-kpis"))return;
    if(healthCache&&!force){renderHealth(healthCache);return;}
    loading=true;
    if(force)el("overview-health-caption").textContent="Atualizando informações...";
    try{
      // Respect the identical D1 toggle used by the Products editor.
      // Never fall back to Supabase if a D1 staging query fails.
      const d1Preview=typeof saluzD1AdminPreview!=="undefined"&&saluzD1AdminPreview;
      const endpoint=d1Preview?"/api/migration-admin/store-health":"/api/admin/store-health";
      const res=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(data.error||"Erro na consulta");
      renderHealth(data);
    }catch(err){
      el("overview-health-kpis").replaceChildren(safe("p","muted","Não foi possível carregar o catálogo agora."));
      el("overview-attention-list").replaceChildren(safe("p","muted","Atualize a página ou tente novamente."));
      el("overview-health-caption").textContent="Erro ao consultar dados. Nenhuma alteração foi feita.";
    }finally{loading=false;}
  }
  el("health-refresh").addEventListener("click",()=>loadHealth(true));
  function safeCell(value){
    let str=String(value??"");
    if(/^[\s]*[=+\-@\t\r]/.test(str))str="'"+str;
    return '"'+str.replaceAll('"','""')+'"';
  }
  async function exportCatalog(){
    const button=el("product-export-csv");
    if(button.disabled)return;
    button.disabled=true;button.setAttribute("aria-busy","true");
    const label=button.textContent;button.textContent="Preparando catálogo...";
    try{
      const records=[];
      let more=true,page=1;
      while(more&&page<=100){
        const res=await fetch("/api/admin/products?page="+page,{credentials:"same-origin",cache:"no-store"});
        if(!res.ok)throw Error("Não foi possível consultar o catálogo.");
        const data=await res.json();
        records.push(...(data.products||[]));
        more=data.has_more===true;page++;
      }
      if(more)throw Error("Exportação excedeu 4.800 itens. Solicite uma exportação completa antes de continuar.");
      const headers=["Nome","Categoria","Preço atual (R$)","Preço anterior (R$)","Visível","Destaque","Unidades","Cores e tamanhos"];
      const rows=records.map(p=>[
        p.name,p.category,(Number(p.price_cents||0)/100).toFixed(2).replace(".",","),
        Number(p.original_price_cents)>0?(Number(p.original_price_cents)/100).toFixed(2).replace(".",","):"",
        p.is_active?"Sim":"Não",p.is_featured?"Sim":"Não",
        (Array.isArray(p.variants)?p.variants:[]).reduce((sum,v)=>sum+Math.max(0,Number(v.stock)||0),0),
        (Array.isArray(p.variants)?p.variants:[]).map(v=>[v.color,v.size,v.stock].join(" / ")).join("; ")
      ]);
      const csv="\ufeff"+[headers,...rows].map(row=>row.map(safeCell).join(";")).join("\r\n");
      const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
      const link=document.createElement("a");
      link.href=url;link.download="saluz-catalogo-"+new Date().toISOString().slice(0,10)+".csv";
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      const msg=el("admin-page-status");if(msg)msg.textContent="Exportação do catálogo concluída: "+records.length+" produto(s).";
    }catch(err){
      const msg=el("admin-page-status");if(msg)msg.textContent=err.message;
    }finally{button.disabled=false;button.removeAttribute("aria-busy");button.textContent=label;}
  }
  el("product-export-csv").addEventListener("click",exportCatalog);
})();
