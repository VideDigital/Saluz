import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=name=>readFileSync(name,"utf8");
const publicPages=[
 "index.html","loja.html","colecoes.html","produto.html","favoritos.html",
 "sobre.html","atendimento.html","como-comprar.html","privacidade.html",
 "colecao-necessaires.html","colecao-porta-joias.html","colecao-organizadores-maquiagem.html",
 "colecao-organizadores-bolsa.html","colecao-acessorios-viagem.html","colecao-autocuidado.html",
 "colecao-acessorios-femininos.html","colecao-kits-presentes.html"
];
test("todas as páginas usam o mesmo cabeçalho, navegação e rodapé",()=>{
 for(const name of publicPages){
  const html=page(name);
  assert.equal((html.match(/class="commerce-header"/g)||[]).length,1,name+" header");
  assert.equal((html.match(/class="commerce-footer"/g)||[]).length,1,name+" footer");
  assert.equal((html.match(/id="menu-toggle"/g)||[]).length,1,name+" menu");
  assert.equal((html.match(/id="loja-nav"/g)||[]).length,1,name+" nav");
  assert.match(html,/data-saluz-fashion="true"/,name+" body");
  assert.match(html,/saluz-moda.css\?v=20261112-editorial/,name+" stylesheet");
  assert.match(html,/href="\.\/loja.html\?grupo=bolsas#produtos"/,name+" bags");
  assert.match(html,/href="\.\/loja.html\?grupo=acessorios#produtos"/,name+" accessories");
  assert.match(html,/<summary>Roupas /,name+" mega");
  assert.doesNotMatch(html,/<summary>Categorias /,name+" duplicated menu");
 }
});
test("home tem fotos editoriais de referência, não imagens de produto fictício",()=>{
 const html=page("index.html");
 assert.match(html,/class="sl-dept-grid"/);
 assert.match(html,/id="destaques"[^>]*hidden/);
 assert.match(html,/id="novidades"[^>]*hidden/);
 assert.match(html,/Imagem editorial ilustrativa/);
 assert.match(html,/alt="Bolsa de couro marrom, fotografia editorial ilustrativa"/);
 assert.equal((html.match(/class="sl-dept-card"/g)||[]).length,3);
 assert.doesNotMatch(html,/class="fashion-style-note"/);
});
test("catálogo mantém ids do checkout e do carrinho sem ativar pagamento",()=>{
 const html=page("loja.html"),code=page("loja.js");
 for(const id of ["search","sort","filters","fashion-color-filter","fashion-size-filter","products",
  "cart-open","cart-dialog","checkout-open","checkout-submit","load-more","pagination-status","catalog-status"]){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(code,/sl-filter-toggle/);
 assert.match(code,/updateCatalogHeading/);
 assert.match(html,/Confirmar pagamento — indisponível nos testes/);
});
test("vitrine oculta seções quando não há produto real publicado",()=>{
 const html=page("index.html"),js=page("home-vitrine.js");
 assert.match(js,/section\.hidden=valid\.length===0/);
 assert.match(html,/id="featured-products"/);
 assert.match(html,/id="new-products"/);
});
