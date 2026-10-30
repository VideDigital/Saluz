import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("admin.html","utf8");
const guide=readFileSync("saluz-admin-guide.js","utf8");
const styles=["saluz-admin-calm.css","saluz-admin-calm-components.css","saluz-admin-calm-guide.css"];
const tabs=["overview","products","campaigns","studio","orders","customers","finance","reports"];

test("o painel de oito abas importa o estilo final depois do tema legado",()=>{
 let last=html.indexOf("./saluz-professional.css");
 assert.ok(last>0);
 for(const path of styles){
  const index=html.indexOf("./"+path+"?v=20261030-calm1");
  assert.ok(index>last,"Carregar arquivo "+path+" depois da última camada de estilos");
  last=index;
  assert.ok(readFileSync(path,"utf8").length>800);
 }
 assert.match(html,/saluz-admin-guide\.js\?v=20261030-calm1/);
 for(const tab of tabs)assert.ok(html.includes('id="tab-'+tab+'"'));
});
test("guia contém orientações em todos os módulos, sem tocar pagamentos",()=>{
 for(const tab of tabs)assert.match(guide,new RegExp("\\b"+tab+":\\["));
 assert.equal((guide.match(/\["/g)||[]).length>=24,true);
 assert.doesNotMatch(guide,/fetch\(|localStorage|sessionStorage|\.innerHTML|MP_ACCESS_TOKEN/);
 new vm.Script(guide);
});
test("guias realmente entram nos oito módulos, com controles acessíveis",()=>{
 class FakeElement {
  constructor(tag="div"){this.tagName=tag;this.children=[];this.attrs={};this.className="";this.textContent="";}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  append(...els){this.children.push(...els);}
  prepend(el){this.children.unshift(el);}
  querySelector(){return null;}
 }
 const sections=Object.fromEntries(tabs.map(x=>["tab-"+x,new FakeElement()]));
 const nav=[new FakeElement("button"),new FakeElement("button")];
 nav[0].classList={contains:x=>x==="selected"};
 nav[1].classList={contains:()=>false};
 const listeners={};
 vm.runInNewContext(guide,{
  document:{
   createElement:tag=>new FakeElement(tag),
   getElementById:id=>sections[id]||null,
   querySelectorAll:()=>nav
  },
  window:{addEventListener:(name,cb)=>listeners[name]=cb}
 });
 for(const tab of tabs){
  assert.equal(sections["tab-"+tab].children.length,1);
  const section=sections["tab-"+tab].children[0];
  assert.equal(section.className,"saluz-guide");
  assert.ok(section.attrs["aria-label"].startsWith("Ajuda: "));
  const details=section.children.find(x=>x.tagName==="details");
  assert.ok(details,"Faltando explicação expansível: "+tab);
  const dl=details.children.find(x=>x.tagName==="dl");
  assert.equal(dl.children.length,3);
 }
 assert.equal(nav[0].attrs["aria-current"],"page");
 assert.equal(nav[1].attrs["aria-current"],undefined);
 assert.equal(typeof listeners["saluz:tabchange"],"function");
});
test("a publicação de homologação contém os arquivos e não ativa checkout",()=>{
 const build=readFileSync(".github/scripts/build-saluz-admin-preview.py","utf8");
 const workflow=readFileSync(".github/workflows/saluz-admin-staging-deploy.yml","utf8");
 for(const path of styles.concat("saluz-admin-guide.js"))assert.ok(build.includes('"'+path+'"'));
 assert.match(workflow,/saluz-admin-guide\.js/);
 assert.match(workflow,/branches: \[homologacao\]/);
 assert.doesNotMatch(guide,/CHECKOUT_ENABLED\s*=\s*true/);
});
