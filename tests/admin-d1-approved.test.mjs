import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync("admin.js","utf8");
const server=readFileSync("functions/api/[[path]].js","utf8");
test("Painel original mantém produção sem D1 e permite opt-in só em homologação",()=>{
 assert.match(src,/location\.hostname!=="homologacao\.saluz-admin\.pages\.dev"/);
 assert.match(src,/selected==="1"/);assert.match(src,/selected==="0"/);
 assert.match(src,/migration-admin\//);
 assert.match(src,/saluzD1AdminPreview/);
});
test("Autenticação Supabase continua obrigatória nesta etapa",()=>{
 assert.match(src,/api\("auth\/me"\)/);
 assert.match(src,/api\("admin\/orders"\)/);
 assert.match(server,/if\(route\[0\]==="migration-admin"\)/);
 assert.match(server,/await isAdmin\(request,env\)/);
});
test("Edição guarda versão e upload WebP com 500 KB usa KV",()=>{
 assert.match(src,/saluzProductRevision=Number\(p\.revision\|\|0\)/);
 assert.match(src,/product\.revision=saluzProductRevision/);
 assert.match(src,/createImageBitmap\(file\)/);
 assert.match(src,/image\.size<=500000/);
 assert.match(src,/fetch\("\/api\/migration-admin\/upload"/);
 assert.match(src,/fetch\("\/api\/admin\/upload"/);
});
