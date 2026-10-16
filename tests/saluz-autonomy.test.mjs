import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=new URL("../",import.meta.url);
const apiCode=await readFile(new URL("functions/api/[[path]].js",root),"utf8");
const {onRequest}=await import("data:text/javascript;base64,"+Buffer.from(apiCode).toString("base64"));
const env={SUPABASE_URL:"https://supabase.test",SUPABASE_ANON_KEY:"anon-test",SUPABASE_SERVICE_ROLE_KEY:"service-test"};
const user="f31e8a5b-c790-4f64-8b68-ce220784c101";
const base="https://homologacao.saluz-loja.pages.dev";
function mockAdminApi(){
  const calls=[];
  const fetchMock=async(input,options={})=>{
    const url=String(input);
    calls.push({url,method:options.method||"GET",body:options.body});
    if(url.includes("/auth/v1/user"))return new Response(JSON.stringify({id:user}),{status:200});
    if(url.includes("saluz_admins"))return new Response(JSON.stringify([{user_id:user}]),{status:200});
    if(url.includes("saluz_site_content")&&url.includes("select=revision"))return new Response('[{"revision":0}]',{status:200});
    if(url.includes("saluz_products")&&(options.method==="POST"))return new Response(JSON.stringify([JSON.parse(options.body)]),{status:200});
    if(url.includes("saluz_site_content")&&options.method==="PATCH")
      return new Response(JSON.stringify([{draft:JSON.parse(options.body).draft,revision:1,published:{}}]),{status:200});
    throw Error("Unexpected mocked fetch: "+url);
  };
  return {calls,fetchMock};
}
async function executeAdmin(path,method,data,fetchMock){
 const previous=globalThis.fetch;globalThis.fetch=fetchMock;
 try{
   const request=new Request(base+"/api/"+path,{
     method,headers:{origin:base,"content-type":"application/json","cookie":"__Host-saluz_session=test"},
     body:method==="GET"?undefined:JSON.stringify(data)
   });
   return await onRequest({request,env});
 }finally{globalThis.fetch=previous;}
}
test("Descontos: recusa preco antigo menor ou igual ao preco atual",async()=>{
 const {calls,fetchMock}=mockAdminApi();
 const product={name:"Necessaire rosa",description:"Produto real",category:"Nécessaires",image_url:"https://site.test/a.jpg",price_cents:8500,original_price_cents:8000,is_active:true,is_featured:true,variants:[{color:"Rosa",size:"Único",stock:2,image_url:""}]};
 const response=await executeAdmin("admin/products","POST",product,fetchMock);
 assert.equal(response.status,400);
 assert.equal(calls.filter(x=>x.method==="POST").length,0,"No writes on invalid price");
});
test("Descontos: cadastra preco real com preco anterior opcional",async()=>{
 const {calls,fetchMock}=mockAdminApi();
 const product={name:"Necessaire rosa",description:"Produto real",category:"Nécessaires",image_url:"https://site.test/a.jpg",price_cents:8500,original_price_cents:11900,is_active:true,is_featured:true,variants:[{color:"Rosa",size:"Único",stock:2,image_url:""}]};
 const response=await executeAdmin("admin/products","POST",product,fetchMock);
 assert.equal(response.status,201);
 assert.equal((await response.json()).product.original_price_cents,11900);
 const sent=JSON.parse(calls.find(x=>x.method==="POST").body);
 assert.equal(sent.price_cents,8500,"Only actual sale price stored for transactions");
});
test("Banners: rejeita links externos arbitrarios",async()=>{
 const {calls,fetchMock}=mockAdminApi();
 const response=await executeAdmin("admin/site-content","PUT",{revision:0,draft:{hero_link:"https://outro-site.com",promo_enabled:"yes"}},fetchMock);
 assert.equal(response.status,400);
 assert.equal(calls.filter(x=>x.method==="PATCH").length,0);
});
test("Banners: nao permite criar novos enderecos de paginas",async()=>{
 const {calls,fetchMock}=mockAdminApi();
 const response=await executeAdmin("admin/site-content","PUT",{revision:0,draft:{promo_link:"./pagina-nova.html"}},fetchMock);
 assert.equal(response.status,400);
 assert.equal(calls.filter(x=>x.method==="PATCH").length,0);
});
test("Banners: aceita link existente e valida habilitacao",async()=>{
 const {calls,fetchMock}=mockAdminApi();
 const response=await executeAdmin("admin/site-content","PUT",{revision:0,draft:{promo_enabled:"yes",promo_link:"./colecao-kits-presentes.html",promo_title:"Dia especial"}},fetchMock);
 assert.equal(response.status,200);
 const sent=JSON.parse(calls.find(x=>x.method==="PATCH").body);
 assert.equal(sent.draft.promo_link,"./colecao-kits-presentes.html");
});
test("Banners: nao permite HTML injetado",async()=>{
 const {fetchMock}=mockAdminApi();
 const response=await executeAdmin("admin/site-content","PUT",{revision:0,draft:{promo_title:"<script>alert(1)</script>"}},fetchMock);
 assert.equal(response.status,400);
});
test("Navegador: arquivos Javascript modificados têm sintaxe valida",()=>{
 for(const filename of ["admin.js","saluz-studio.js","saluz-mobile.js","saluz-site-content.js","home-vitrine.js","loja.js","produto.js","colecao.js","functions/api/[[path]].js"]){
   const path=fileURLToPath(new URL(filename,root));
   assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",path],{stdio:"pipe"}),filename);
 }
});
test("Painel: nao oferece criacao de paginas, mas oferece fotos e links",async()=>{
 const html=await readFile(new URL("admin.html",root),"utf8");
 assert.match(html,/data-studio-upload="hero_image_url"/);
 assert.match(html,/data-studio-upload="promo_image_url"/);
 assert.match(html,/data-studio-section="contato"/);
 assert.match(html,/name="original_price"/);
 assert.doesNotMatch(html,/criar nova página|adicionar página/i);
});
