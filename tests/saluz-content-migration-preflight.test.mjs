import test from "node:test";
import assert from "node:assert/strict";
import {compareContentMigration} from "../cloudflare/d1/content-migration-preflight.mjs";
const empty={draft:{},published:{},revision:0};
test("não importa origem vazia mesmo se destino estiver vazio",()=>{
 const x=compareContentMigration({source:empty,destination:empty});
 assert.equal(x.can_import,false);assert.ok(x.blockers.includes("source_empty_or_invalid"));
 assert.equal(x.checkout_enabled,false);
});
test("destino com dados ou revisão avançada nunca pode ser sobrescrito",()=>{
 const source={draft:{hero_title:"Loja"},published:{hero_title:"Loja"},revision:1};
 for(const destination of [{...empty,draft:{hero_title:"Protegido"}},{...empty,revision:1}]){
  const x=compareContentMigration({source,destination});
  assert.equal(x.can_import,false);assert.ok(x.blockers.includes("destination_has_changes"));
 }
});
test("preflight apenas sinaliza possibilidade, nunca importa nem publica",()=>{
 const source={draft:{hero_title:"Teste"},published:{hero_title:"Publicado"},revision:3};
 const x=compareContentMigration({source,destination:empty});
 assert.equal(x.can_import,true);assert.equal(x.mode,"read_only_preflight");
 assert.equal(x.destination.published_fields,0);assert.equal(x.source.published_fields,1);
});
