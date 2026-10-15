/* SALUZ · Sacola unificada entre vitrine e página de produto.
   Somente IDs, cores, tamanhos e quantidades; nunca dados pessoais. */
(function(global){
  "use strict";
  const KEY="saluz-bag-v1";
  const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const MAX_LINES=60;
  const MAX_UNITS=10;
  const cleanText=s=>typeof s==="string"?s.trim().slice(0,80):"";
  const stockLimit=variation=>Math.min(MAX_UNITS,Math.max(0,Math.floor(Number(variation?.stock)||0)));
  const keyFor=(id,color,size)=>JSON.stringify([id,color,size]);
  const normalize=input=>{
    if(!Array.isArray(input))return [];
    const combined=new Map();
    for(const item of input.slice(0,MAX_LINES*2)){
      if(!item||typeof item!=="object"||!ID.test(String(item.id||"")))continue;
      const id=String(item.id).toLowerCase(),color=cleanText(item.color),size=cleanText(item.size);
      const qty=Number(item.quantity);
      if(!Number.isInteger(qty)||qty<=0)continue;
      const key=keyFor(id,color,size);
      if(!combined.has(key)&&combined.size>=MAX_LINES)continue;
      combined.set(key,{key,id,color,size,quantity:Math.min(MAX_UNITS,(combined.get(key)?.quantity||0)+qty)});
    }
    return [...combined.values()];
  };
  function read(){
    try{return normalize(JSON.parse(global.localStorage.getItem(KEY)||"[]"));}
    catch{return [];}
  }
  function save(lines){
    const items=normalize(lines);
    try{global.localStorage.setItem(KEY,JSON.stringify(items));return {ok:true,items};}
    catch{return {ok:false,items,message:"Não foi possível salvar a sacola neste navegador."};}
  }
  function add(product,variation,amount=1){
    const id=String(product?.id||"").toLowerCase();
    const color=cleanText(variation?.color),size=cleanText(variation?.size);
    const quantity=Number(amount),limit=stockLimit(variation);
    if(!ID.test(id)||!variation||!Number.isInteger(quantity)||quantity<1)return {ok:false,message:"Produto ou quantidade inválida."};
    if(!limit)return {ok:false,message:"Esta variação está indisponível."};
    const items=read(),key=keyFor(id,color,size);
    const current=items.find(line=>line.key===key);
    if(!current&&items.length>=MAX_LINES)return {ok:false,message:"A sacola está cheia. Finalize ou remova itens antes de continuar."};
    const next=(current?.quantity||0)+quantity;
    if(next>limit)return {ok:false,message:"Quantidade acima do estoque disponível para esta variação."};
    if(current)current.quantity=next;
    else items.push({key,id,color,size,quantity});
    return save(items);
  }
  function change(index,delta,variation){
    const items=read(),line=items[index];
    if(!line||!Number.isInteger(delta))return {ok:false,message:"Não foi possível atualizar este item."};
    const next=line.quantity+delta;
    if(next<=0){items.splice(index,1);return save(items);}
    if(next>stockLimit(variation))return {ok:false,message:"Quantidade acima do estoque disponível."};
    line.quantity=next;
    return save(items);
  }
  function remove(index){
    const items=read();
    if(!Number.isInteger(index)||index<0||index>=items.length)return {ok:false,message:"Item inválido."};
    items.splice(index,1);return save(items);
  }
  const count=items=>normalize(items).reduce((sum,item)=>sum+item.quantity,0);
  global.SaluzBag=Object.freeze({read,save,add,change,remove,count,stockLimit,normalize});
})(window);
