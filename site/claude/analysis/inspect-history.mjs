import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {dir} from './source-lib.mjs';
const samples=JSON.parse(fs.readFileSync(path.join(dir,'sample-provenance.json')));
const results=[];
for(const sample of samples.filter(s=>s.platform==='main')){
  const file=path.join(dir,sample.packageRoot,'cli.js');
  if(!fs.existsSync(file))continue;
  const bytes=fs.readFileSync(file),text=bytes.toString('utf8'),hits=[];
  for(const term of ['user_${','user_id:']){
    let at=-1,count=0;
    while((at=text.indexOf(term,at+1))!==-1){
      if(++count>8)break;
      hits.push({term,offset:at,byte_offset:Buffer.byteLength(text.slice(0,at)),
        excerpt:text.slice(Math.max(0,at-400),at+600)});
    }
  }
  const item={sample:sample.id,version:sample.version,file:path.relative(dir,file).replaceAll('\\','/'),
    sha256:crypto.createHash('sha256').update(bytes).digest('hex'),hits};
    results.push(item);console.log(JSON.stringify(item));
}
fs.writeFileSync(path.join(dir,'historical-metadata-evidence.json'),JSON.stringify(results,null,2)+'\n');
