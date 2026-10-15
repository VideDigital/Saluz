import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync('functions/api/[[path]].js','utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64'));
const base='https://saluz-loja.pages.dev';
const userId='c4d20e9d-5d9b-409a-b992-13385373dc9d';
const env={SUPABASE_URL:'https://fake-saluz.invalid',SUPABASE_ANON_KEY:'public-test-key',
  SUPABASE_SERVICE_ROLE_KEY:'private-test-key',CHECKOUT_ENABLED:'false'};
const product={
 name:'Nécessaire para testes',category:'Nécessaires',
 description:'Um produto de testes, não publicado na base real.',
 price_cents:3500,image_url:'',is_active:false,is_featured:false,
 variants:[{color:'Bege',size:'Único',stock:3,image_url:''}]
};
async function withAdmin(body,overrides={}){
 const original=globalThis.fetch,writes=[];
 globalThis.fetch=async (url,options={})=>{
  const path=new URL(String(url)).pathname;
  if(path==='/auth/v1/user')return Response.json({id:userId,email:'admin@example.invalid'});
  if(path.startsWith('/rest/v1/saluz_admins'))return Response.json([{user_id:userId}]);
  if(path.startsWith('/rest/v1/saluz_products')){
   writes.push(JSON.parse(options.body));
   return Response.json([{id:'c5b031e3-2545-4fbc-867e-cf15acdfcf55',...JSON.parse(options.body)}]);
  }
  throw Error('unexpected '+path);
 };
 try{
  const request=new Request(base+'/api/admin/products',{
   method:'POST',headers:{'content-type':'application/json',cookie:'__Host-saluz_session=local-test-only'},
   body:typeof body==='string'?body:JSON.stringify({...body,...overrides})
  });
  const response=await onRequest({request,env});
  return {status:response.status,result:await response.json(),writes};
 }finally{globalThis.fetch=original;}
}
test('produto oculto pode ser cadastrado antes das fotografias',async()=>{
 const {status,result,writes}=await withAdmin(product);
 assert.equal(status,201);
 assert.equal(result.product.is_active,false);
 assert.equal(writes.length,1);
 assert.equal(writes[0].is_featured,false);
});
test('não publicar produto sem foto principal ou foto de variação',async()=>{
 const {status,writes,result}=await withAdmin({...product,is_active:true});
 assert.equal(status,400);
 assert.match(result.error,/foto/);
 assert.equal(writes.length,0);
});
test('publicação aceita foto de variação em HTTPS',async()=>{
 const visible={...product,is_active:true,is_featured:true,
  variants:[{...product.variants[0],image_url:'https://images.example.invalid/produto.webp'}]};
 const {status,writes,result}=await withAdmin(visible);
 assert.equal(status,201);
 assert.equal(writes[0].is_active,true);
 assert.equal(writes[0].is_featured,true);
 assert.equal(result.product.name,product.name);
});
test('categoria inexistente não é cadastrada',async()=>{
 const {status,result,writes}=await withAdmin({...product,category:'Categoria imaginária'});
 assert.equal(status,400);
 assert.match(result.error,/categoria/);
 assert.equal(writes.length,0);
});
test('duas variantes da mesma cor e tamanho não podem duplicar estoque',async()=>{
 const {status,result,writes}=await withAdmin({...product,variants:[product.variants[0],product.variants[0]]});
 assert.equal(status,400);
 assert.match(result.error,/duplicada/);
 assert.equal(writes.length,0);
});
test('JSON quebrado é rejeitado antes de qualquer operação privada',async()=>{
 const {status,result,writes}=await withAdmin('{"name":');
 assert.equal(status,400);
 assert.match(result.error,/JSON inválido/);
 assert.equal(writes.length,0);
});
test('checkout segue desabilitado mesmo com credenciais de teste',async()=>{
 const request=new Request(base+'/api/checkout',{method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({name:'Cliente fictício',items:[]})});
 const response=await onRequest({request,env});
 assert.equal(response.status,503);
});
