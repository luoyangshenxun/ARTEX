import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const out=path.join(path.dirname(fileURLToPath(import.meta.url)),'full_video');
const assembly=JSON.parse(fs.readFileSync(path.join(out,'latest_assembly.json')));
const input=fs.readFileSync(assembly.output),output=path.join(path.dirname(assembly.output),'full_stream.ts');
const chunks=[],padding=[];let begin=0,i=0,packets=0;
while(i<input.length){
 if(i+188<=input.length&&input[i]===0x47){i+=188;packets++;continue;}
 const gapStart=i;
 while(i<input.length&&input[i]===0x23&&i-gapStart<16)i++;
 const count=i-gapStart;
 if(!count||count>16||(i<input.length&&(input[i]!==0x47||i+188>input.length)))throw new Error('Unexpected non-TS bytes at '+gapStart);
 if(i<input.length){for(let j=0;j<Math.min(8,Math.floor((input.length-i)/188));j++)if(input[i+188*j]!==0x47)throw new Error('No stable sync after padding at '+gapStart);}
 chunks.push(input.subarray(begin,gapStart));padding.push({offset:gapStart,bytes:count,value:0x23});begin=i;
}
if(begin<input.length)chunks.push(input.subarray(begin));
const cleaned=Buffer.concat(chunks),removed=padding.reduce((n,p)=>n+p.bytes,0);
if(cleaned.length%188||cleaned.length!==packets*188||cleaned.length+removed!==input.length)throw new Error('Packet accounting mismatch');
fs.writeFileSync(output,cleaned,{flag:'wx'});
const result={time:new Date().toISOString(),input:assembly.output,output,inputBytes:input.length,outputBytes:cleaned.length,packets,paddingLocations:padding.length,paddingBytes:removed,padding,sha256:crypto.createHash('sha256').update(cleaned).digest('hex')};
fs.writeFileSync(path.join(out,'clean_ts_result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,padding:padding.slice(0,5)}));
