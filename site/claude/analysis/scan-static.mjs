// Static-only scanner over a validated native Bun graph. No --sdk-root needed.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {dir,graphs} from './source-lib.mjs';
const {values}=parseArgs({options:{sample:{type:'string',default:'S1'},output:{type:'string'},
  term:{type:'string',multiple:true}}});
const graph=graphs().find(g=>g.sample===values.sample);
if(!graph)throw Error(`Extract sample ${values.sample} first with extract-bun.mjs`);
const terms=values.term??['X-Stainless-','anthropic-beta','cc_entrypoint','cch=',
  'fine-grained-tool-streaming','mid-conversation-output-config-2026-07-01',
  'redact-thinking-2026-02-12','inline-tools-2026-09-15',
  'process.version','getPlatformProperties','CLAUDE_CODE_ENTRYPOINT','undici'];
const results=Object.fromEntries(terms.map(t=>[t,{count:0,locations:[]}]));
let moduleCount=0;
for(const m of graph.modules){
  if(m.encoding===0||!/\.(?:m?js|cjs)$/.test(m.modulePath))continue;
  const text=fs.readFileSync(path.join(dir,m.extractedPath)).toString(m.textEncoding);
  moduleCount++;
  for(const term of terms){
    let at=-1;
    while((at=text.indexOf(term,at+1))!==-1){
      const row=results[term];row.count++;
      if(row.locations.length<12)row.locations.push({module:m.modulePath,index:m.index,
        module_offset:at,binary_offset:m.contentsOffset+at*(m.encoding===2?2:1),
        excerpt:text.slice(Math.max(0,at-100),at+term.length+140)});
    }
  }
}
const native=fs.readFileSync(path.join(dir,graph.binary)).subarray(0,graph.base);
const nativeMarkers={};
for(const term of ['BoringSSL','boringssl','OpenSSL','node/v26.12.1','node/v26.3.0']){
  let offset=-1,count=0;
  const locations=[];
  while((offset=native.indexOf(term,offset+1))!==-1){
    count++;
    if(locations.length<4)locations.push({binary_offset:offset,
      excerpt:native.subarray(Math.max(0,offset-60),offset+term.length+120).toString('latin1')});
  }
  nativeMarkers[term]={count,locations};
}
const output={sample:graph.sample,version:graph.version,scope:'decoded embedded JS modules; native prefix searched separately',
  module_count:moduleCount,negative_result_limit:'absence in decoded strings is not proof a runtime/env cannot supply the value',
  results,native_markers:nativeMarkers,official_binary_executed:false};
const file=path.resolve(values.output??path.join(dir,'static-evidence.json'));
fs.mkdirSync(path.dirname(file),{recursive:true});
fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({output:file,sample:graph.sample,modules:moduleCount,
  counts:Object.fromEntries(Object.entries(results).map(([t,r])=>[t,r.count])),
  native_markers:Object.fromEntries(Object.entries(nativeMarkers).map(([t,r])=>[t,r.count]))}));
