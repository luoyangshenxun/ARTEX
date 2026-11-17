import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {dir} from './source-lib.mjs';
const root = path.join(dir, 'raw/bun-upstream');
fs.mkdirSync(root, {recursive:true});
const records = [];
const jobs = [
  ...['bun-v1.4.4','6634fc3b5','bun-v1.4.3','bun-v1.4.1'].flatMap(revision =>
    ['src/env.zig','src/bun.js/bindings/BunProcess.cpp','src/standalone_graph/StandaloneModuleGraph.rs']
      .map(file => ({revision,file}))),
  {revision:'bun-v1.4.4',file:'src/http.zig'},
  {revision:'bun-v1.4.4',file:'src/bun.js/webcore/response.zig'},
];
const outcomes=await Promise.allSettled(jobs.map(async ({revision,file})=>{
  const url=`https://raw.githubusercontent.com/oven-sh/bun/${revision}/${file}`;
  const response=await fetch(url);
  const text=await response.text();
  const record={revision,file,url,status:response.status,
    sha256:crypto.createHash('sha256').update(text).digest('hex')};
  if(response.ok)fs.writeFileSync(path.join(root,`${revision}-${file.replaceAll('/','_')}`),text);
  records.push(record);
  console.log(JSON.stringify({...record,matches:text.split('\n')
    .filter(line=>/nodejs_version|NODE_VERSION|processVersion|BoringSSL|BORINGSSL|26\.12\.1|26\.3\.0/.test(line))
    .map(line=>line.trim()).slice(0,15)}));
}));
for(let index=0;index<outcomes.length;index++){
  const outcome=outcomes[index];
  if(outcome.status==='rejected'){
    const record={...jobs[index],error:String(outcome.reason),cause:String(outcome.reason?.cause)};
    records.push(record);
    console.error(JSON.stringify(record));
  }
}
fs.writeFileSync(path.join(dir,'bun-source-provenance.json'),JSON.stringify(records,null,2)+'\n');
if(!records.some(r=>r.status===200))process.exitCode=1;
