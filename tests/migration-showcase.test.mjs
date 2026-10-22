import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const root=new URL("../",import.meta.url);
const html=await readFile(new URL("migration-showcase.html",root),"utf8");
const js=await readFile(new URL("migration-showcase.js",root),"utf8");
test("Vitrine de testes tem noindex e proíbe uso em produção",()=>{
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/id="showcase" hidden/);
 assert.match(js,/location\.hostname!==STAGE/);
 assert.match(js,/homologacao\.saluz-loja\.pages\.dev/);
});
test("Vitrine usa somente catálogo D1, não inventa pagamentos",()=>{
 assert.match(js,/\/api\/migration-catalog/);
 assert.match(js,/data\.payments_enabled!==false/);
 assert.match(js,/data\.source!=="D1 staging"/);
 assert.doesNotMatch(html,/input.*(?:number="cartao"|name="card_number"|name="cvv")/i);
 assert.doesNotMatch(js,/\/api\/checkout|\/api\/orders/);
 assert.match(html,/sem pedidos ou pagamentos reais/);
});
test("Textos de produtos são inseridos por textContent, não HTML arbitrário",()=>{
 assert.match(js,/el\.textContent=String\(text\)/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
 assert.match(js,/url\.protocol!=="https:"/);
});
