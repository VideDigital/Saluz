import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("admin.html","utf8");
const js=readFileSync("saluz-admin-v3.js","utf8");
const css=["saluz-v3-theme.css","saluz-v3-home.css","saluz-v3-operations.css","saluz-v3-modules.css"];

test("V3 vai para homologação somente e depende dos elementos operacionais reais",()=>{
 assert.match(js,/location\.hostname!=="homologacao\.saluz-admin\.pages\.dev"/);
 assert.match(js,/if\(!\[welcome,actions,notice,metricHeading,kpis,caption,shortcutHeading,dashboardGrid,shortcuts,attention,orders,assurance,guide\]\.every\(Boolean\)\)return/);
 assert.match(js,/document\.body\.classList\.add\("saluz-v3"\)/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|\.innerHTML|MP_ACCESS_TOKEN|CHECKOUT_ENABLED\s*=/);
 new vm.Script(js);
});
test("Início transforma os módulos existentes, sem gerar KPIs inventados",()=>{
 for(const id of ["tab-overview","overview-health-kpis","overview-health-caption","overview-attention-list","health-refresh","overview-tasks","product-list-panel","orders","customer-summary"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const move of ["main.append(metrics,taskPanel)","aside.append(attention)","aside.append(guidePanel)","welcome.replaceWith(opHead)","board.after(orders)"]){
  assert.ok(js.includes(move),move);
 }
 assert.ok(js.includes("const shortcuts=dashboardGrid?.querySelector"));
 assert.doesNotMatch(js,/R\$\s*\d|receita:\d|pedidos:\d/);
});
test("Guia contextual, campanhas e produtos mantêm funcionalidade",()=>{
 for(const id of ["tab-products","tab-orders","tab-customers","tab-campaigns","tab-studio","tab-finance","tab-reports","fee-form","campaign-banner-form","studio-form","admin-products"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(js,/\["campaigns","studio","reports"\]/);
 assert.match(html,/saluz-admin-guide\.js/);
 assert.match(html,/saluz-workspace-v2\.js/);
});
test("CSS operacional é a camada final e responsiva",()=>{
 let prev=html.indexOf("saluz-finance-v2.css");
 assert.ok(prev>0);
 for(const file of css){
  let pos=html.indexOf("./"+file+"?v=20261030-operacao3");
  assert.ok(pos>prev,file+" deve vir após estilos anteriores");
  prev=pos;
  assert.ok(readFileSync(file,"utf8").length>1300);
 }
 assert.match(readFileSync(css[0],"utf8"),/background:#19233a!important/);
 assert.match(readFileSync(css[0],"utf8"),/\.dashboard\.hidden\{display:none!important\}/);
 assert.match(readFileSync(css[2],"utf8"),/saluz-op-task-panel/);
 assert.match(readFileSync(css[3],"utf8"),/@media\(max-width:1250px\)/);
});
test("Build inclui arquivos exigidos, CI valida HTML remoto e restringe preview",()=>{
 const build=readFileSync(".github/scripts/build-saluz-admin-preview.py","utf8");
 const wf=readFileSync(".github/workflows/saluz-admin-staging-deploy.yml","utf8");
 for(const f of [...css,"saluz-admin-v3.js"])assert.ok(build.includes('"'+f+'"'),f);
 assert.ok(wf.includes("'saluz-admin-v3.js'"));
 assert.ok(wf.includes('branches: [homologacao]'));
 assert.ok(wf.includes('saluz-op-head'));
 assert.ok(wf.includes('saluz-v3-theme.css'));
});
