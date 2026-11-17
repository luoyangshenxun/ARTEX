import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'..');
const manifest=path.join(dir,'integrity-manifest.json');
const excluded=new Set(['unpacked','tools','raw','captures','node_modules']);
function files(at=root){
  const list=[];
  for(const e of fs.readdirSync(at,{withFileTypes:true})){
    if(excluded.has(e.name))continue;
    const file=path.join(at,e.name);
    if(e.isDirectory())list.push(...files(file));
    else if(file!==manifest&&!/\.tgz$|\.partial$|\.exe$|\.source$|rollback-copy\.md$|static-evidence\.json$|\.stdout\.txt$|\.stderr\.txt$/.test(e.name))
      list.push(file);
  }
  return list.sort();
}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(process.argv.includes('--check')){
  const entries=JSON.parse(fs.readFileSync(manifest)).files;
  for(const entry of entries){
    const file=path.join(root,entry.path),bytes=fs.readFileSync(file);
    assert.equal(bytes.length,entry.bytes,entry.path);assert.equal(sha(bytes),entry.sha256,entry.path);
  }
  console.log(`DELIVERY_HASH_CHECK=PASS files=${entries.length}`);
}else{
  const entries=files().map(file=>{
    const bytes=fs.readFileSync(file);
    new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    return{path:path.relative(root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};
  });
  fs.writeFileSync(manifest,JSON.stringify({schema_version:2,date:new Date().toISOString(),
    scope:'site/claude authored reports/scripts/excerpts only; no downloads or complete modules',
    files:entries},null,2)+'\n');
  const reopened=JSON.parse(fs.readFileSync(manifest));
  assert.equal(reopened.files.length,entries.length);
  console.log(`DELIVERY_SEALED=${manifest} files=${entries.length} bytes=${entries.reduce((sum,e)=>sum+e.bytes,0)}`);
}
