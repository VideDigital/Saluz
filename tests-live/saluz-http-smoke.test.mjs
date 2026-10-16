import test from "node:test";
import assert from "node:assert/strict";

const live=[
  {name:"Loja oficial",origin:"https://usesaluz.com.br",environment:"production",admin:false},
  {name:"Painel oficial",origin:"https://admin.usesaluz.com.br",environment:"production",admin:true},
  {name:"Loja homologacao",origin:"https://homologacao.saluz-loja.pages.dev",environment:"preview",admin:false},
  {name:"Painel homologacao",origin:"https://homologacao.saluz-admin.pages.dev",environment:"preview",admin:true},
];
const html=(s)=>/<!doctype html|<html/i.test(s);
async function get(base,path){
 const url=base+path;
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{redirect:"manual",headers:{"user-agent":"SALUZ-Audit/1.0 (GitHub Actions; availability test)","accept":"text/html,application/json,*/*"},signal:AbortSignal.timeout(12000)});
   const body=await response.text();
   return {status:response.status,contentType:response.headers.get("content-type")||"",body,location:response.headers.get("location")};
  }catch(e){lastError=e;}
 }
 throw new Error("Requisição falhou para "+url+": "+lastError?.message);
}
for(const site of live){
 test(site.name+" / pagina inicial acessivel",async()=>{
   const r=await get(site.origin,"/");
   assert.equal(r.status,200,site.origin+" retornou "+r.status+" "+r.body.slice(0,120));
   assert.ok(html(r.body),site.origin+" não respondeu HTML");
   assert.match(r.body,/SALUZ/i,site.origin+" não contém identificação da marca");
 });
 if(!site.admin){
  test(site.name+" / API publica configurada com checkout bloqueado",async()=>{
   const status=await get(site.origin,"/api/status");
   assert.equal(status.status,200,site.origin+" /api/status");
   const data=JSON.parse(status.body);
   assert.equal(data.configured,true);
   assert.equal(data.checkout_enabled,false);
   assert.equal(data.orders_locked,true);
  });
  test(site.name+" / produtos e conteúdo público",async()=>{
   for(const endpoint of ["/api/products?limit=1","/api/site-content"]){
    const r=await get(site.origin,endpoint);
    assert.equal(r.status,200,site.origin+" "+endpoint+" : "+r.body.slice(0,120));
    const payload=JSON.parse(r.body);
    assert.ok(endpoint.includes("products")?Array.isArray(payload.products):typeof payload.content==="object");
   }
  });
 }else{
  test(site.name+" / recursos frontend e acesso administrativo protegido",async()=>{
   for(const resource of ["/admin.js","/saluz-professional.css","/saluz-campaigns.js"]){
    const r=await get(site.origin,resource);
    assert.equal(r.status,200,site.origin+" "+resource);
    assert.ok(r.body.length>300,resource+" vazio");
   }
   const admin=await get(site.origin,"/api/admin/store-health");
   assert.equal(admin.status,401,site.origin+" permitiu acesso não autenticado ou falhou com "+admin.status);
   const auth=await get(site.origin,"/api/auth/me");
   assert.equal(auth.status,200,site.origin+" /api/auth/me");
   assert.equal(JSON.parse(auth.body).admin,false);
  });
 }
}
test("SEO / robots e sitemap oficial",async()=>{
 const [robots,sitemap]=await Promise.all([
   get("https://usesaluz.com.br","/robots.txt"),
   get("https://usesaluz.com.br","/sitemap.xml")
 ]);
 assert.equal(robots.status,200);
 assert.match(robots.body,/sitemap\.xml/i);
 assert.equal(sitemap.status,200);
 assert.match(sitemap.body,/https:\/\/usesaluz\.com\.br\//);
 assert.doesNotMatch(sitemap.body,/admin\.html/);
});
