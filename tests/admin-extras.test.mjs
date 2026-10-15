import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("admin.html","utf8");
const main=fs.readFileSync("admin.js","utf8");
const extra=fs.readFileSync("saluz-admin-extras.js","utf8");
const style=fs.readFileSync("saluz-admin-improvements.css","utf8");

test("painel inclui seis áreas com navegação e scripts carregados",()=>{
  for(const tab of ["overview","orders","customers","products","finance","reports"]){
    assert.match(html,new RegExp('data-tab="'+tab+'"'));
    assert.match(html,new RegExp('id="tab-'+tab+'"'));
  }
  for(const id of ["fee-form","fee-amount","fee-results","fee-table","customers-list","overview-kpis"])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.includes('saluz-admin-extras.js'));
  assert.ok(html.includes('saluz-admin-improvements.css'));
  assert.match(style,/@media\(max-width:680px\)/);
  new vm.Script(main);new vm.Script(extra);
});

test("taxas configuradas são persistidas e comparadas sem intermediador de pagamento",()=>{
  const nodes=new Map();
  class Element{
    constructor(tag="div"){this.tagName=tag;this.children=[];this.listeners={};this.dataset={};this.value="";this.hidden=false;this.textContent="";}
    addEventListener(name,cb){this.listeners[name]=cb;}
    replaceChildren(...nodes){this.children=nodes;}
    append(...nodes){this.children.push(...nodes);}
    reset(){}
    scrollIntoView(){}
  }
  const element=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  const local=new Map();
  const context={
    document:{getElementById:element,createElement:tag=>new Element(tag),querySelector:()=>new Element()},
    localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},
    window:{},crypto:{randomUUID:()=>"test-id"},Date,Number,String,Array,Object,Math,JSON,Intl
  };
  vm.runInNewContext(extra,context);
  context.window.SaluzAdminExtras.openFinance();
  const values={"fee-name":"Mercado Pago","fee-method":"Crédito","fee-installments":"1",
    "fee-receipt":"30","fee-percent":"4.5","fee-fixed":"0.4","fee-amount":"100"};
  for(const [id,v] of Object.entries(values))element(id).value=v;
  element("fee-form").listeners.submit({preventDefault(){}});
  const profiles=JSON.parse(local.get("saluz.admin.finance.rates.v1"));
  assert.equal(profiles.length,1);
  assert.equal(profiles[0].percent,4.5);
  assert.equal(profiles[0].fixedCents,40);
  const results=element("fee-results").children;
  assert.ok(results.some(x=>x.textContent==="R$ 95,10" || x.textContent==="R$ 95,10"));
});
