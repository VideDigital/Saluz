/* SALUZ Admin: overview, customer summaries and independent fee simulator. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const txt = (tag, value, className) => {
    const node = document.createElement(tag);
    node.textContent = String(value == null ? "" : value);
    if (className) node.className = className;
    return node;
  };
  const reais = cents => (cents / 100).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
  const asCents = n => Math.round(Number(n || 0) * 100);
  const dt = x => x ? new Date(x).toLocaleDateString("pt-BR") : "—";
  const ORDERS_MAX = 150;
  let customers = [], profiles = [], initialized = false;
  const STORAGE_KEY = "saluz.admin.finance.rates.v1";

  function summarize(rows) {
    const found = new Map();
    for (const order of rows) {
      const email = String(order.customer_email || "").trim().toLowerCase();
      const phone = String(order.customer_phone || "").replace(/\D/g,"");
      const key = email || phone || String(order.id);
      const previous = found.get(key) || {name:"",email,phone,orders:0,paidCents:0,last:""};
      previous.name = previous.name || String(order.customer_name || "Cliente");
      previous.email = previous.email || email;
      previous.phone = previous.phone || phone;
      previous.orders++;
      if (order.status === "pago_confirmado") previous.paidCents += Number(order.subtotal_cents || 0);
      if (!previous.last || Date.parse(order.created_at)>Date.parse(previous.last)) previous.last = order.created_at;
      found.set(key, previous);
    }
    return [...found.values()].sort((a,b)=>Date.parse(b.last)-Date.parse(a.last));
  }
  const makeStat = (label, number, details) => {
    const card = txt("div","","management-kpi");
    card.append(txt("small",label),txt("strong",number),txt("span",details));
    return card;
  };
  async function loadOverview() {
    const root = el("overview-kpis"), recent = el("overview-recent");
    root.replaceChildren(txt("p","Carregando indicadores...","muted"));
    try {
      const response = await api("admin/orders");
      const rows = Array.isArray(response.orders) ? response.orders : [];
      const pending = rows.filter(o=>!["pago_confirmado","enviado","cancelado"].includes(o.status)).length;
      const markedPaid = rows.filter(o=>o.status==="pago_confirmado");
      const markedPaidCents = markedPaid.reduce((sum,o)=>sum+Number(o.subtotal_cents||0),0);
      const unique = summarize(rows);
      root.replaceChildren(
        makeStat("Pedidos recentes",rows.length,"Últimos "+ORDERS_MAX+" registros"),
        makeStat("Em atendimento",pending,"Acompanhar no painel"),
        makeStat("Clientes identificados",unique.length,"Nos pedidos recentes"),
        makeStat("Total marcado como pago",reais(markedPaidCents),"Sem conciliação bancária")
      );
      recent.replaceChildren();
      if (!rows.length) {
        recent.append(txt("p","Ainda não há pedidos registrados. O checkout permanece desativado.","panel-empty"));
        return;
      }
      for (const o of rows.slice(0,6)) {
        const row=txt("div","","panel-data-row"), info=txt("div"), right=txt("div","","panel-data-right");
        info.append(txt("strong",o.customer_name||"Cliente"),txt("small",dt(o.created_at)+" · "+String(o.status||"").replaceAll("_"," ")));
        right.append(txt("strong",reais(Number(o.subtotal_cents||0))));
        row.append(info,right);recent.append(row);
      }
    } catch (err) {
      root.replaceChildren(txt("p","Não foi possível carregar indicadores: "+err.message,"muted"));
      recent.replaceChildren(txt("p","Tente atualizar os dados.","muted"));
    }
  }

  function renderCustomers(q = "") {
    const root=el("customers-list");
    root.replaceChildren();
    const normalized=String(q).trim().toLocaleLowerCase("pt-BR");
    const matching=customers.filter(c=>[c.name,c.email,c.phone].some(v=>String(v).toLocaleLowerCase("pt-BR").includes(normalized)));
    if (!matching.length) {
      root.append(txt("p",normalized?"Nenhum cliente encontrado.":"Nenhum cliente registrado nos pedidos recentes.","panel-empty"));
      return;
    }
    for(const c of matching) {
      const row=txt("div","","panel-data-row customer-item");
      const details=txt("div","","customer-contact");
      details.append(txt("strong",c.name),txt("small",c.email||"Sem e-mail"),txt("small",c.phone||"Sem telefone"));
      const metrics=txt("div","","panel-data-right");
      metrics.append(txt("strong",c.orders+" pedido"+(c.orders===1?"":"s")),txt("small","Último: "+dt(c.last)),txt("small","Marcado como pago: "+reais(c.paidCents)));
      row.append(details,metrics);root.append(row);
    }
  }
  async function loadCustomers() {
    const root=el("customers-list");
    root.replaceChildren(txt("p","Carregando clientes...","muted"));
    try {
      const response=await api("admin/orders");
      customers=summarize(Array.isArray(response.orders)?response.orders:[]);
      renderCustomers(el("customer-search").value);
    } catch(err) {root.replaceChildren(txt("p","Não foi possível carregar clientes: "+err.message,"muted"));}
  }
  function validProfile(row) {
    return row && typeof row.id==="string" && typeof row.name==="string" && row.name.length<=80 &&
      ["Crédito","Débito","Pix","Boleto","Outro"].includes(row.method) &&
      Number.isInteger(row.installments) && row.installments>=1 && row.installments<=24 &&
      Number.isInteger(row.receiptDays) && row.receiptDays>=0 && row.receiptDays<=365 &&
      Number.isFinite(row.percent) && row.percent>=0 && row.percent<=100 &&
      Number.isInteger(row.fixedCents) && row.fixedCents>=0 && row.fixedCents<=10000000;
  }
  function readSaved() {
    try {
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      profiles=Array.isArray(value)?value.filter(validProfile).slice(0,100):[];
    } catch {profiles=[];el("fee-feedback").textContent="Não foi possível ler as taxas salvas neste navegador.";}
  }
  function persist() {
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(profiles));return true;}
    catch {el("fee-feedback").textContent="Não foi possível salvar neste navegador. Verifique o armazenamento/cookies.";return false;}
  }
  function calculate(cents, rate) {
    const variable=Math.round(cents * rate.percent / 100);
    const discount=variable + rate.fixedCents;
    return {fee:discount,net:cents-discount};
  }
  function renderComparison() {
    const root=el("fee-results");
    root.replaceChildren();
    if (!profiles.length) {root.append(txt("p","Cadastre uma taxa para iniciar a comparação.","panel-empty"));return;}
    const amount=Number(el("fee-amount").value);
    if (!Number.isFinite(amount)||amount<0||amount>1000000) {
      root.append(txt("p","Informe uma venda entre R$ 0 e R$ 1.000.000.","muted"));return;
    }
    const cents=asCents(amount);
    const ordered=profiles.map(p=>({p,...calculate(cents,p)})).sort((a,b)=>b.net-a.net);
    const best=ordered[0];
    root.append(txt("small","MAIOR VALOR LÍQUIDO ESTIMADO","eyebrow"));
    root.append(txt("strong",reais(best.net),"fee-best-value"));
    root.append(txt("p",best.p.name+" · "+best.p.method+" · "+best.p.installments+"x · recebimento em "+best.p.receiptDays+" dia(s)","muted"));
    for (const [index,v] of ordered.entries()) {
      const line=txt("div","","fee-comparison-row");
      const desc=txt("div");desc.append(txt("strong",v.p.name+" — "+v.p.method+" "+v.p.installments+"x"),txt("small","Taxa: "+reais(v.fee)+" · "+v.p.percent.toLocaleString("pt-BR")+"% + "+reais(v.p.fixedCents)));
      const net=txt("div","","panel-data-right");
      net.append(txt("strong",reais(v.net)),txt("small",index===0?"Melhor líquido nesta venda":"Diferença: "+reais(best.net-v.net)));
      line.append(desc,net);root.append(line);
    }
  }
  function renderProfiles() {
    const root=el("fee-table");root.replaceChildren();
    el("fee-count").textContent=profiles.length+" condição(ões)";
    if (!profiles.length){root.append(txt("p","Nenhuma taxa cadastrada. Preencha o formulário acima.","panel-empty"));renderComparison();return;}
    for (const p of profiles) {
      const row=txt("div","","fee-profile-row");
      const info=txt("div");
      info.append(txt("strong",p.name+" · "+p.method+" · "+p.installments+"x"),
        txt("small",p.percent.toLocaleString("pt-BR")+"% + "+reais(p.fixedCents)+" por operação · "+p.receiptDays+" dia(s)"));
      const buttons=txt("div","","fee-row-actions");
      const edit=txt("button","Editar","outline");
      edit.type="button";edit.addEventListener("click",()=>{
        el("fee-id").value=p.id;el("fee-name").value=p.name;el("fee-method").value=p.method;
        el("fee-installments").value=p.installments;el("fee-receipt").value=p.receiptDays;
        el("fee-percent").value=p.percent;el("fee-fixed").value=(p.fixedCents/100).toFixed(2);
        el("fee-form-title").textContent="Editar condição";el("fee-cancel").hidden=false;
        el("fee-form").scrollIntoView({behavior:"smooth",block:"start"});
      });
      const remove=txt("button","Excluir","outline danger-outline");
      remove.type="button";remove.addEventListener("click",()=>{
        profiles=profiles.filter(x=>x.id!==p.id);
        if(persist()){resetForm();el("fee-feedback").textContent="Condição excluída.";renderProfiles();}
      });
      buttons.append(edit,remove);row.append(info,buttons);root.append(row);
    }
    renderComparison();
  }
  function resetForm(){
    el("fee-form").reset();el("fee-id").value="";el("fee-form-title").textContent="Cadastrar uma taxa";
    el("fee-cancel").hidden=true;el("fee-receipt").value="30";el("fee-fixed").value="0";
  }
  function saveFee(event){
    event.preventDefault();
    const percent=Number(String(el("fee-percent").value).replace(",","."));
    const fixed=Number(String(el("fee-fixed").value).replace(",","."));
    const record={id:el("fee-id").value || (typeof crypto!=="undefined" && crypto.randomUUID?crypto.randomUUID():String(Date.now())),
      name:el("fee-name").value.trim(),method:el("fee-method").value,
      installments:Number(el("fee-installments").value),receiptDays:Number(el("fee-receipt").value),
      percent,fixedCents:asCents(fixed)};
    if(!record.name || !validProfile(record)){el("fee-feedback").textContent="Confira todos os campos e os limites das taxas.";return;}
    const at=profiles.findIndex(p=>p.id===record.id);
    if (at<0 && profiles.length>=100) {el("fee-feedback").textContent="Limite de 100 condições neste navegador.";return;}
    const next=at>=0?profiles.map((p,i)=>i===at?record:p):[...profiles,record];
    const previous=profiles;profiles=next;
    if(!persist()){profiles=previous;return;}
    resetForm();el("fee-feedback").textContent="Condição salva neste navegador.";renderProfiles();
  }
  // Bind listeners immediately so overview/clients buttons function before opening Financeiro.
  el("overview-refresh").addEventListener("click",loadOverview);
  el("overview-open-orders").addEventListener("click",()=>document.querySelector('[data-tab="orders"]').click());
  el("customers-refresh").addEventListener("click",loadCustomers);
  el("customer-search").addEventListener("input",e=>renderCustomers(e.target.value));
  function initFinance(){ if (!initialized){
    readSaved();
    el("fee-form").addEventListener("submit",saveFee);
    el("fee-amount").addEventListener("input",renderComparison);
    el("fee-cancel").addEventListener("click",resetForm);
    initialized=true;
  } renderProfiles();}
  window.SaluzAdminExtras={loadOverview,loadCustomers,openFinance:initFinance};
})();