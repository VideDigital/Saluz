import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import vm from "node:vm";
const shell=readFileSync("saluz-shell.js","utf8");
const admin=readFileSync("admin.js","utf8");
const begin=shell.indexOf("/* Modo diagnóstico apenas na loja");
assert.ok(begin>=0);
const previewSource=shell.slice(begin);
const start=admin.indexOf("const saluzD1AdminPreview=(()=>{");
const end=admin.indexOf("})();",start)+5;
assert.ok(start>=0&&end>start);
const adminSource=admin.slice(start,end)+"\n globalThisResult=saluzD1AdminPreview;";
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};}
function publicPreview(hostname,search="",memory=storage()){
 const window={location:{hostname,search,origin:"https://"+hostname},sessionStorage:memory};
 const document={querySelectorAll:()=>[],addEventListener:()=>{}};
 vm.runInNewContext(previewSource,{window,document,URL,URLSearchParams});
 return {enabled:window.saluzD1PreviewEnabled,url:window.saluzD1PreviewUrl("/api/products?page=1"),memory};
}
function adminPreview(hostname,search="",memory=storage()){
 const scope={location:{hostname,search},sessionStorage:memory,URLSearchParams,globalThisResult:null};
 vm.runInNewContext(adminSource,scope);
 return {enabled:scope.globalThisResult,memory};
}
test("Homologação nova abre catálogo D1 sem URL especial",()=>{
 for(const search of ["","?categoria=1","?d1=1"]){
  const p=publicPreview("homologacao.saluz-loja.pages.dev",search);
  assert.equal(p.enabled,true);assert.match(p.url,/source=d1/);
 }
});
test("Produção permanece Supabase mesmo com d1=1",()=>{
 const p=publicPreview("usesaluz.com.br","?d1=1");
 assert.equal(p.enabled,false);assert.doesNotMatch(p.url,/source=d1/);
});
test("Desativar e reativar D1 permanece consistente nesta aba",()=>{
 const mem=storage();
 assert.equal(publicPreview("homologacao.saluz-loja.pages.dev","?d1=0",mem).enabled,false);
 assert.equal(publicPreview("homologacao.saluz-loja.pages.dev","",mem).enabled,false);
 assert.equal(publicPreview("homologacao.saluz-loja.pages.dev","?d1=1",mem).enabled,true);
 assert.equal(publicPreview("homologacao.saluz-loja.pages.dev","",mem).enabled,true);
});
test("Produtos do painel usam D1 por padrão somente em homologação",()=>{
 const p=adminPreview("homologacao.saluz-admin.pages.dev");
 assert.equal(p.enabled,true);
 assert.equal(adminPreview("homologacao.saluz-admin.pages.dev","?d1=0",p.memory).enabled,false);
 assert.equal(adminPreview("homologacao.saluz-admin.pages.dev","?d1=1",p.memory).enabled,true);
 assert.equal(adminPreview("admin.usesaluz.com.br","?d1=1").enabled,false);
 assert.match(admin,/migration-admin\/"/);
});
test("Arquivos HTML utilizam versão nova para evitar cache desatualizado",()=>{
 let count=0;
 for(const name of readdirSync(".").filter(x=>x.endsWith(".html")&&x!=="migration-showcase.html")){
  const html=readFileSync(name,"utf8");
  for(const script of ["saluz-shell.js","colecao.js","loja.js","home-vitrine.js","admin.js"]){
   if(html.includes("./"+script)){
    count++;
    assert.ok(html.includes("./"+script+"?v=20261022-d1-default"),name+" precisa atualizar "+script);
   }
  }
 }
 assert.ok(count>12);
});