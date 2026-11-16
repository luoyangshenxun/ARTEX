import fs from 'node:fs';
import crypto from 'node:crypto';
import * as frida from '../hooks/node_modules/frida/build/src/frida.js';
const root=new URL('./',import.meta.url);
const flags=process.argv.slice(2),option=(name,fallback)=>{const i=flags.indexOf(name);return i<0?fallback:flags[i+1];};
const targetPid=Number(option('--pid','56664')),duration=Number(option('--seconds','12'));
if(!Number.isInteger(targetPid)||targetPid<=0||!Number.isFinite(duration)||duration<0||duration>120)throw new Error('Invalid --pid or --seconds');
const names=['EVPlayer2.exe','PlayerLibRender56_vs.dll'];
const inventories=Object.fromEntries(names.map(n=>[n,JSON.parse(fs.readFileSync(new URL(n+'.inventory.json',root),'utf8'))]));
const main=inventories['EVPlayer2.exe'],lib=inventories['PlayerLibRender56_vs.dll'];
for(const inventory of Object.values(inventories)){const current=crypto.createHash('sha256').update(fs.readFileSync(inventory.file)).digest('hex');if(current!==inventory.sha256)throw new Error('Inventory binary hash mismatch: '+inventory.name);}
const requested=[];
const add=(module,rva,label)=>{const m=inventories[module],f=m.functions.find(f=>f.begin<=rva&&rva<f.end);if(f&&!requested.some(q=>q.module===module&&q.begin===f.begin))requested.push({module,...f,label});};
for(const name of ['playFile@MediaPlayer','tsList@MediaPlayer','play@EVPlayer','setVideoOut@MediaPlayer','takenRender@EVPlayer','takenAudio@EVPlayer']){const e=lib.exports.find(e=>e.name.includes(name));if(e)add(lib.name,e.rva,e.name);}
for(const rva of [0xee40,0x4af520,0x596c0,0x12300,0x421f0,0x4b13c4])add(lib.name,rva,'identified_by_log_string');
for(const rva of [0x4de40,0x4abc0,0x538a0,0x4fa10,0x4db90,0x52cb0,0x4bcf0,0x54dc0])add(main.name,rva,'business_url_branch');
const mainBytes=fs.readFileSync(main.file),text=main.sections.find(s=>s.name==='.text');
const imports=main.xrefs.filter(x=>x.import&&/playFile|tsList|setVideoOut/.test(x.import.name));
const thunks=new Map(imports.map(x=>[x.rva,x]));const directCalls=[];
for(let o=text.raw;o+5<text.raw+text.rawSize;o++)if(mainBytes[o]===0xe8){const rva=text.rva+o-text.raw,target=rva+5+mainBytes.readInt32LE(o+1),thunk=thunks.get(target);if(thunk){const f=main.functions.find(f=>f.begin<=rva&&rva<f.end);directCalls.push({rva,target,symbol:thunk.import.name,function:f});if(f)add(main.name,f.begin,'caller_of_'+thunk.import.name);}}
fs.writeFileSync(new URL('media_direct_calls.json',root),JSON.stringify(directCalls,null,2)+'\n');
const spec={requested,exportNames:lib.exports.filter(e=>/playFile@MediaPlayer|tsList@MediaPlayer|play@EVPlayer|setVideoOut@MediaPlayer/.test(e.name)),symbols:lib.exports,functions:lib.functions};
const events=[],session=await frida.attach(targetPid);let script;
const source=String.raw`
const spec=SPEC;
const events=[],installed=[],calls={};
function emit(x){send(Object.assign({time:new Date().toISOString()},x));}
function locate(address){const m=Process.findModuleByAddress(address);return m?{module:m.name,rva:address.sub(m.base).toString(),address:address.toString()}:{address:address.toString()};}
function bytes(p,n){return Array.from(new Uint8Array(p.readByteArray(n)),x=>x.toString(16).padStart(2,'0')).join('');}
function stdLength(p){try{return p.add(16).readU64().toNumber();}catch(_){return null;}}
function stdString(p){const n=stdLength(p);if(n===null||n<0||n>4096)return null;const capacity=p.add(24).readU64().toNumber();return (capacity<16?p:p.readPointer()).readUtf8String(n);}
function qString(p){try{const d=p.readPointer();if(d.isNull())return '';const n=d.add(4).readS32(),offset=d.add(16).readS64().toNumber();if(n<0||n>4096||offset<0||offset>1024)return null;return d.add(offset).readUtf16String(n);}catch(_){return null;}}
function sourceSummary(s){if(s===null)return {kind:'unreadable'};const url=s.match(/^(https?):\/\/([^/?#]+)([^?#]*)/i);if(url)return {kind:'url',scheme:url[1],host:url[2].replace(/^.*@/,''),path:url[3],queryPresent:s.includes('?'),length:s.length};if(/#EXTM3U/.test(s))return {kind:'manifest_text',length:s.length};if(/^[a-zA-Z]:[\\/]|^\\\\/.test(s))return {kind:'local_path',path:s,length:s.length};return {kind:'opaque_descriptor',length:s.length};}
function instructionDump(moduleName,begin,end,limit){const m=Process.getModuleByName(moduleName),base=m.base,stop=base.add(end),items=[];let p=base.add(begin);for(let i=0;i<limit&&p.compare(stop)<0;i++){try{const ins=Instruction.parse(p);items.push({rva:p.sub(base).toString(),text:ins.toString(),bytes:bytes(p,ins.size)});p=ins.next;}catch(error){items.push({rva:p.sub(base).toString(),error:String(error)});break;}}return {module:moduleName,begin:'0x'+begin.toString(16),end:'0x'+end.toString(16),truncated:p.compare(stop)<0,instructions:items};}
function openFiles(){
 const kernel=Process.getModuleByName('kernel32.dll'),ntdll=Process.getModuleByName('ntdll.dll');
 const query=new NativeFunction(ntdll.getExportByName('NtQueryInformationProcess'),'int',['pointer','uint','pointer','uint','pointer']);
 const fileType=new NativeFunction(kernel.getExportByName('GetFileType'),'uint',['pointer']);
 const finalPath=new NativeFunction(kernel.getExportByName('GetFinalPathNameByHandleW'),'uint',['pointer','pointer','uint','uint']);
 const buffer=Memory.alloc(1024*1024),needed=Memory.alloc(4),status=query(ptr(-1),51,buffer,1024*1024,needed);
 if(status<0)return {status,files:[]};const count=buffer.readU64().toNumber(),files=[],out=Memory.alloc(8192);
 if(count>20000)return {status,error:'unexpected handle count',count,files};
 for(let i=0;i<count;i++){const handle=buffer.add(16+i*40).readPointer();if(fileType(handle)!==1)continue;const n=finalPath(handle,out,4096,0);if(n>0&&n<4096)files.push({handle:handle.toString(),path:out.readUtf16String(n)});}
 return {status,handleCount:count,files};
}
rpc.exports={
 inspect(){
   const disassembly=spec.requested.map(f=>({...instructionDump(f.module,f.begin,f.end,4000),label:f.label}));
   return {pid:Process.id,modules:Process.enumerateModules().filter(m=>/EVPlayer|PlayerLib|Bridge|MetaLib|Qt5Network|Qt5Core|Qt5Multimedia|avformat|avcodec|libcurl/i.test(m.name)).map(m=>({name:m.name,base:m.base.toString(),size:m.size,path:m.path})),openFiles:openFiles(),disassembly};
 },
 install(){const m=Process.getModuleByName('PlayerLibRender56_vs.dll');for(const e of spec.exportNames){const address=m.base.add(e.rva),original=bytes(address,16);try{Interceptor.attach(address,{onEnter(a){this.symbol=e.name;this.caller=locate(this.returnAddress);calls[e.name]=(calls[e.name]||0)+1;if(calls[e.name]>20)return;let detail={};if(e.name.includes('playFile@MediaPlayer'))detail.source=sourceSummary(qString(a[1]));else if(e.name.includes('play@EVPlayer'))detail.source=sourceSummary(stdString(a[1]));else if(e.name.includes('tsList@MediaPlayer'))detail={firstInputLength:stdLength(a[1]),secondInputNotRead:true};emit({kind:'media_call',symbol:e.name,caller:this.caller,...detail});},onLeave(r){if((calls[e.name]||0)>20)return;emit({kind:'media_return',symbol:e.name,result:e.name.includes('playFile@MediaPlayer')||e.name.includes('play@EVPlayer')?r.toInt32():null});}});installed.push({symbol:e.name,address:address.toString(),original});}catch(error){emit({kind:'hook_error',symbol:e.name,error:String(error)});}}return installed;},
 summary(){return {calls,installed};},
 shutdown(){Interceptor.detachAll();Interceptor.flush();return new Promise(resolve=>setTimeout(()=>resolve(installed.map(x=>({...x,current:bytes(ptr(x.address),16),restored:bytes(ptr(x.address),16)===x.original}))),50));}
};
`.replace('SPEC',JSON.stringify(spec));
try{
 script=await session.createScript(source,{name:'evplayer2-media-metadata'});
 script.message.connect(m=>{if(m.type==='send')events.push(m.payload);else events.push({kind:'agent_error',message:m});});
 await script.load();const inspection=await script.exports.inspect();fs.writeFileSync(new URL('runtime_inspection.json',root),JSON.stringify(inspection,null,2)+'\n');
 const installed=await script.exports.install();await new Promise(resolve=>setTimeout(resolve,duration*1000));
 const summary=await script.exports.summary(),audit=await script.exports.shutdown();
 fs.writeFileSync(new URL('media_probe.json',root),JSON.stringify({pid:targetPid,seconds:duration,installed,summary,audit,events},null,2)+'\n');
 console.log(JSON.stringify({pid:targetPid,seconds:duration,openFiles:inspection.openFiles,modules:inspection.modules.map(m=>m.name),functions:inspection.disassembly.length,directCalls,installed:installed.length,summary,auditRestored:audit.every(x=>x.restored),events}));
 if(audit.some(x=>!x.restored)||events.some(e=>e.kind==='agent_error'||e.kind==='hook_error'))process.exitCode=1;
}finally{if(script)await script.unload();await session.detach();}