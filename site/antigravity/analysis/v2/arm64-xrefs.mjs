import fs from 'node:fs';
import {inspect} from './native-index.mjs';
const [file,...needles]=process.argv.slice(2),r=inspect(file),targets=[];
for(const needle of needles){
  if(needle.startsWith('@'))targets.push({needle,offset:r.off(Number(needle.slice(1))),address:Number(needle.slice(1))});
  else for(let o=r.raw.indexOf(needle);o>=0;o=r.raw.indexOf(needle,o+1))targets.push({needle,offset:o,address:r.va(o)});
}
const hits=[];
for(const f of r.functions){
  for(let o=f.offset;o!==null&&o<f.offset+f.size;o+=4){
    const w=r.raw.readUInt32LE(o);if((w&0x9f000000)>>>0!==0x90000000)continue;
    const rd=w&31;let imm=((w>>>29)&3)|(((w>>>5)&0x7ffff)<<2);if(imm&(1<<20))imm-=1<<21;
    const page=Math.floor(r.va(o)/4096)*4096+imm*4096;
    for(let k=4;k<=16&&o+k<f.offset+f.size;k+=4){
      const add=r.raw.readUInt32LE(o+k);if(((add>>>5)&31)!==rd)continue;
      let a;
      if((add&0x7f000000)===0x11000000)a=page+((add>>>10)&4095)*((add&(1<<22))?4096:1);
      else if(((add&0xff800000)>>>0)===0xf9000000)a=page+((add>>>10)&4095)*8;
      else continue;
      for(const t of targets)if(a<=t.address&&t.address-a<(t.needle.startsWith('@')?1:256))hits.push({...t,referenceAddress:a,referenceOffset:r.off(a),delta:t.address-a,function:f.name,functionOffset:f.offset,instructionOffset:o+k});
    }
  }
}
console.log(JSON.stringify(hits,null,2));
