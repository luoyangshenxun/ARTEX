import fs from 'node:fs';
const binary=fs.readFileSync('site/antigravity/analysis/unpacked/macos-app-2.32.1/Antigravity.app/Contents/Resources/bin/language_server');
const blocks=fs.readFileSync('site/antigravity/analysis/v2/M1-modelapi.disasm.txt','utf8').split(/(?=^FUNCTION )/m);
const maps=[];
for(const block of blocks.filter(b=>/codeassistclient.map.init.[01] VA/.test(b.split('\n')[0]))){
  const regs={},entries=[];let entry;
  for(const line of block.split('\n').slice(1)){
    const num=line.match(/(?:mov (x\d+), #0x|orr (x\d+), xzr, #0x)([a-f\d]+)/);
    if(num)regs[num[1]||num[2]]=parseInt(num[3],16);
    const ref=line.match(/add (x\d+), .*ref=0x[a-f\d]+ file=(\d+)/);
    if(ref)regs[ref[1]]={offset:+ref[2]};
    if(line.includes('runtime.mapassign_fast32')){
      entry={key:regs.x2,callOffset:+line.match(/file=(\d+)/)[1]};
      entries.push(entry);for(let i=0;i<19;i++)delete regs[`x${i}`];
    }
    const store=line.match(/str (x\d+), \[x0(?:,#(\d+))?\]/);
    if(store&&entry){
      const v=regs[store[1]];
      if(store[2]==='8'&&typeof v==='number')entry.length=v;
      if(!store[2]&&v?.offset!==undefined)entry.dataOffset=v.offset;
    }
  }
  for(const e of entries)if(e.dataOffset!==undefined&&e.length!==undefined)e.value=binary.subarray(e.dataOffset,e.dataOffset+e.length).toString();
  maps.push({symbol:block.split('\n')[0],entries});
}
fs.writeFileSync('site/antigravity/analysis/v2/request-type-maps.json',JSON.stringify(maps,null,2)+'\n');
console.log(JSON.stringify(maps,null,2));
