import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=path=>readFileSync(path,"utf8");
test("Sobre a SALUZ usa categorias atuais e não divulga catálogo antigo",()=>{
 const html=file("sobre.html");
 assert.match(html,/class="commerce-page sl-about-page"/);
 assert.match(html,/Seu estilo está/);
 assert.match(html,/class="sl-about-hero"/);
 assert.match(html,/class="sl-about-visual"/);
 for(const category of ["grupo=roupas","grupo=bolsas","grupo=acessorios"])assert.match(html,new RegExp(category));
 assert.doesNotMatch(html,/itens de organização, autocuidado, viagem/);
 assert.doesNotMatch(html,/<h2>Organizar<\/h2>/);
 assert.match(html,/Imagem editorial ilustrativa/);
});
test("Atendimento prioriza email e informações verdadeiras sem prometer horário ou checkout",()=>{
 const html=file("atendimento.html");
 assert.match(html,/class="commerce-page sl-help-page"/);
 assert.match(html,/mailto:anny\.csalustiano@gmail\.com/);
 assert.match(html,/class="sl-help-contact"/);
 assert.match(html,/class="sl-help-questions"/);
 assert.equal((html.match(/<details>/g)||[]).length,4);
 assert.doesNotMatch(html,/8h às 19h/);
 assert.doesNotMatch(html,/Organizar|Presentear/);
 assert.match(html,/checkout e o pagamento ainda estão em fase de configuração/);
 assert.match(html,/a partir de São Paulo \(SP\)/);
});
test("Páginas institucionais têm estilo próprio, responsivo e não mudam navegação principal",()=>{
 const css=file("saluz-institucional.css");
 for(const page of ["atendimento.html","sobre.html"]){
  const html=file(page);
  assert.match(html,/saluz-institucional\.css\?v=20261112-v1/);
  assert.match(html,/saluz-moda\.css\?v=20261112-contraste-v3/);
  assert.match(html,/<title>SALUZ \| Roupas, Bolsas e Acessórios<\/title>/);
  assert.match(html,/class="commerce-header"/);
  assert.match(html,/class="commerce-footer"/);
  assert.equal((html.match(/<main\b/g)||[]).length,1);
 }
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/\.sl-help-questions summary/);
 assert.match(css,/\.sl-about-hero/);
 assert.match(css,/color:#FFFDF9!important/);
});
