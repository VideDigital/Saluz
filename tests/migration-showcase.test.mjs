import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("Endereço antigo apenas redireciona ao site aprovado",()=>{
 const doc=readFileSync("migration-showcase.html","utf8");
 assert.match(doc,/http-equiv="refresh"/);
 assert.match(doc,/url=\.\/loja\.html\?d1=1/);
 assert.match(doc,/noindex,nofollow/);
 assert.doesNotMatch(doc,/<div[^>]+class="products"|id="product-form"|id="products"/);
});
test("Arquivo de compatibilidade não cria vitrine paralela",()=>{
 const stub=readFileSync("migration-showcase.js","utf8");
 assert.doesNotMatch(stub,/fetch\(|document\.|innerHTML/);
});