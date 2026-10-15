import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const src=readFileSync('sacola.js','utf8');
const id='9ce6b20d-79fe-413b-91d7-4a5a8ce4499a';
const product={id,name:'Produto de teste'};
const variant={color:'Bege',size:'M',stock:3};
function bagSystem(seed){
  const entries=new Map(seed===undefined?[]:[['saluz-bag-v1',seed]]);
  const storage={
    getItem:key=>entries.get(key)??null,
    setItem:(key,value)=>entries.set(key,value),
    removeItem:key=>entries.delete(key)
  };
  const window={localStorage:storage};
  runInNewContext(src,{window});
  return {bag:window.SaluzBag,entries,storage};
}
test('sacola aceita produto com UUID e estoque válido',()=>{
  const {bag}=bagSystem();
  const result=bag.add(product,variant,2);
  assert.equal(result.ok,true);
  assert.equal(bag.count(bag.read()),2);
  assert.equal(bag.read()[0].color,'Bege');
  assert.equal(bag.read()[0].size,'M');
});
test('mesma variação soma sem duplicar linhas',()=>{
  const {bag}=bagSystem();
  assert.equal(bag.add(product,variant,1).ok,true);
  assert.equal(bag.add(product,variant,2).ok,true);
  assert.equal(bag.read().length,1);
  assert.equal(bag.read()[0].quantity,3);
});
test('quantidade acima do estoque não altera a sacola',()=>{
  const {bag}=bagSystem();
  bag.add(product,variant,2);
  const result=bag.add(product,variant,2);
  assert.equal(result.ok,false);
  assert.equal(bag.read()[0].quantity,2);
});
test('estoque zerado ou ID falso são recusados',()=>{
  const {bag}=bagSystem();
  assert.equal(bag.add(product,{...variant,stock:0},1).ok,false);
  assert.equal(bag.add({id:'invalido'},variant,1).ok,false);
  assert.equal(bag.read().length,0);
});
test('sacola atualiza, remove e não mantém quantidades negativas',()=>{
  const {bag}=bagSystem();
  bag.add(product,variant,1);
  assert.equal(bag.change(0,1,variant).ok,true);
  assert.equal(bag.read()[0].quantity,2);
  assert.equal(bag.change(0,-3,variant).ok,true);
  assert.equal(bag.read().length,0);
});
test('conteúdo salvo malformado, duplicado ou adulterado é saneado',()=>{
  const lines=[
    {id,color:'Bege',size:'M',quantity:2},
    {id,color:'Bege',size:'M',quantity:500},
    {id:'123',color:'Preto',size:'P',quantity:10},
    {id,color:'Marrom',size:'Único',quantity:-4}
  ];
  const {bag}=bagSystem(JSON.stringify(lines));
  assert.equal(bag.read().length,1);
  assert.equal(bag.read()[0].quantity,10);
  assert.equal(bag.count(bag.read()),10);
});
test('storage indisponível retorna erro sem confirmar gravação',()=>{
  const {bag,storage}=bagSystem();
  storage.setItem=()=>{throw new Error('QuotaExceededError')};
  const result=bag.add(product,variant,1);
  assert.equal(result.ok,false);
  assert.match(result.message,/salvar a sacola/);
});
test('dados pessoais nunca são persistidos na sacola',()=>{
  const {bag,entries}=bagSystem();
  const result=bag.save([{id,color:'Bege',size:'M',quantity:1,cpf:'00000000000',customer_email:'nome@example.com'}]);
  assert.equal(result.ok,true);
  const raw=entries.get('saluz-bag-v1');
  assert.equal(raw.includes('cpf'),false);
  assert.equal(raw.includes('example.com'),false);
});
test('ambas as páginas carregam o mesmo módulo de sacola',()=>{
  const files=['loja.html','produto.html'];
  for(const file of files){
    const html=readFileSync(file,'utf8');
    assert.match(html,/src="\.\/sacola\.js"/);
    const bagPos=html.indexOf('sacola.js'),pageJs=html.indexOf(file==='loja.html'?'loja.js':'produto.js');
    assert.ok(bagPos>0&&bagPos<pageJs);
  }
});
