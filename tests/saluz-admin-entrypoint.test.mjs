import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
test("build do painel abre o admin na raiz sem servir a home da loja",()=>{
 const dir=mkdtempSync(join(tmpdir(),"saluz-admin-entry-"));
 const output=join(dir,"out");
 try{
  execFileSync("python3",[".github/scripts/build-saluz-admin-preview.py",output],{stdio:"pipe"});
  const admin=readFileSync(join(output,"public/admin.html"),"utf8");
  const index=readFileSync(join(output,"public/index.html"),"utf8");
  assert.equal(index,admin);
  assert.match(index,/id="login-form"/);
  assert.match(index,/id="dashboard"/);
  assert.match(index,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(index,/saluz-admin-polish\.css\?v=20261030-panel1/);
  assert.ok(existsSync(join(output,"public/saluz-admin-polish.css")));
  assert.ok(existsSync(join(output,"functions/api/[[path]].js")));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
