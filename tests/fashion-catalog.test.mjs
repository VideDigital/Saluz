import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FASHION_GROUPS,FASHION_CATEGORIES,ACCEPTED_CATEGORIES,LEGACY_CATEGORIES,isFashionCategory,fashionGroup} from "../cloudflare/d1/fashion-catalog.mjs";
const file=name=>readFileSync(name,"utf8");
test("moda tem três grupos e tipos válidos sem colisão",()=>{
 assert.deepEqual(Object.keys(FASHION_GROUPS),["Roupas","Bolsas","Acessórios"]);
 assert.equal(new Set(FASHION_CATEGORIES).size,FASHION_CATEGORIES.length);
 assert.ok(FASHION_CATEGORIES.includes("Roupas / Shorts"));
 assert.ok(FASHION_CATEGORIES.includes("Roupas / Calças"));
 assert.ok(FASHION_CATEGORIES.includes("Roupas / Blusas"));
 assert.ok(FASHION_CATEGORIES.includes("Roupas / Camisas"));
 for(const cat of FASHION_CATEGORIES){
  assert.ok(cat.length<=70);
  assert.ok(isFashionCategory(cat));
  assert.ok(fashionGroup(cat));
  assert.ok(ACCEPTED_CATEGORIES.has(cat));
 }
});
test("dados anteriores não são apagados ao adaptar o painel",()=>{
 assert.equal(LEGACY_CATEGORIES.length,8);
 for(const category of LEGACY_CATEGORIES)assert.ok(ACCEPTED_CATEGORIES.has(category));
 const html=file("admin.html");
 assert.match(html,/Catálogo anterior \(para migrar\)/);
 assert.match(html,/Roupas \/ Shorts/);
 assert.match(html,/Bolsas \/ Transversais/);
 assert.match(html,/Acessórios \/ Bijuterias/);
 assert.match(html,/saluz-fashion-size-options/);
 const service=file("cloudflare/d1/staging-admin.mjs");
 assert.match(service,/ACCEPTED_CATEGORIES/);
});
test("a loja não mistura produtos do catálogo anterior com a vitrine de moda",()=>{
 assert.match(file("loja.js"),/fashion\.isCategory\(p\.category\)/);
 assert.match(file("home-vitrine.js"),/SaluzModa\?\.isCategory\(p\.category\)/);
 assert.match(file("loja.js"),/fashion-color-filter/);
 assert.match(file("loja.js"),/fashion-size-filter/);
 assert.match(file("loja.html"),/fashion-category-grid/);
 assert.match(file("index.html"),/fashion-hero/);
 assert.match(file("colecoes.html"),/fashion-collection-block/);
 assert.match(file("index.html"),/Imagem ilustrativa/);
});
test("pagamento continua bloqueado e produção não recebe migração",()=>{
 assert.match(file("functions/api/[[path]].js"),/Pedidos desativados até existir reserva atômica/);
 assert.match(file("loja.html"),/Confirmar pagamento — indisponível nos testes/);
 assert.ok(!file("cloudflare/d1/fashion-catalog.mjs").includes("DELETE FROM"));
});
