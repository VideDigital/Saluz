import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const root=new URL("../",import.meta.url);
const pages=["index.html","loja.html","colecoes.html","sobre.html","atendimento.html",
 "colecao-necessaires.html","colecao-porta-joias.html","colecao-organizadores-maquiagem.html",
 "colecao-organizadores-bolsa.html","colecao-acessorios-viagem.html",
 "colecao-acessorios-femininos.html","colecao-autocuidado.html","colecao-kits-presentes.html"];
test("Paginas publicas autorizam indexacao e informam URL canonica",async()=>{
 for(const name of pages){
  const html=await readFile(new URL(name,root),"utf8");
  assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large">/,name);
  assert.match(html,/<link rel="canonical" href="https:\/\/usesaluz\.com\.br\//,name);
  assert.match(html,/<meta property="og:site_name" content="SALUZ">/,name);
  assert.doesNotMatch(html,/<meta name="robots" content="noindex/,name);
 }
});
test("Backoffice e paginas privadas permanecem noindex",async()=>{
 for(const name of ["admin.html","favoritos.html","produto.html"]){
  const html=await readFile(new URL(name,root),"utf8");
  assert.match(html,/<meta name="robots" content="noindex/,name);
 }
});
test("Sitemap descreve somente paginas publicas oficiais",async()=>{
 const sitemap=await readFile(new URL("sitemap.xml",root),"utf8");
 for(const name of pages){
  const url=name==="index.html"?"https://usesaluz.com.br/":"https://usesaluz.com.br/"+name;
  assert.ok(sitemap.includes("<loc>"+url+"</loc>"),name);
 }
 assert.doesNotMatch(sitemap,/admin\.html|favoritos\.html|saluz-admin\.pages\.dev|homologacao/);
 const robots=await readFile(new URL("robots.txt",root),"utf8");
 assert.match(robots,/Sitemap: https:\/\/usesaluz\.com\.br\/sitemap\.xml/);
 assert.match(robots,/Disallow: \/api\//);
});
test("Identidade de marca estruturada para busca SALUZ",async()=>{
 const html=await readFile(new URL("index.html",root),"utf8");
 assert.match(html,/https:\/\/schema\.org/);
 assert.match(html,/"alternateName":\["Use Saluz","Use SALUZ"\]/);
 assert.match(html,/<title>SALUZ \|/);
});
