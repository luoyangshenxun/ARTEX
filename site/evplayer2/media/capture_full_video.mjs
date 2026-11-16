import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as frida from '../hooks/node_modules/frida/build/src/frida.js';

const media=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(media), out=path.join(media,'full_video');
const initial=JSON.parse(fs.readFileSync(path.join(out,'initial_state.json')));
const inventory=JSON.parse(fs.readFileSync(path.join(media,'PlayerLibRender56_vs.dll.inventory.json')));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(sha(fs.readFileSync(inventory.file))!==inventory.sha256)throw new Error('Render DLL hash mismatch');
const pid=56664, object=initial.object;
const run=path.join(out,'capture_'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(run,{recursive:true});
fs.writeFileSync(path.join(out,'active_run.json'),JSON.stringify({run,pid,object},null,2)+'\n');
const getters=inventory.exports.filter(e=>/^\?(currentTime|duration|isPaused|isStoped)@MediaPlayer/.test(e.name));
const session=await frida.attach(pid);
const agent=String.raw`
const config=CONFIG,m=Process.getModuleByName('PlayerLibRender56_vs.dll'),self=ptr(config.object);
const installed=[],calls={},active={},sourceFiles=new Set();let enabled=false,epoch=0,sentBytes=0,sequence=0,tooLarge=false;
const errors=[];
function bytes(p){return Array.from(new Uint8Array(p.readByteArray(16)),b=>b.toString(16).padStart(2,'0')).join('');}
function source(){const d=self.add(0x28).readPointer(),n=d.add(4).readS32();if(n<0||n>200000)throw new Error('Invalid source length');return d.add(d.add(16).readS64().toNumber()).readUtf16String(n);}
const boundSource=source();
function getSpeed(){const ev=self.add(0x20).readPointer(),engine=ev.add(0x10).readPointer(),controller=engine.add(0x101be8).readPointer().add(0x60).readPointer();return controller.add(0x100).readFloat();}
function state(){const values={};for(const e of config.getters){const type=/currentTime|duration/.test(e.name)?'int64':'bool';values[e.name]=new NativeFunction(m.base.add(e.rva),type,['pointer'])(self).toString();}return {time:new Date().toISOString(),values,currentMs:Number(values['?currentTime@MediaPlayer@@QEBA_JXZ']),durationMs:Number(values['?duration@MediaPlayer@@QEBA_JXZ']),paused:values['?isPaused@MediaPlayer@@QEAA_NXZ']==='1',stopped:values['?isStoped@MediaPlayer@@QEAA_NXZ']==='1',speed:getSpeed(),sameSource:source()===boundSource,sentBytes,sequence,sourceFiles:[...sourceFiles],errors,tooLarge};}
const pause=new NativeFunction(m.base.add(0x47c00),'void',['pointer']);
const resume=new NativeFunction(m.base.add(0x48000),'void',['pointer']);
const seek=new NativeFunction(m.base.add(0x480b0),'void',['pointer','double']);
const speed=new NativeFunction(m.base.add(0x48380),'void',['pointer','double']);
const saved=state();
function captureError(error){const message=String(error);if(errors.length<20){errors.push(message);send({kind:'capture_error',message});}}
rpc.exports={state,prepare(){pause(self);return {saved,current:state(),sourceBase:boundSource.replace(/[?#].*/,''),sourceLength:boundSource.length,maxPublicSpeed:m.base.add(0x802b48).readDouble()};},
 install(){
  const address=m.base.add(0x388a0),original=bytes(address);
  Interceptor.attach(address,{onEnter(a){this.output=a[3];this.capacity=a[4].toUInt32();this.thread=this.threadId;this.epoch=epoch;this.object=a[0].toString();this.paths=[];this.prior=active[this.thread];active[this.thread]=this;},onLeave(r){active[this.thread]=this.prior;const n=r.toInt32();if(!enabled||this.epoch!==epoch||n<=0)return;if(n>this.capacity||n>1048576){captureError('Invalid returned size '+n);return;}if(sentBytes+n>1024*1024*1024){tooLarge=true;enabled=false;return;}try{sentBytes+=n;sequence++;calls[this.object]=(calls[this.object]||0)+1;send({kind:'clear_chunk',sequence,epoch,object:this.object,bytes:n,sourcePaths:this.paths},this.output.readByteArray(n));}catch(error){captureError(error);}}});
  installed.push({symbol:'clear_read',rva:'0x388a0',address:address.toString(),original});
  const k=Process.getModuleByName('kernel32.dll'),read=k.getExportByName('ReadFile'),readOriginal=bytes(read),getPath=new NativeFunction(k.getExportByName('GetFinalPathNameByHandleW'),'uint',['pointer','pointer','uint','uint']);
  Interceptor.attach(read,{onEnter(a){const io=active[this.threadId];if(!io||!enabled)return;try{const b=Memory.alloc(8192),n=getPath(a[0],b,4096,0);if(n>0&&n<4096){const p=b.readUtf16String(n);if(/EVPlayer2_download/i.test(p)){if(!io.paths.includes(p))io.paths.push(p);sourceFiles.add(p);}}}catch(error){captureError(error);}}});
  installed.push({symbol:'ReadFile',address:read.toString(),original:readOriginal});return installed;
 },begin(){const max=m.base.add(0x802b48).readDouble();speed(self,Math.min(3,max));seek(self,0);return state();},arm(){epoch++;enabled=true;return state();},resume(){resume(self);return state();},disable(){enabled=false;return state();},
 restore(){enabled=false;pause(self);speed(self,saved.speed);seek(self,saved.currentMs/saved.durationMs);if(!saved.paused&&!saved.stopped)resume(self);return {saved,restored:state()};},
 shutdown(){enabled=false;Interceptor.detachAll();Interceptor.flush();return new Promise(resolve=>setTimeout(()=>resolve(installed.map(x=>({...x,current:bytes(ptr(x.address)),restored:bytes(ptr(x.address))===x.original}))),100));}
};
`.replace('CONFIG',JSON.stringify({object,getters}));
let script,rawFd,indexFd,rawBytes=0,chunks=0,lastSequence=0,hostError=null,closed=false;
const raw=path.join(run,'full_clear.ts'),index=path.join(run,'chunks.jsonl');
const progress=[],events=[],started=Date.now();let prepared,installed,begin,armed,resumed,final,restore,audit,complete=false,reason='pending';
const writeProgress=s=>{const p={wallSeconds:Math.round((Date.now()-started)/1000),receivedBytes:rawBytes,chunks,...s};progress.push(p);fs.writeFileSync(path.join(run,'progress.json'),JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));};
try{
 rawFd=fs.openSync(raw,'wx');indexFd=fs.openSync(index,'wx');
 script=await session.createScript(agent,{name:'evplayer2-full-course-capture'});
 script.message.connect((message,data)=>{
  try{if(message.type!=='send'){events.push({kind:'agent_error',message});hostError??=JSON.stringify(message);return;}
   const e=message.payload;if(!data){events.push(e);if(e.kind==='capture_error')hostError??=e.message;return;}
   if(closed)throw new Error('Data received after host files closed');
   if(e.sequence!==lastSequence+1)throw new Error('Chunk sequence discontinuity '+lastSequence+' -> '+e.sequence);
   if(data.length!==e.bytes)throw new Error('Chunk length mismatch');
   const offset=rawBytes;fs.writeSync(rawFd,data);rawBytes+=data.length;chunks++;lastSequence=e.sequence;
   fs.writeSync(indexFd,JSON.stringify({...e,offset})+'\n');
  }catch(error){hostError??=String(error);events.push({kind:'host_error',error:String(error)});}
 });
 await script.load();prepared=await script.exports.prepare();
 if(prepared.saved.durationMs!==1833100)throw new Error('Loaded video duration changed before capture');
 installed=await script.exports.install();begin=await script.exports.begin();
 await new Promise(r=>setTimeout(r,1500));armed=await script.exports.arm();resumed=await script.exports.resume();writeProgress({phase:'capturing',state:resumed,sourceBase:prepared.sourceBase});
 let lastBytes=0,idleCount=0;
 while(Date.now()-started<1000*1400){
  await new Promise(r=>setTimeout(r,10000));const state=await script.exports.state();
  writeProgress({phase:'capturing',state});
  if(hostError||state.errors.length||state.tooLarge){reason='capture_error';break;}
  if(!state.sameSource||state.durationMs!==prepared.saved.durationMs){reason='video_changed';break;}
  if(rawBytes===lastBytes)idleCount++;else idleCount=0;lastBytes=rawBytes;
  if((state.stopped||state.currentMs>=state.durationMs-300)&&rawBytes>1000000){complete=true;reason='player_reached_end';break;}
  if(idleCount>=12){reason='no_new_data_for_120_seconds';break;}
 }
 if(reason==='pending')reason='capture_time_limit';
 final=await script.exports.disable();await new Promise(r=>setTimeout(r,1000));
 restore=await script.exports.restore();audit=await script.exports.shutdown();
}catch(error){reason='execution_error';events.push({kind:'execution_error',message:String(error),stack:error.stack});hostError??=String(error);}
finally{
 if(script){if(!restore)try{restore=await script.exports.restore();}catch(error){events.push({kind:'restore_error',message:String(error)});}if(!audit)try{audit=await script.exports.shutdown();}catch(error){events.push({kind:'shutdown_error',message:String(error)});}await script.unload();}
 await session.detach();closed=true;if(rawFd!==undefined)fs.closeSync(rawFd);if(indexFd!==undefined)fs.closeSync(indexFd);
}
const result={time:new Date().toISOString(),pid,object,run,raw,index,rawBytes,chunks,complete,reason,hostError,prepared,installed,begin,armed,resumed,final,restore,audit,events,progress,sha256:sha(fs.readFileSync(raw))};
fs.writeFileSync(path.join(run,'capture_result.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(out,'latest_capture.json'),JSON.stringify({run,result:path.join(run,'capture_result.json'),complete,reason,raw,rawBytes,chunks},null,2)+'\n');
writeProgress({phase:'finished',complete,reason,auditRestored:audit?.every(x=>x.restored),restore});
if(!complete||hostError||!audit?.every(x=>x.restored))process.exitCode=1;
