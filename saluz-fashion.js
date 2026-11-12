/* SALUZ Moda — navegação e taxonomia da vitrine. Revisar junto com cloudflare/d1/fashion-catalog.mjs. */
(()=>{
 "use strict";
 const groups={
  "Roupas": [
    "Blusas",
    "Camisas",
    "Camisetas e regatas",
    "Croppeds",
    "Calças",
    "Shorts",
    "Saias",
    "Vestidos",
    "Conjuntos",
    "Casacos e jaquetas"
  ],
  "Bolsas": [
    "Transversais",
    "De ombro",
    "Tote e shopper",
    "Mochilas",
    "Carteiras"
  ],
  "Acessórios": [
    "Bijuterias",
    "Cintos",
    "Lenços e echarpes",
    "Óculos",
    "Acessórios de cabelo"
  ]
};
 const slugs={"Roupas":"roupas","Bolsas":"bolsas","Acessórios":"acessorios"};
 const categories=Object.entries(groups).flatMap(([group,types])=>types.map(type=>group+" / "+type));
 const isCategory=name=>categories.includes(name);
 const groupOf=name=>Object.keys(groups).find(group=>groups[group].some(type=>name===group+" / "+type))||null;
 const link=(group,type)=>"./loja.html?"+(type?"categoria="+encodeURIComponent(group+" / "+type):"grupo="+encodeURIComponent(slugs[group]))+"#produtos";
 window.SaluzModa=Object.freeze({groups,slugs,categories,isCategory,groupOf,link});
})();
