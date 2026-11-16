import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as frida from '../hooks/node_modules/frida/build/src/frida.js';

const media=path.dirname(fileURLToPath(import.meta.url)),out=path.join(media,'full_video');
const flags=process.argv.slice(2),option=(name,fallback)=>{const i=flags.indexOf(name);return i<0?fallback:flags[i+1];};
const latest=JSON.parse(fs.readFileSync(path.join(out,'latest_head_capture.json')));
const lines=fs.readFileSync(path.join(latest.run,'chunks.jsonl'),'utf8').trim().split('\n');
const io=option('--io',JSON.parse(lines.at(-1)).object),pid=Number(option('--pid','56664'));
const inventory=JSON.parse(fs.readFileSync(path.join(media,'PlayerLibRender56_vs.dll.inventory.json')));
const actual=crypto.createHash('sha256').update(fs.readFileSync(inventory.file)).digest('hex');
if(actual!==inventory.sha256)throw new Error('Render DLL hash mismatch');
const session=await frida.attach(pid);let script;
const source=String.raw`
function std(p){const length=p.add(16).readU64().toNumber(),capacity=p.add(24).readU64().toNumber();if(length<1||length>4096||capacity<length||capacity>100000)throw new Error('Unexpected filename string');return (capacity<16?p:p.readPointer()).readUtf8String(length);}
rpc.exports={extract(io){const input=ptr(io),context=input.add(8).readPointer().add(0x170).readPointer(),head=context.add(0x2a8).readPointer(),count=context.add(0x2b0).readU64().toNumber(),rows=[],excluded=[],seen=new Set();if(count<1||count>20000)throw new Error('Unexpected map size');function walk(node,depth){if(depth>64)throw new Error('Unexpected tree depth');if(node.equals(head)||node.add(0x19).readU8())return;if(seen.has(node.toString()))throw new Error('Tree cycle');seen.add(node.toString());walk(node.readPointer(),depth+1);const name=std(node.add(0x20)),value=node.add(0x40).readPointer(),index=value.add(8).readU32();if(index===0xffffffff)excluded.push({index,kind:'descriptor_self_entry'});else{if(!/^[A-Za-z0-9_.-]+\.ts$/i.test(name))throw new Error('Unexpected segment name');rows.push({index,file:name});}walk(node.add(16).readPointer(),depth+1);}walk(head.add(8).readPointer(),0);return {io,context:context.toString(),declaredMapCount:count,visitedNodes:seen.size,excluded,rows};}}
`;
try{script=await session.createScript(source,{name:'evplayer2-readonly-segment-order'});await script.load();const snapshot=await script.exports.extract(io),ordered=snapshot.rows.sort((a,b)=>a.index-b.index).map(x=>({...x,cachePath:path.join('D:/EVPlayer2_download',x.file),exists:fs.existsSync(path.join('D:/EVPlayer2_download',x.file))}));
 if(ordered.some((x,i)=>x.index!==i)||snapshot.visitedNodes!==snapshot.declaredMapCount)throw new Error('Incomplete or non-contiguous index list');
 const full=JSON.parse(fs.readFileSync(path.join(out,'latest_capture.json'))),capture=JSON.parse(fs.readFileSync(full.result));
 const indices=capture.final.sourceFiles.map(p=>ordered.find(x=>x.file===path.win32.basename(p))?.index);
 const result={time:new Date().toISOString(),method:'Read TsCtx+0x8 from existing M3u8Ctx map +0x2a8; no playback or hooks required.',pid,context:snapshot.context,io,declaredMapCount:snapshot.declaredMapCount,excludedSelfEntryCount:snapshot.excluded.length,count:ordered.length,contiguousZeroBased:true,allCacheFilesExist:ordered.every(x=>x.exists),observedCount:indices.length,observedIndices:indices,observedStrictlyIncreasing:indices.every((n,i)=>n===i),all147ReadInOrder:indices.length===ordered.length&&indices.every((n,i)=>n===i),ordered};
 fs.writeFileSync(path.join(out,'segment_order.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(out,'segment_order.csv'),'index,file,cachePath,exists\r\n'+ordered.map(x=>`${x.index},${x.file},${x.cachePath},${x.exists}`).join('\r\n')+'\r\n');
 fs.writeFileSync(path.join(out,'readonly_order_snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
 console.log(JSON.stringify({pid,io,context:snapshot.context,count:ordered.length,allCacheFilesExist:result.allCacheFilesExist,allReadInOrder:result.all147ReadInOrder,json:path.join(out,'segment_order.json'),csv:path.join(out,'segment_order.csv')}));
}finally{if(script)await script.unload();await session.detach();}
