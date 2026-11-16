import fs from 'node:fs';
import crypto from 'node:crypto';
const file='C:/Windows/System32/user32.dll',b=fs.readFileSync(file);
const pe=b.readUInt32LE(0x3c),sectionCount=b.readUInt16LE(pe+6),optional=pe+24,sectionStart=optional+b.readUInt16LE(pe+20),sections=[];
for(let i=0;i<sectionCount;i++){const s=sectionStart+i*40;sections.push({rva:b.readUInt32LE(s+12),size:Math.max(b.readUInt32LE(s+8),b.readUInt32LE(s+16)),raw:b.readUInt32LE(s+20)});}
const offset=rva=>{const s=sections.find(s=>rva>=s.rva&&rva<s.rva+s.size);if(!s)throw new Error('Unmapped RVA '+rva);return s.raw+rva-s.rva;};
const text=o=>b.subarray(o,b.indexOf(0,o)).toString('ascii');
const exp=offset(b.readUInt32LE(optional+112)),count=b.readUInt32LE(exp+24),functions=offset(b.readUInt32LE(exp+28)),names=offset(b.readUInt32LE(exp+32)),ordinals=offset(b.readUInt32LE(exp+36));
const memory=JSON.parse(fs.readFileSync(new URL('./entries.json',import.meta.url),'utf8')),results=[];
for(let i=0;i<count;i++){const name=text(offset(b.readUInt32LE(names+i*4)));if(!['SetWindowDisplayAffinity','GetWindowDisplayAffinity'].includes(name))continue;const rva=b.readUInt32LE(functions+b.readUInt16LE(ordinals+i*2)*4),disk=b.subarray(offset(rva),offset(rva)+48).toString('hex'),live=memory.entries.find(x=>x.name===name);results.push({name,rva:'0x'+rva.toString(16),disk,memory:live.bytes,equal:disk===live.bytes,diskFirst8:disk.slice(0,16),memoryFirst8:live.bytes.slice(0,16)});}
const result={file,sha256:crypto.createHash('sha256').update(b).digest('hex'),results};
fs.writeFileSync(new URL('./user32_comparison.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));