/* Catálogo de moda SALUZ — fonte de verdade para a homologação.
 * Estrutura extensível: categorias antigas preservadas para migração sem apagar dados.
 */
export const FASHION_GROUPS = Object.freeze({
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
});
export const LEGACY_CATEGORIES = Object.freeze(["Nécessaires","Porta-joias","Organizadores de maquiagem","Organizadores de bolsa","Acessórios de viagem","Autocuidado","Acessórios femininos","Kits e presentes"]);
export const FASHION_CATEGORIES = Object.freeze(Object.entries(FASHION_GROUPS).flatMap(([group,types])=>types.map(type=>group+" / "+type)));
export const ACCEPTED_CATEGORIES = new Set([...FASHION_CATEGORIES,...LEGACY_CATEGORIES]);
export const isFashionCategory = category=>FASHION_CATEGORIES.includes(category);
export const fashionGroup = category=>Object.keys(FASHION_GROUPS).find(group=>FASHION_GROUPS[group].some(type=>category===group+" / "+type))||null;
