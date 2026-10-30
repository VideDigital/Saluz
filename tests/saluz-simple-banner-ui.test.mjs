import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const ui=readFileSync("saluz-campaigns-simple.js","utf8");
const style=readFileSync("saluz-campaigns-simple.css","utf8");
const editor=readFileSync("saluz-campaigns.js","utf8");
const html=readFileSync("admin.html","utf8");

test("editor simplificado é exclusivamente de homologação D1",()=>{
 new vm.Script(ui);new vm.Script(editor);
 assert.match(ui,/location\.hostname!=="homologacao\.saluz-admin\.pages\.dev"/);
 assert.match(ui,/typeof saluzD1AdminPreview==="undefined"\|\|!saluzD1AdminPreview/);
 assert.doesNotMatch(ui,/fetch\(|\/api\//);
 assert.doesNotMatch(ui,/\.innerHTML\s*=/);
 assert.match(editor,/if\(typeof saluzD1AdminPreview!=="undefined"&&saluzD1AdminPreview\)/);
});
test("os dados e upload do banner permanecem ligados aos campos originais",()=>{
 for(const name of ["title","image_url","mobile_image_url","placement","link","active",
   "style","eyebrow","description","button_label"]){
  assert.match(ui,new RegExp('field\\("'+name+'"\\)'));
 }
 assert.match(ui,/upload\("image_url"\)/);
 assert.match(ui,/upload\("mobile_image_url"\)/);
 assert.match(ui,/easy\.append\(pretitle,preview\)/);
 assert.match(ui,/extra\.append\(advancedRow,desc,button,urlRow,mobile,schedule\)/);
 assert.match(ui,/form\.insertBefore\(advanced,actions\)/);
 assert.match(ui,/summary/);
});
test("um clique salva no D1 em rascunho, sem publicar automaticamente",()=>{
 assert.match(editor,/async function apply\(event\)/);
 assert.match(editor,/if\(dataDifferent\(\)\)await execute\("save"\)/);
 assert.match(editor,/const path="admin\/site-content"\+\(action==="publish"/);
 assert.doesNotMatch(editor,/if\(dataDifferent\(\)\)await execute\("publish"\)/);
 assert.match(editor,/Publicar os banners da loja\?/);
 assert.match(editor,/if\(action==="publish"&&!confirm/);
});
test("UI/CI servem CSS e JS de homologação, preservando checkout e rotas",()=>{
 assert.match(html,/saluz-campaigns-simple\.js\?v=20261030-simple1/);
 assert.match(html,/saluz-campaigns-simple\.css\?v=20261030-simple1/);
 assert.ok(html.indexOf("saluz-campaigns-simple.css")>html.indexOf("saluz-v3-modules.css"));
 const builder=readFileSync(".github/scripts/build-saluz-admin-preview.py","utf8");
 const pipeline=readFileSync(".github/workflows/saluz-admin-staging-deploy.yml","utf8");
 for(const name of ["saluz-campaigns-simple.js","saluz-campaigns-simple.css"]){
  assert.ok(builder.includes('"'+name+'"'));
  assert.ok(pipeline.includes("'"+name+"'"));
 }
 assert.match(style,/position:static!important/);
 assert.match(style,/@media\(max-width:700px\)/);
});
