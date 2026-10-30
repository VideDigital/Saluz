/* SALUZ: identical field/banner contract to the currently reviewed legacy editor.
 * This module has no network, writes, account details or token access.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeText=(value,max)=>String(value??"").trim().slice(0,max);
const siteContentFields={top_bar:110,hero_title:90,hero_description:310,hero_button:48,hero_image_url:500,hero_link:95,
  featured_title:80,new_title:80,featured_description:180,new_description:180,business_hours:100,contact_email:180,store_notice:170,
  promo_enabled:3,promo_title:90,promo_description:220,promo_button:48,promo_link:95,promo_image_url:500,whatsapp_number:15,instagram_url:180,
  moment_label:42,moment_title:100,moment_image_url:500,
  moment_link1_title:48,moment_link1_href:95,moment_link2_title:48,moment_link2_href:95,
  moment_link3_title:48,moment_link3_href:95,moment_link4_title:48,moment_link4_href:95,
  gift_label:42,gift_title:100,gift_description:200,gift_image_url:500,gift_button:48,gift_link:95,
  kits_title:100,
  kit1_title:64,kit1_description:180,kit1_link:95,
  kit2_title:64,kit2_description:180,kit2_link:95,
  kit3_title:64,kit3_description:180,kit3_link:95};
const allowedStoreLinks=new Set(["./loja.html","./colecoes.html","./colecao-necessaires.html",
  "./colecao-porta-joias.html","./colecao-kits-presentes.html","./colecao-autocuidado.html","./atendimento.html",
  "./colecao-organizadores-maquiagem.html","./colecao-organizadores-bolsa.html",
  "./colecao-acessorios-viagem.html","./colecao-acessorios-femininos.html"]);
const allowedBannerPlacements=new Set(["home_after_hero","home_before_featured","home_before_new",
  "home_bottom","catalog_after_hero","catalog_before_products","catalog_bottom"]);
const allowedBannerStyles=new Set(["editorial","compact","image"]);
function validateBannerDate(raw) {
  if(raw==null||raw==="")return "";
  const value=String(raw);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString()!==value)throw new Error("Data da campanha inválida");
  return value;
}
function validateBanners(raw) {
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>24)throw new Error("Limite de 24 banners por loja");
  const ids=new Set();
  const cleaned=raw.map(item=>{
    if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("Banner inválido");
    const id=String(item.id||"");
    if(!uuid.test(id)||ids.has(id))throw new Error("Identificador de banner inválido");
    ids.add(id);
    const placement=String(item.placement||""),style=String(item.style||"editorial");
    if(!allowedBannerPlacements.has(placement)||!allowedBannerStyles.has(style))throw new Error("Local ou estilo do banner inválido");
    const textFields={eyebrow:42,title:90,description:230,button_label:48,image_url:500,mobile_image_url:500};
    const record={id,placement,style};
    for(const [key,max] of Object.entries(textFields)){
      const value=safeText(item[key],max);
      if(/[<>]/.test(value))throw new Error("HTML não permitido em banners");
      if((key==="image_url"||key==="mobile_image_url")&&value&&!/^https:\/\/[^\s<>"']+$/i.test(value))
        throw new Error("Imagem do banner deve usar HTTPS");
      record[key]=value;
    }
    if(!record.title)throw new Error("Informe o título do banner");
    const link=String(item.link||"");
    if(!allowedStoreLinks.has(link))throw new Error("Escolha um link existente na loja");
    record.link=link;
    record.active=item.active===true;
    record.starts_at=validateBannerDate(item.starts_at);
    record.ends_at=validateBannerDate(item.ends_at);
    if(record.starts_at&&record.ends_at&&Date.parse(record.ends_at)<=Date.parse(record.starts_at))
      throw new Error("Término deve ser posterior ao início do banner");
    return record;
  });
  return cleaned;
}
export function validateSiteContent(raw){
  if(!raw || Array.isArray(raw) || typeof raw!=="object")throw new Error("Conteúdo inválido");
  if(Object.keys(raw).some(key=>!(key in siteContentFields)&&key!=="banners"))throw new Error("Campo de conteúdo não permitido");
  const cleaned={};
  for(const [key,max] of Object.entries(siteContentFields)){
    const value=safeText(raw[key],max);
    if(/[<>]/.test(value))throw new Error("HTML não é permitido nos textos da loja");
    if((["hero_image_url","promo_image_url","moment_image_url","gift_image_url"].includes(key))&&value&&!/^https:\/\/[^\s<>"']+$/i.test(value))throw new Error("Imagem deve usar URL HTTPS");
    if(["hero_link","promo_link","moment_link1_href","moment_link2_href","moment_link3_href","moment_link4_href","gift_link","kit1_link","kit2_link","kit3_link"].includes(key)&&value&&!allowedStoreLinks.has(value)&&!(key==="gift_link"&&value==="#kits"))throw new Error("O link deve apontar para uma página existente da SALUZ");
    if(key==="promo_enabled"&&value&&!["yes","no"].includes(value))throw new Error("Opção de banner inválida");
    if(key==="whatsapp_number"&&value&&!/^\d{10,13}$/.test(value.replace(/\D/g,"")))throw new Error("WhatsApp deve ter DDD e número válidos");
    if(key==="instagram_url"&&value&&!/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]{1,30}\/?$/.test(value))throw new Error("Informe um link de perfil do Instagram válido");
    if(key==="contact_email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error("E-mail inválido");
    cleaned[key]=key==="whatsapp_number"?value.replace(/\D/g,""):value;
  }
  cleaned.banners=validateBanners(raw.banners);
  return cleaned;
}

