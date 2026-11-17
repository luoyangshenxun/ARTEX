import fs from 'node:fs';
import {inspect} from './native-index.mjs';
const [file,pattern,out]=process.argv.slice(2),r=inspect(file),p=new RegExp(pattern);
const targets=new Map(r.functions.filter(f=>p.test(f.name)).map(f=>[f.address,f]));
const calls=[];
if(r.arch!=='arm64')throw Error('ARM64 only');
for(const f of r.functions)for(let o=f.offset;o!==null&&o<f.offset+f.size;o+=4){
  const w=r.raw.readUInt32LE(o);if((w&0xfc000000)>>>0!==0x94000000)continue;
  let imm=w&0x3ffffff;if(imm&0x2000000)imm-=0x4000000;
  const to=targets.get(r.va(o)+imm*4);
  if(to)calls.push({caller:f.name,callerOffset:f.offset,instructionOffset:o,target:to.name,targetOffset:to.offset});
}
const text=JSON.stringify(calls,null,2)+'\n';if(out)fs.writeFileSync(out,text);else console.log(text);
