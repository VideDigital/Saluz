import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const file=path=>readFileSync(resolve(root,path),'utf8');
const apiSource=file('functions/api/[[path]].js');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(apiSource).toString('base64'));
const base='https://saluz-loja.pages.dev';
const exampleId='00000000-0000-4000-8000-000000000001';
const env={SUPABASE_URL:'https://demo.invalid',SUPABASE_ANON_KEY:'test-anon-key',SUPABASE_SERVICE_ROLE_KEY:'test-private-key',CHECKOUT_ENABLED:'false'};
const request=(path,opts)=>new Request(base+path,opts);
const handler=(path,opts,e=env)=>onRequest({request:request(path,opts),env:e});

test('arquivos de navegação apontam para páginas/estilos/scripts reais',()=>{
  const html=readdirSync(root).filter(name=>name.endsWith('.html'));
  assert.ok(html.length>=17);
  for(const name of html){
    const body=file(name),ids=[...body.matchAll(/\\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,name+' contém IDs repetidos');
    for(const m of body.matchAll(/(?:src|href)="(\\.\\/[^"#?]+)(?:\\?[^"#]*)?(?:#[^"]*)?"/g)){
      const relative=m[1].slice(2);
      assert.ok(existsSync(resolve(root,relative)),name+' referencia arquivo ausente: '+relative);
    }
  }
});
test('menu público e rodapé são consistentes nas páginas de loja',()=>{
 const pages=['index.html','loja.html','colecoes.html','sobre.html','atendimento.html','como-comprar.html','produto.html'];
 for(const name of pages){
  const body=file(name);
  assert.match(body,/<header class="commerce-header">/,name);
  assert.match(body,/<footer class="commerce-footer">/,name);
  assert.match(body,/saluz-shell\\.js/,name);
 }
});
test('backend exige configuração sem expor segredos ou pedidos',async()=>{
 const catalog=await handler('/api/products',undefined,{});
 assert.equal(catalog.status,200);
 assert.equal((await catalog.json()).configured,false);
 const checkout=await handler('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'},{});
 assert.equal(checkout.status,503);
});
test('sacola e pagamentos permanecem bloqueados por padrão',async()=>{
 const status=await handler('/api/status');
 assert.equal(status.status,200);
 assert.equal((await status.json()).checkout_enabled,false);
 const checkout=await handler('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(checkout.status,503);
});
test('produto exige UUID válido',async()=>{
 const response=await handler('/api/products/invalid');
 assert.equal(response.status,404);
});
test('produto oculto não é retornado na rota individual',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response('[]',{status:200,headers:{'content-type':'application/json'}});
 try{
  const res=await handler('/api/products/'+exampleId);
  assert.equal(res.status,404);
 }finally{globalThis.fetch=previous;}
});
test('categoria é filtrada no Supabase, não no browser',async()=>{
 const original=globalThis.fetch;let seen='';
 globalThis.fetch=async url=>{
  seen=String(url);
  return new Response('[]',{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const res=await handler('/api/products?category='+encodeURIComponent('Nécessaires'));
  assert.equal(res.status,200);
  assert.equal(new URL(seen).searchParams.get('category'),'eq.Nécessaires');
  assert.deepEqual((await res.json()).products,[]);
 }finally{globalThis.fetch=original;}
});
test('consulta individual retorna somente o produto autorizado',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{
   assert.match(String(url),/is_active=eq\\.true/);
   return Response.json([{id:exampleId,name:'Produto de teste',variants:[],price_cents:0}]);
 };
 try{
  const res=await handler('/api/products/'+exampleId);
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.product.id,exampleId);
 }finally{globalThis.fetch=original;}
});
test('sem sessão administrativa, rotas de gestão são negadas',async()=>{
 const res=await handler('/api/admin/products');
 assert.equal(res.status,401);
});
test('requisições sensíveis de origem externa são bloqueadas',async()=>{
 const res=await handler('/api/auth/login',{
  method:'POST',
  headers:{'content-type':'application/json',origin:'https://exemplo-invalido.test'},
  body:'{"email":"a@b.com","password":"x"}'
 });
 assert.equal(res.status,403);
});
