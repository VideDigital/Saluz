// Analytics consent for home; no visitor personal data is captured.
(function(){
 const existing=localStorage.getItem("saluz-analytics");
 const record=(type,label)=>{
  if(localStorage.getItem("saluz-analytics")!=="accepted")return;
  let id=sessionStorage.getItem("saluz-session");
  if(!id){id=crypto.randomUUID();sessionStorage.setItem("saluz-session",id);}
  fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({session_id:id,event_type:type,page_path:location.pathname,event_label:label||""}),
   keepalive:true}).catch(()=>{});
 };
 if(existing==="accepted")record("page_view","");
 if(!existing){
  const bar=document.createElement("aside");bar.className="analytics-banner";
  bar.textContent="Podemos registrar visitas e cliques de forma agregada para melhorar a loja? Isso é opcional.";
  const row=document.createElement("div");row.className="analytics-actions";
  for(const [label,value] of [["Não aceitar","declined"],["Aceitar métricas","accepted"]]){
   const btn=document.createElement("button");btn.type="button";btn.textContent=label;
   btn.className="analytics-choice"+(value==="accepted"?" primary":"");
   btn.onclick=()=>{localStorage.setItem("saluz-analytics",value);bar.remove();if(value==="accepted")record("page_view","");};
   row.append(btn);
  }
  bar.append(row);document.body.append(bar);
 }
 for(const a of document.querySelectorAll('a[href^="mailto:"],a[href^="https://wa.me/"]')) {
  a.addEventListener("click",()=>record("contact_click",a.href.startsWith("mailto:")?"email":"whatsapp"));
 }
})();