import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync("admin.html","utf8");
const script=readFileSync("saluz-workspace-v2.js","utf8");
const styles=[
 "saluz-layout-v2.css","saluz-home-v2.css","saluz-modules-v2.css"
];
test("novo layout carrega depois das camadas anteriores, em todas as abas",()=>{
 const last=html.indexOf("saluz-admin-calm-guide.css?v=20261030-calm1");
 assert.ok(last>0);
 let pos=last;
 for(const path of styles){
  const current=html.indexOf('./'+path+'?v=20261030-layout2');
  assert.ok(current>pos,path+" deve vir após o tema legado");
  pos=current;
  assert.ok(readFileSync(path,"utf8").length>1800);
 }
 assert.ok(html.indexOf('saluz-workspace-v2.js?v=20261030-layout2')>html.indexOf('saluz-admin-guide.js?v=20261030-calm1'));
 new vm.Script(script);
});
test("o limite de largura que desperdiçava tela foi explicitamente removido",()=>{
 const css=readFileSync(styles[0],"utf8");
 assert.match(css,/\.tab,body\.saluz-v2 #tab-overview\{max-width:none!important;width:100%!important/);
 assert.match(css,/\.workspace\{/);
 assert.match(css,/max-width:none!important/);
 assert.match(css,/saluz-workspace-split/);
 assert.match(css,/@media\(max-width:780px\)/);
});
test("Início deixa de empilhar duas faixas de apresentação e mantém dados reais",()=>{
 const css=readFileSync(styles[1],"utf8");
 assert.match(script,/overview\.append\(guide\)/);
 assert.match(css,/professional-welcome-actions/);
 assert.match(css,/professional-kpis/);
 assert.match(css,/professional-dashboard-grid/);
 assert.match(script,/este resumo usa a integração atual/);
 assert.doesNotMatch(script,/R\$\s*[0-9]/);
 assert.doesNotMatch(script,/fetch\(|CHECKOUT_ENABLED|MP_ACCESS_TOKEN|localStorage|sessionStorage/);
});
test("Produtos, Pedidos e Clientes ganham estrutura real sem perder IDs ou formulários",()=>{
 for(const name of ["products","orders","customers"])assert.match(script,new RegExp('place\\("'+name+'"'));
 for(const id of ["product-list-panel","order-search","orders","customers-list","fee-form","campaign-banner-form","studio-form","daily-chart"]){
  assert.ok(html.includes('id="'+id+'"'),id+" precisa continuar no HTML");
 }
 assert.match(script,/place\("products",\["\.product-workspace"\]\)/);
 assert.match(script,/marker\.replaceWith\(split\)/);
 assert.match(script,/side\.append\(guide\)/);
});
test("a reestruturação fica restrita a homologação e não publica novas funcionalidades",()=>{
 assert.match(script,/location\.hostname!=="homologacao\.saluz-admin\.pages\.dev"/);
 const workflow=readFileSync(".github/workflows/saluz-admin-staging-deploy.yml","utf8");
 const build=readFileSync(".github/scripts/build-saluz-admin-preview.py","utf8");
 assert.match(workflow,/saluz-workspace-v2\.js/);
 for(const path of styles.concat("saluz-workspace-v2.js"))assert.ok(build.includes('"'+path+'"'),"asset ausente do pacote: "+path);
 assert.match(workflow,/branches: \[homologacao\]/);
});
