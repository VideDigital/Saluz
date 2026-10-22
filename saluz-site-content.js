/* SALUZ: textos e links das secoes existentes. O editor salva rascunhos separados. */
(()=>{"use strict";
const allowedLinks=new Set(["./loja.html","./colecoes.html","./colecao-necessaires.html",
 "./colecao-porta-joias.html","./colecao-kits-presentes.html","./colecao-autocuidado.html","./atendimento.html"]);
const map={
 top_bar:".commerce-top span:nth-child(2)",
 hero_title:".hero-content h1",
 hero_description:".hero-content > p:not(.eyebrow)",
 hero_button:".hero-actions .button-dark",
 featured_title:"#featured-title",
 featured_description:".home-commerce#destaques .home-commerce-heading p:not(.eyebrow)",
 new_title:"#new-title",
 new_description:".home-commerce#novidades .home-commerce-heading p:not(.eyebrow)"
};
const validImage=u=>typeof u==="string"&&/^https:\/\/[^\s<>"']+$/.test(u);
(async()=>{
 try{
  const res=await fetch((window.saluzD1PreviewUrl?.("/api/site-content")||"/api/site-content"),{cache:"no-store"});
  if(!res.ok)return;
  const {content:c}=await res.json();
  if(!c||typeof c!=="object")return;
  for(const [key,selector] of Object.entries(map)){
   const value=String(c[key]||"").trim();
   const node=document.querySelector(selector);
   if(value&&node)node.textContent=value;
  }
  // Cards promocionais e kits originais: alterar conteudo, nunca estrutura ou URLs externas.
  const fixed={
    moment_label:".promo-moment .promo-copy .eyebrow",
    moment_title:".promo-moment .promo-copy h2",
    gift_label:".promo-gift .promo-copy .eyebrow",
    gift_title:".promo-gift .promo-copy h2",
    gift_description:".promo-gift .promo-copy > p:not(.eyebrow)",
    kits_title:".kits-section .section-title h2"
  };
  for(const [key,selector] of Object.entries(fixed)){
    const value=String(c[key]||"").trim(),element=document.querySelector(selector);
    if(element&&value)element.textContent=value;
  }
  document.querySelectorAll(".promo-moment .moment-links a").forEach((a,index)=>{
    const n=index+1,label=String(c["moment_link"+n+"_title"]||"").trim();
    const href=c["moment_link"+n+"_href"];
    if(label){
      const textNode=Array.from(a.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
      if(textNode)textNode.textContent=label+" ";
    }
    if(allowedLinks.has(href))a.href=href;
  });
  const giftButton=document.querySelector(".promo-gift .promo-copy a.text-link");
  if(giftButton){
    if(c.gift_button)giftButton.textContent=String(c.gift_button).slice(0,48)+" ↗";
    if(allowedLinks.has(c.gift_link)||c.gift_link==="#kits")giftButton.href=c.gift_link;
  }
  document.querySelectorAll(".kits-section .kit-card").forEach((card,index)=>{
    const n=index+1;
    for(const [key,selector] of [["title","h3"],["description","p"]]){
      const value=String(c["kit"+n+"_"+key]||"").trim();
      const el=card.querySelector(selector);if(value&&el)el.textContent=value;
    }
    const href=c["kit"+n+"_link"];
    const link=card.querySelector("a");if(link&&allowedLinks.has(href))link.href=href;
  });
  if(validImage(c.moment_image_url)){
    const moment=document.querySelector(".promo-moment");
    if(moment){moment.classList.add("saluz-promo-moment-photo");
      moment.style.backgroundImage="linear-gradient(110deg,#281f2ea8,#281f2e40),url("+JSON.stringify(c.moment_image_url)+")";
      moment.style.backgroundSize="cover";moment.style.backgroundPosition="center";}
  }
  if(validImage(c.gift_image_url)){
    const gift=document.querySelector(".promo-gift .gift-visual");
    if(gift){gift.classList.add("saluz-promo-gift-photo");
      gift.style.backgroundImage="url("+JSON.stringify(c.gift_image_url)+")";
      gift.style.backgroundSize="cover";gift.style.backgroundPosition="center";}
  }
  if(allowedLinks.has(c.hero_link)){
   const link=document.querySelector(".hero-actions .button-dark");
   if(link)link.href=c.hero_link;
  }
  if(c.business_hours){
   document.querySelectorAll(".commerce-footer section:last-of-type p, .trust-strip div small").forEach(node=>{
    if(/segunda|sexta|sábado|domingo|dias úteis/i.test(node.textContent))node.textContent=c.business_hours;
   });
  }
  if(c.contact_email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact_email)){
   document.querySelectorAll('a[href^="mailto:"]').forEach(node=>{
    node.href="mailto:"+c.contact_email;node.textContent=c.contact_email;
   });
  }
  if(c.whatsapp_number){
   const digits=String(c.whatsapp_number).replace(/\D/g,"");
   if(digits.length>=10&&digits.length<=13){
    const footer=document.querySelector(".commerce-footer section:last-of-type");
    if(footer){
     const a=document.createElement("a");a.href="https://wa.me/"+(digits.startsWith("55")?digits:"55"+digits);
     a.textContent="Falar no WhatsApp ↗";a.target="_blank";a.rel="noopener noreferrer";
     footer.append(a);
    }
   }
  }
  if(c.instagram_url&&/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]{1,30}\/?$/.test(c.instagram_url)){
   const footer=document.querySelector(".commerce-footer section:last-of-type");
   if(footer){
    const a=document.createElement("a");a.href=c.instagram_url;
    a.textContent="Instagram SALUZ ↗";a.target="_blank";a.rel="noopener noreferrer";
    footer.append(a);
   }
  }
  if(validImage(c.hero_image_url)){
   const art=document.querySelector(".hero-visual");
   if(art){
    art.style.backgroundImage="linear-gradient(#34252a12,#34252a12),url("+JSON.stringify(c.hero_image_url)+")";
    art.style.backgroundPosition="center";art.style.backgroundSize="cover";
    art.classList.add("saluz-editorial-image");
   }
  }
  if(c.store_notice){
   const top=document.querySelector(".commerce-top");
   if(top){
    const node=document.createElement("div");
    node.className="saluz-studio-notice";
    node.textContent=String(c.store_notice).slice(0,170);
    top.insertAdjacentElement("afterend",node);
   }
  }
  if(c.promo_enabled==="yes"&&c.promo_title&&document.querySelector("#destaques")){
   const banner=document.createElement("section");
   banner.className="saluz-editable-banner";banner.setAttribute("aria-label","Destaque da SALUZ");
   const inner=document.createElement("div");inner.className="saluz-editable-banner-text";
   const kicker=document.createElement("span");kicker.textContent="✦ DESTAQUE SALUZ";kicker.className="saluz-editable-banner-kicker";
   const heading=document.createElement("h2");heading.textContent=String(c.promo_title).slice(0,90);
   const desc=document.createElement("p");desc.textContent=String(c.promo_description||"").slice(0,220);
   const button=document.createElement("a");button.href=allowedLinks.has(c.promo_link)?c.promo_link:"./loja.html";
   button.textContent=String(c.promo_button||"Ver coleção").slice(0,48)+" ↗";
   inner.append(kicker,heading,desc,button);
   banner.append(inner);
   if(validImage(c.promo_image_url)){
    const photo=document.createElement("div");photo.className="saluz-editable-banner-photo";
    photo.style.backgroundImage="url("+JSON.stringify(c.promo_image_url)+")";
    banner.append(photo);
   }
   document.querySelector("#destaques").before(banner);
  }
  // Vitrine de campanhas: somente posicoes existentes, sem criar paginas.
  const placements={
    home_after_hero:[".hero","after"],home_before_featured:["#destaques","before"],
    home_before_new:["#novidades","before"],home_bottom:["main","append"],
    catalog_after_hero:[".lead","after"],catalog_before_products:["#produtos","before"],
    catalog_bottom:[".contact","before"]
  };
  const styles=new Set(["editorial","compact","image"]);
  const placeCounts=new Map(),groups=new Map();
  if(Array.isArray(c.banners)){
   for(const b of c.banners.slice(0,24)){
    if(!b||!b.active||!placements[b.placement]||!styles.has(b.style)||!b.title)continue;
    const now=Date.now();
    if(b.starts_at&&(!Number.isFinite(Date.parse(b.starts_at))||now<Date.parse(b.starts_at)))continue;
    if(b.ends_at&&(!Number.isFinite(Date.parse(b.ends_at))||now>=Date.parse(b.ends_at)))continue;
    const count=placeCounts.get(b.placement)||0;
    if(count>=4)continue;
    const [selector]=placements[b.placement];
    if(!document.querySelector(selector))continue;
    const section=document.createElement("section");
    section.className="saluz-campaign-banner saluz-campaign-"+b.style;
    section.setAttribute("aria-label","Campanha SALUZ: "+String(b.title).slice(0,90));
    const copy=document.createElement("div");copy.className="saluz-campaign-copy";
    if(b.eyebrow){
     const eyebrow=document.createElement("span");eyebrow.className="saluz-campaign-eyebrow";
     eyebrow.textContent=String(b.eyebrow).slice(0,42);copy.append(eyebrow);
    }
    const title=document.createElement("h2");title.textContent=String(b.title).slice(0,90);copy.append(title);
    if(b.description){const description=document.createElement("p");description.textContent=String(b.description).slice(0,230);copy.append(description);}
    const dest=allowedLinks.has(b.link)?b.link:"./loja.html";
    const link=document.createElement("a");link.href=dest;
    link.textContent=String(b.button_label||"Ver produtos").slice(0,48)+" ↗";
    copy.append(link);
    section.append(copy);
    if(validImage(b.image_url)){
     const picture=document.createElement("picture");picture.className="saluz-campaign-picture";
     if(validImage(b.mobile_image_url)){
      const source=document.createElement("source");source.media="(max-width: 700px)";
      source.srcset=b.mobile_image_url;picture.append(source);
     }
     const image=document.createElement("img");image.loading="lazy";image.decoding="async";
     image.src=b.image_url;image.alt=b.title;
     picture.append(image);section.append(picture);
    }
    if(!groups.has(b.placement))groups.set(b.placement,document.createDocumentFragment());
    groups.get(b.placement).append(section);
    placeCounts.set(b.placement,count+1);
   }
   for(const [place,fragment] of groups){
    const [selector,action]=placements[place],anchor=document.querySelector(selector);
    if(!anchor)continue;
    if(action==="before")anchor.before(fragment);
    else if(action==="after")anchor.after(fragment);
    else anchor.append(fragment);
   }
  }
 }catch{console.warn("SALUZ: pagina usando o conteudo padrao");}
})();
})();