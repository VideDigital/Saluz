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
    const body=file(name),ids=[...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,name+' contém IDs repetidos');
    for(const m of body.matchAll(/(?:src|href)="(\.\/[^"#?]+)(?:\?[^"#]*)?(?:#[^"]*)?"/g)){
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
  assert.match(body,/saluz-shell\.js/,name);
 }
});
test('busca mobile presente em todas as páginas públicas',()=>{
 const pages=readdirSync(root).filter(name=>name.endsWith('.html')&&name!=='admin.html');
 for(const page of pages){
   const html=file(page);
   assert.ok(html.includes('class="commerce-mobile-search"'),page);
   assert.ok(html.includes('loja.html?busca=1#produtos'),page);
 }
});
test('painel informa critérios e ações de publicação antes de habilitar a loja',()=>{
 const html=file('admin.html');
 for(const id of ['publish-check-list','publish-check-status','cancel-edit','save-product','visit-product'])
   assert.ok(html.includes('id="'+id+'"'),'Painel sem '+id);
 const script=file('admin.js');
 assert.ok(script.includes('function publishingChecklist('));
 assert.ok(script.includes('button.disabled=true'));
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
   assert.match(String(url),/is_active=eq\.true/);
   return Response.json([{id:exampleId,name:'Produto de teste',variants:[],price_cents:0}]);
 };
 try{
  const res=await handler('/api/products/'+exampleId);
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.product.id,exampleId);
 }finally{globalThis.fetch=original;}
});
test('favoritos consultam apenas produtos ativos pelos IDs informados',async()=>{
 const previous=globalThis.fetch;let seen='';
 globalThis.fetch=async url=>{
  seen=String(url);
  return Response.json([{id:exampleId,name:'Produto de teste',price_cents:0,variants:[]}]);
 };
 try{
  const result=await handler('/api/products/favorites?ids='+exampleId);
  assert.equal(result.status,200);
  assert.equal((await result.json()).products.length,1);
  assert.ok(seen.includes('is_active=eq.true'));
  assert.ok(seen.includes('id=in.('));
 }finally{globalThis.fetch=previous;}
});
test('favoritos recusam IDs inválidos sem acessar o banco',async()=>{
 const response=await handler('/api/products/favorites?ids=valor-invalido');
 assert.equal(response.status,400);
 const empty=await handler('/api/products/favorites');
 assert.equal(empty.status,200);
 assert.deepEqual((await empty.json()).products,[]);
});
test('Home retorna apenas produtos ativos em destaques e novidades',async()=>{
 const previous=globalThis.fetch;const calls=[];
 globalThis.fetch=async url=>{
  calls.push(String(url));
  return Response.json([]);
 };
 try{
  const response=await handler('/api/products/home');
  assert.equal(response.status,200);
  const data=await response.json();
  assert.deepEqual(data.featured,[]);
  assert.deepEqual(data.newest,[]);
  assert.equal(calls.length,2);
  assert.ok(calls.every(url=>url.includes('is_active=eq.true')));
  assert.ok(calls.some(url=>url.includes('is_featured=eq.true')));
 }finally{globalThis.fetch=previous;}
});
test('Home não repete um produto destacado no bloco de novidades',async()=>{
 const old=globalThis.fetch;
 const selected={id:exampleId,name:'Um item de teste',category:'Nécessaires',price_cents:1000,variants:[]};
 const second={...selected,id:'00000000-0000-4000-8000-000000000002',name:'Outro item de teste'};
 globalThis.fetch=async url=>Response.json(
   String(url).includes('is_featured=eq.true')?[selected]:[selected,second]
 );
 try{
   const response=await handler('/api/products/home');
   assert.equal(response.status,200);
   const data=await response.json();
   assert.deepEqual(data.featured.map(p=>p.id),[selected.id]);
   assert.deepEqual(data.newest.map(p=>p.id),[second.id]);
 }finally{globalThis.fetch=old;}
});
test('catálogo público faz paginação sem expor produtos ocultos',async()=>{
 const previous=globalThis.fetch;let last='';
 globalThis.fetch=async url=>{
  last=String(url);
  return Response.json([{id:exampleId},{id:'00000000-0000-4000-8000-000000000002'},{id:'00000000-0000-4000-8000-000000000003'}]);
 };
 try{
  const response=await handler('/api/products?page=2&limit=2');
  assert.equal(response.status,200);
  const json=await response.json();
  assert.equal(json.products.length,2);
  assert.equal(json.has_more,true);
  assert.equal(json.page,2);
  assert.ok(last.includes('is_active=eq.true'));
  assert.ok(last.includes('offset=2'));
 }finally{globalThis.fetch=previous;}
});
test('paginação não aceita tamanho exagerado ou páginas inválidas',async()=>{
 assert.equal((await handler('/api/products?limit=300')).status,400);
 assert.equal((await handler('/api/products?page=abc')).status,400);
 assert.equal((await handler('/api/products?page=0')).status,400);
});
test('login sem segredo adicional de limitação permanece bloqueado',async()=>{
 const response=await handler('/api/auth/login',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({email:'admin@example.invalid',password:'invalid'})
 });
 assert.equal(response.status,503);
});
test('checkout continua bloqueado mesmo se variável for ativada por engano',async()=>{
 const response=await handler('/api/checkout',{
  method:'POST',headers:{'content-type':'application/json'},body:'{}'
 },{...env,CHECKOUT_ENABLED:'true'});
 assert.equal(response.status,503);
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
