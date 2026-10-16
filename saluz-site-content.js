/* SALUZ Studio: aplica exclusivamente texto publico, nunca HTML nao confiavel. */
(()=>{"use strict";
const map={
 top_bar:".commerce-top span:nth-child(2)",
 hero_title:".hero-content h1",
 hero_description:".hero-content > p:not(.eyebrow)",
 hero_button:".hero-actions .button-dark",
 featured_title:"#featured-title",
 featured_description:".home-commerce#destaques .home-commerce-heading p:not(.eyebrow)",
 new_title:"#new-title",
 new_description:".home-commerce#novidades .home-commerce-heading p:not(.eyebrow)",
 business_hours:".commerce-footer section:last-of-type p:nth-of-type(1)"
};
(async()=>{
 try{
  const res=await fetch("/api/site-content",{cache:"no-store"});
  if(!res.ok)return;
  const {content:c}=await res.json();
  if(!c||typeof c!=="object")return;
  for(const [key,selector] of Object.entries(map)){
   const value=String(c[key]||"").trim();
   const el=document.querySelector(selector);
   if(value&&el)el.textContent=value;
  }
  if(c.top_bar){
   document.querySelectorAll(".commerce-top span:nth-child(2)").forEach(el=>el.textContent=c.top_bar);
  }
  if(c.business_hours){
   document.querySelectorAll(".commerce-footer section:last-of-type p").forEach(el=>{if(/segunda|sexta|sábado|domingo/i.test(el.textContent))el.textContent=c.business_hours});
  }
  if(c.contact_email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.contact_email)){
   document.querySelectorAll('a[href^="mailto:"]').forEach(el=>{el.href="mailto:"+c.contact_email;el.textContent=c.contact_email});
  }
  if(c.hero_image_url && /^https:\/\//i.test(c.hero_image_url)){
   const visual=document.querySelector(".hero-visual");
   if(visual){ visual.style.backgroundImage="linear-gradient(#0001,#0001),url("+JSON.stringify(c.hero_image_url)+")";visual.style.backgroundSize="cover";visual.style.backgroundPosition="center"; }
  }
  if(c.store_notice){
   const notice=document.createElement("div");notice.className="saluz-studio-notice";notice.textContent=c.store_notice;
   const top=document.querySelector(".commerce-top");if(top)top.insertAdjacentElement("afterend",notice);
  }
 }catch(e){console.warn("SALUZ: conteudo editorial indisponivel");}
})();
})();