import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const collection=readFileSync("colecao.js","utf8");
const shell=readFileSync("saluz-shell.js","utf8");

function element(tag){
 return {
  tag, children:[],attrs:{},hidden:false,style:{},dataset:{},classList:{toggle(){}},
  append(...xs){this.children.push(...xs)},
  setAttribute(k,v){this.attrs[k]=v},
  insertAdjacentElement(_at,x){this.children.push(x)},
  replaceChildren(...xs){this.children=xs},
  querySelectorAll(){return []},
  textContent:"",get href(){return this._href},set href(v){this._href=v}
 };
}
function runCollection({enabled,items,category="Kits e presentes"}){
 const root=element("div"),empty=element("div"),status=element("p"),seen=[];
 const doc={body:{dataset:{category}},
  getElementById:id=>({"category-products":root,"category-empty":empty,"category-status":status})[id],
  createElement:element
 };
 const context={document:doc,window:{
  saluzD1PreviewEnabled:enabled,
  saluzD1PreviewUrl:path=>enabled?path+"&source=d1":path,
  SaluzFavorites:{has:()=>false,toggle:()=>({ok:true})},
  addEventListener(){}
 },fetch:async(url)=>{seen.push(url);return {ok:true,json:async()=>({products:items,has_more:false})}},
 encodeURIComponent,Number,String,Array,Set};
 vm.runInNewContext(collection,context);
 return new Promise(resolve=>setImmediate(()=>resolve({root,status,empty,seen})));
}
const kit={id:"d0110000-0000-4000-8000-000000000105",name:"DEMONSTRAÇÃO — Kit Autocuidado",category:"Kits e presentes",description:"teste",image_url:"",variants:[{color:"Neutro",size:"Kit",stock:4}],price_cents:15990,is_active:true};

test("As oito páginas aprovadas compartilham a mesma implementação de coleção",()=>{
 const pages=["necessaires","porta-joias","organizadores-maquiagem","organizadores-bolsa",
 "acessorios-viagem","autocuidado","acessorios-femininos","kits-presentes"];
 for(const name of pages){
  const html=readFileSync("colecao-"+name+".html","utf8");
  assert.match(html,/saluz-shell\.js/);
  assert.match(html,/colecao\.js/);
  assert.match(html,/data-category=/);
 }
});
test("Kit de teste do D1 aparece na coleção de Kits e presentes",async()=>{
 const out=await runCollection({enabled:true,items:[kit]});
 assert.ok(out.seen[0].includes("source=d1"));
 assert.ok(out.seen[0].includes("category=Kits%20e%20presentes"));
 assert.equal(out.root.children.length,1);
 assert.equal(out.empty.hidden,true);
 assert.match(out.status.textContent,/1 produto/);
 assert.ok(out.root.children[0].children[0].href.includes("&d1=1"));
});
test("Produção e homologação padrão continuam sem parâmetro D1",async()=>{
 const out=await runCollection({enabled:false,items:[kit]});
 assert.ok(!out.seen[0].includes("source=d1"));
 assert.ok(!out.root.children[0].children[0].href.includes("d1=1"));
});
test("Mesmo D1 não mostra produto de categoria diferente",async()=>{
 const out=await runCollection({enabled:true,items:[{...kit,category:"Porta-joias"}]});
 assert.equal(out.root.children.length,0);
 assert.equal(out.empty.hidden,false);
});
test("Apenas links HTML internos podem preservar modo D1",()=>{
 assert.match(shell,/if\(enabled\)\{/);
 assert.match(shell,/u\.origin!==window\.location\.origin/);
 assert.match(shell,/u\.pathname\.endsWith\("\.html"\)/);
 assert.match(shell,/u\.searchParams\.set\("d1","1"\)/);
 assert.match(shell,/u\.searchParams\.get\("d1"\)==="0"/);
 assert.match(shell,/location\?\.hostname==="homologacao\.saluz-loja\.pages\.dev"/);
});
