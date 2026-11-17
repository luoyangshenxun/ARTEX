import fs from 'node:fs';
import {inspect} from './native-index.mjs';
const [mode,...args]=process.argv.slice(2);
if(mode==='text'){
  const [file,pattern,start='0',count='100']=args;
  const blocks=fs.readFileSync(file,'utf8').split(/(?=^FUNCTION )/m);
  for(const block of blocks.filter(b=>new RegExp(pattern).test(b.split('\n')[0])))console.log(block.split('\n').slice(+start,+start+(+count)).join('\n'));
}else if(mode==='textmatch'){
  const [file,pattern,match,context='3']=args;
  const blocks=fs.readFileSync(file,'utf8').split(/(?=^FUNCTION )/m);
  for(const block of blocks.filter(b=>new RegExp(pattern).test(b.split('\n')[0]))){
    const lines=block.split('\n'),wanted=new Set();
    lines.forEach((line,i)=>{if(new RegExp(match).test(line))for(let j=Math.max(0,i-(+context));j<=Math.min(lines.length-1,i+(+context));j++)wanted.add(j);});
    console.log(lines[0]);for(const j of [...wanted].sort((a,b)=>a-b))console.log(lines[j]);
  }
}else if(mode==='native'){
  const [file,...addresses]=args,r=inspect(file);
  for(const address of addresses)console.log(JSON.stringify(r.stringAt(Number(address))));
}else if(mode==='struct'){
  const [sample,pattern]=args,j=JSON.parse(fs.readFileSync(`site/antigravity/analysis/v2/${sample}-native-index.json`));
  for(const s of j.structs.filter(s=>new RegExp(pattern).test(s.name)))console.log(JSON.stringify(s,null,2));
}else if(mode==='fields'){
  const [sample,pattern]=args,j=JSON.parse(fs.readFileSync(`site/antigravity/analysis/v2/${sample}-native-index.json`));
  for(const s of j.structs.filter(s=>new RegExp(pattern).test(s.name)))console.log(`${s.name} FILE=${s.offset} SIZE=${s.size} ${s.fields.map(f=>`${f.name}@${f.offset}`).join(' ')}`);
}else if(mode==='literal'){
  const [file,needle]=args,r=inspect(file),hits=[];
  for(let o=r.raw.indexOf(needle);o>=0;o=r.raw.indexOf(needle,o+1)){
    const headers=[];
    for(let back=0;back<=128;back++){
      const a=r.va(o-back);if(a===null)continue;
      const ptr=Buffer.alloc(8);ptr.writeBigUInt64LE(BigInt(a));
      for(let p=r.raw.indexOf(ptr);p>=0;p=r.raw.indexOf(ptr,p+1)){
        if(p+16>r.raw.length)continue;const n=Number(r.raw.readBigUInt64LE(p+8));
        if(n>back&&n<20000)headers.push({address:r.va(p),offset:p,length:n,dataOffset:o-back,text:r.raw.subarray(o-back,o-back+Math.min(n,1500)).toString()});
      }
    }
    hits.push({offset:o,context:r.raw.subarray(o-70,o+240).toString(),headers});
  }
  console.log(JSON.stringify(hits,null,2));
}else if(mode==='functions'){
  const [file,pattern]=args,r=inspect(file);
  for(const f of r.functions.filter(f=>new RegExp(pattern).test(f.name)))console.log(`${f.offset} ${f.size} ${f.name}`);
}else throw new Error('mode text|native|struct');
