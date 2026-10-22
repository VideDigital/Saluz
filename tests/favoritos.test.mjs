import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync('favoritos.js','utf8');
const id1='b2d649eb-1e98-4ba5-9474-c8ac4836f2ca';
const id2='28ee0e4e-66d7-4ea7-b1e2-4fc422812ab9';
function setup(seed){
 const memory=new Map(seed===undefined?[]:[['saluz-favorites-v1',seed]]);
 const events=[];
 class CustomEvent{
   constructor(type,detail){this.type=type;this.detail=detail.detail;}
 }
 const storage={getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)};
 const window={localStorage:storage,CustomEvent,dispatchEvent:e=>events.push(e)};
 runInNewContext(source,{window});
 return {api:window.SaluzFavorites,memory,storage,events};
}
test('favoritos guardam e removem apenas IDs dos produtos',()=>{
 const {api,memory}=setup();
 assert.equal(api.toggle(id1).ok,true);
 assert.equal(api.has(id1),true);
 assert.equal(api.count(),1);
 assert.deepEqual(Array.from(api.read()),[id1]);
 assert.equal(api.toggle(id1).added,false);
 assert.equal(api.has(id1),false);
 assert.equal(memory.get('saluz-favorites-v1'),'[]');
});
test('favoritos não duplicam nem aceitam IDs inválidos',()=>{
 const {api}=setup();
 assert.equal(api.toggle('produto-de-teste').ok,false);
 assert.equal(api.toggle(id1).ok,true);
 const result=api.save([id1,id1,id2,'inválido']);
 assert.equal(result.ok,true);
 assert.equal(api.count(),2);
});
test('dados extras não são persistidos nos favoritos',()=>{
 const {api,memory}=setup();
 api.save([id1,{id:id2,email:'cliente@example.com'},id2]);
 const raw=memory.get('saluz-favorites-v1');
 assert.equal(raw.includes('example.com'),false);
 assert.equal(api.count(),2);
});
test('dados corrompidos não quebram a leitura',()=>{
 const {api}=setup('{json-invalido');
 assert.deepEqual(Array.from(api.read()),[]);
});
test('falha no armazenamento não declara sucesso',()=>{
 const {api,storage}=setup();
 storage.setItem=()=>{throw Error('blocked')};
 const response=api.toggle(id1);
 assert.equal(response.ok,false);
 assert.match(response.message,/guardar os favoritos/);
});
test('notificação é emitida quando a lista muda',()=>{
 const {api,events}=setup();
 api.toggle(id1);
 assert.equal(events.length,1);
 assert.equal(events[0].type,'saluz:favorites');
 assert.equal(events[0].detail.count,1);
});
test('páginas públicas incluem menu e módulos de favoritos',()=>{
 const pages=readdirSync('.').filter(name=>name.endsWith('.html')&&!['admin.html','migration-lab.html','migration-showcase.html'].includes(name));
 for(const file of pages){
   const html=readFileSync(file,'utf8');
   assert.match(html,/class="commerce-favorites-link"/,file);
   assert.match(html,/src="\.\/favoritos\.js"/,file);
   assert.match(html,/href="\.\/favoritos\.css"/,file);
 }
});
test('favoritos e vitrine mantêm pedidos desativados por padrão',()=>{
 const source=readFileSync('functions/api/[[path]].js','utf8');
 assert.match(source,/CHECKOUT_ENABLED/);
 assert.match(readFileSync('favoritos-pagina.js','utf8'),/api\/products/);
});
