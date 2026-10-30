import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const campaign=readFileSync("saluz-campaigns.js","utf8");
const studio=readFileSync("saluz-studio.js","utf8");
const admin=readFileSync("admin.html","utf8");
test("editores só direcionam conteúdo à migração quando preview D1 estiver habilitado",()=>{
 for(const src of [campaign,studio]){
  new vm.Script(src);
  assert.match(src,/typeof saluzD1AdminPreview!=="undefined"&&saluzD1AdminPreview/);
  assert.match(src,/path=path\.replace\(\/\^admin\\\/site-content\/,"migration-admin\/content"\)/);
  assert.match(src,/await ensureAdminResponse/);
  assert.doesNotMatch(src,/catch\s*\{\s*(?:return\s+)?(?:fetch|request)\("admin\/site-content"/);
 }
 assert.match(campaign,/path=path\.replace\(\/\^admin\\\/products\/,"migration-admin\/products"\)/);
});
test("CSS e HTML preservados, scripts com nova versão para evitar cache",()=>{
 assert.match(admin,/saluz-studio\.js\?v=20261030-d1-editor/);
 assert.match(admin,/saluz-campaigns\.js\?v=20261030-d1-editor/);
});
test("backend e proxy de conteúdo protegidos na homologação com versão e publicação explícita",()=>{
 const proxy=readFileSync("admin-deploy/functions/api/[[path]].js","utf8");
 const backend=readFileSync("cloudflare/d1/staging-content.mjs","utf8");
 const gate=readFileSync("functions/api/[[path]].js","utf8");
 assert.match(proxy,/endpoint==="content"/);
 assert.match(proxy,/homologacao\.saluz-admin\.pages\.dev/);
 assert.match(backend,/hostname!=="homologacao\.saluz-loja\.pages\.dev"/);
 assert.match(backend,/WHERE id=1 AND revision=\?/);
 assert.match(backend,/Publicação bloqueada: rascunho D1 vazio/);
 assert.match(gate,/await isAdmin\(request,env\)/);
 assert.match(backend,/checkout_enabled:false/);
});
