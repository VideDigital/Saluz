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
  const res=await fetch("/api/site-content",{cache:"no-store"});
  if(!res.ok)return;
  const {content:c}=await res.json();
  if(!c||typeof c!=="object")return;
  for(const [key,selector] of Object.entries(map)){
   const value=String(c[key]||"").trim();
   const node=document.querySelector(selector);
   if(value&&node)node.textContent=value;
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
 }catch{console.warn("SALUZ: pagina usando o conteudo padrao");}
})();
})();