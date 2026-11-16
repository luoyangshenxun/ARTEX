import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const root=path.dirname(fileURLToPath(import.meta.url)),media=path.dirname(root),project=path.dirname(media),output=path.join(media,'account_mp4'),work=path.join(root,'work');
const args=process.argv.slice(2),arg=(n,d)=>{const i=args.indexOf(n);return i<0?d:args[i+1];},limit=Number(arg('--limit','10000'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'account_manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),safe=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,135);
const saveJson=(p,o)=>{const temp=p+'.writing';fs.writeFileSync(temp,JSON.stringify(o,null,2)+'\n');fs.renameSync(temp,p);};
for(const name of ['EVPlayer2.exe','PlayerLibRender56_vs.dll']){const inv=JSON.parse(fs.readFileSync(path.join(media,name+'.inventory.json'),'utf8'));if(sha(fs.readFileSync(inv.file))!==inv.sha256)throw Error('Binary hash changed: '+name);}
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(work,{recursive:true});
const progressFile=path.join(root,'batch_progress.json'),old=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile,'utf8')):null;
const entries=manifest.courses.flatMap((course,ci)=>course.items.filter(item=>/\.(mp4|mkv|avi|mov|wmv|flv|evs|ev[4568])$/i.test(item.title)).map((item,vi)=>({id:`${String(ci+1).padStart(2,'0')}_${String(vi+1).padStart(3,'0')}`,course:course.title,title:item.title,detailObject:course.detailObject,model:course.model,itemPath:item.path,output:path.join(output,safe(course.title),safe(item.title.replace(/\.[^.]+$/,''))+'.mp4'),status:'pending'})));
if(old?.status==='running'&&old.runnerPid!==process.pid){let live=false;try{process.kill(old.runnerPid,0);live=true;}catch{}if(live)throw Error('Another batch runner is already active: '+old.runnerPid);}
if(old&&old.pid!==manifest.pid)throw Error('Player PID changed; re-enumerate before resume');
for(const entry of entries){const prev=old?.entries?.find(e=>e.id===entry.id&&e.title===entry.title&&e.course===entry.course);if(prev)Object.assign(entry,prev);if(entry.status==='complete'){if(!fs.existsSync(entry.output)||fs.statSync(entry.output).size!==entry.bytes||sha(fs.readFileSync(entry.output))!==entry.sha256)throw Error('Completed MP4 changed: '+entry.id);}else entry.status='pending';}
const state={createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),pid:manifest.pid,runnerPid:process.pid,status:'running',outputDirectory:output,total:entries.length,complete:0,failed:0,entries};
function save(extra={}){Object.assign(state,extra);state.updatedAt=new Date().toISOString();state.complete=entries.filter(e=>e.status==='complete').length;state.failed=entries.filter(e=>e.status==='failed').length;saveJson(progressFile,state);}
const logFile=path.join(root,'batch_events.jsonl');function log(event){const e={time:new Date().toISOString(),...event};fs.appendFileSync(logFile,JSON.stringify(e)+'\n');console.log(JSON.stringify(e));}
save();
const exeRoot='F:/ffmpeg-master-latest-win64-gpl-shared/bin';
async function command(exe,argv,timeout=600000){return await new Promise(resolve=>{const start=Date.now(),child=spawn(exe,argv,{windowsHide:true,stdio:['ignore','pipe','pipe']}),out=[],err=[];let timer=setTimeout(()=>child.kill(),timeout);child.stdout.on('data',b=>out.push(b));child.stderr.on('data',b=>err.push(b));child.on('error',e=>{err.push(Buffer.from(String(e)));});child.on('close',(status,signal)=>{clearTimeout(timer);resolve({command:exe,args:argv,stdout:Buffer.concat(out).toString('utf8'),stderr:Buffer.concat(err).toString('utf8'),exitStatus:status,signal,seconds:(Date.now()-start)/1000});});});}
function verifyCommand(r){if(r.exitStatus!==0)throw Error('Command failed '+path.basename(r.command)+' status='+r.exitStatus+' '+r.stderr.slice(0,600));}
async function probe(file,records){const r=await command(path.join(exeRoot,'ffprobe.exe'),['-v','error','-show_entries','format=duration,size:stream=index,codec_name,codec_type,duration,width,height,nb_frames','-of','json',file]);records.push(r);verifyCommand(r);return JSON.parse(r.stdout);}
function cleanSegment(data){const extra=data.length%188;if(extra){if(extra>16||!data.subarray(data.length-extra).every(b=>b===0x23))throw Error('Unexpected decrypted segment padding');data=data.subarray(0,data.length-extra);}for(let i=0;i<data.length;i+=188){if(data[i]!==0x47||(data[i+1]&0x80)||(data[i+3]&0xc0))throw Error('Invalid clear TS packet at '+i);}return {data,padding:extra};}
function continuity(file){const b=fs.readFileSync(file),last=new Map(),issues=[];for(let i=0;i<b.length;i+=188){const pid=((b[i+1]&31)<<8)|b[i+2],afc=(b[i+3]>>4)&3,cc=b[i+3]&15;if(pid===8191||!(afc&1))continue;const disc=(afc&2)&&b[i+4]>0&&(b[i+5]&128);const prev=last.get(pid);if(!disc&&prev!==undefined&&cc!==((prev+1)&15))issues.push({offset:i,pid,expected:(prev+1)&15,actual:cc});last.set(pid,cc);}return {packets:b.length/188,continuityErrors:issues.length,firstIssues:issues.slice(0,12)};}
const session=await frida.attach(manifest.pid);let script,audits,activeChunks=[],handled=0;
try{
const source='const SPEC={hwnd:"0x250514"};\n'+['account.agent.js','media.agent.js','playlist.agent.js','fast_export.agent.js'].map(n=>fs.readFileSync(path.join(root,n),'utf8')).join('\n');
script=await session.createScript(source,{name:'current-account-batch-mp4-export'});
script.message.connect((m,data)=>{if(m.type==='send'&&m.payload.kind==='decrypted_playlist_chunk'&&data)activeChunks.push({meta:m.payload,data:Buffer.from(data)});else if(m.type==='error')log({kind:'agent_error',message:m.description,stack:m.stack});});
await script.load();
for(const entry of entries){if(entry.status==='complete')continue;if(handled>=limit)break;handled++;const dir=path.join(work,entry.id);fs.mkdirSync(dir,{recursive:true});const records=[];let current;
try{
 entry.status='opening';entry.startedAt=new Date().toISOString();save({current:entry.id});activeChunks=[];await script.exports.mediaReset();await script.exports.playlistReset();
 log({kind:'video_start',id:entry.id,title:entry.title,course:entry.course,complete:state.complete,total:state.total});
 await script.exports.invokeIndex(entry.detailObject,entry.model,entry.itemPath,'on_treeView_doubleClicked');
 for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,500));current=await script.exports.mediaState();if(current.events?.some(e=>e.kind==='playFile')&&current.durationMs>0&&current.io.length&&activeChunks.length)break;}
 if(!current?.durationMs||!current.io?.length||!activeChunks.length)throw Error('Authorized playback/list initialization did not complete');
 await script.exports.mediaPause();for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,100));current=await script.exports.mediaState();if(current.paused)break;}
 if(!current.paused)throw Error('Player did not pause for export');
 const io=current.io.at(-1).io;await script.exports.fastBind(io,current.object);const order=await script.exports.fastOrder(io);
 const raw=Buffer.concat(activeChunks.map(c=>c.data)),text=raw.toString('utf8');const names=[],safeLines=[];for(const line0 of text.split(/\r?\n/)){const line=line0.trim();if(/^#EXT(M3U|INF|-X-(VERSION|TARGETDURATION|MEDIA-SEQUENCE|ENDLIST|DISCONTINUITY|PLAYLIST-TYPE|INDEPENDENT-SEGMENTS))/.test(line))safeLines.push(line);else if(!line.startsWith('#')){const file=line.match(/[A-Za-z0-9_-]+\.ts(?:[?#].*)?$/)?.[0]?.replace(/[?#].*/,'');if(file){names.push(file);safeLines.push(file);}}}
 if(!text.startsWith('#EXTM3U')||!text.includes('#EXT-X-ENDLIST')||names.length!==order.rows.length||order.rows.some((r,i)=>names[i]!==r.file))throw Error('Decrypted playlist/order validation failed');
 const orderRecord={method:'Decrypted native EVS M3U8 compared with independent TsCtx sequence indices',durationMs:current.durationMs,count:names.length,sourceBase:current.sourceBase,plaintextBytes:raw.length,plaintextSha256:sha(raw),ordered:order.rows.map(r=>({index:r.index,file:r.file}))};
 saveJson(path.join(dir,'segment_order.json'),orderRecord);fs.writeFileSync(path.join(dir,'playlist.m3u8'),safeLines.join('\n')+'\n');entry.durationMs=current.durationMs;entry.segments=names.length;entry.status='downloading';entry.segmentsComplete=0;save();
 const segmentRecords=new Array(names.length);let next=0;
 async function worker(){while(next<order.rows.length){const index=next++,row=order.rows[index],local=path.join('D:/EVPlayer2_download',row.file),encrypted=path.join(dir,String(index).padStart(5,'0')+'.encrypted.ts'),clear=path.join(dir,String(index).padStart(5,'0')+'.ts');let data,from='';
 if(fs.existsSync(clear)){const b=fs.readFileSync(clear);cleanSegment(b);segmentRecords[index]={index,file:row.file,clearBytes:b.length,clearSha256:sha(b),resumed:true};entry.segmentsComplete++;continue;}
 for(let attempt=0;attempt<3;attempt++){
 try{if(attempt===0&&fs.existsSync(local)){data=fs.readFileSync(local);from='existing_player_cache';}else if(attempt===0&&fs.existsSync(encrypted)){data=fs.readFileSync(encrypted);from='batch_cache';}else{let info;for(let wait=0;wait<240;wait++){info=await script.exports.segmentUrl(io,index);if(info.url&&new URL(info.url).searchParams.has('auth_key'))break;await new Promise(r=>setTimeout(r,250));}if(!info.url||!new URL(info.url).searchParams.has('auth_key'))throw Error('Authorized segment URL not ready');const response=await fetch(info.url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Download HTTP '+response.status);data=Buffer.from(await response.arrayBuffer());from='download';fs.writeFileSync(encrypted,data);}
 if(data.length<16||data.length%16)throw Error('Invalid ciphertext length '+data.length);
 const decrypted=Buffer.from(await script.exports.decryptSegment(io,index,data)),cleaned=cleanSegment(decrypted);fs.writeFileSync(clear,cleaned.data);segmentRecords[index]={index,file:row.file,source:from,cipherBytes:data.length,cipherSha256:sha(data),clearBytes:cleaned.data.length,clearSha256:sha(cleaned.data),paddingBytes:cleaned.padding};entry.segmentsComplete++;if(entry.segmentsComplete%10===0)save();break;
 }catch(e){if(attempt===2)throw Error('Segment '+index+': '+String(e));await new Promise(r=>setTimeout(r,500*(attempt+1)));}
 }
 }}
 const workers=await Promise.allSettled(Array.from({length:4},worker));const failed=workers.find(r=>r.status==='rejected');if(failed)throw failed.reason;if(segmentRecords.some(r=>!r))throw Error('Missing decrypted segments');
 saveJson(path.join(dir,'segments.json'),segmentRecords);entry.status='remuxing';save();
 const ts=path.join(dir,'complete.ts'),fd=fs.openSync(ts,'w');try{for(let i=0;i<names.length;i++)fs.writeSync(fd,fs.readFileSync(path.join(dir,String(i).padStart(5,'0')+'.ts')));}finally{fs.closeSync(fd);}
 const stats=continuity(ts);saveJson(path.join(dir,'ts_validation.json'),stats);if(stats.continuityErrors)throw Error('TS continuity errors: '+stats.continuityErrors);
 fs.mkdirSync(path.dirname(entry.output),{recursive:true});const part=entry.output.replace(/\.mp4$/,'.part.mp4');const remux=await command(path.join(exeRoot,'ffmpeg.exe'),['-hide_banner','-v','error','-nostdin','-y','-i',ts,'-map','0:v:0','-map','0:a:0?','-c','copy','-bsf:a','aac_adtstoasc','-avoid_negative_ts','make_zero','-movflags','+faststart',part]);records.push(remux);verifyCommand(remux);
 const metadata=await probe(part,records),video=metadata.streams.find(s=>s.codec_type==='video'),videoDuration=Number(video?.duration||metadata.format.duration);if(!video||Math.abs(videoDuration-current.durationMs/1000)>2)throw Error('MP4 duration mismatch: '+videoDuration+' expected '+current.durationMs/1000);
 for(const offset of [0,Math.max(0,videoDuration-2)]){const decoded=await command(path.join(exeRoot,'ffmpeg.exe'),['-hide_banner','-v','error','-xerror','-nostdin','-ss',String(offset),'-i',part,'-t','2','-map','0:v:0','-map','0:a:0?','-f','null','NUL'],120000);records.push(decoded);verifyCommand(decoded);}
 fs.renameSync(part,entry.output);entry.status='complete';entry.finishedAt=new Date().toISOString();entry.bytes=fs.statSync(entry.output).size;entry.sha256=sha(fs.readFileSync(entry.output));entry.videoDuration=videoDuration;entry.codecs=metadata.streams.map(s=>s.codec_name);delete entry.error;saveJson(path.join(dir,'verification.json'),{id:entry.id,title:entry.title,output:entry.output,bytes:entry.bytes,sha256:entry.sha256,expectedDurationMs:current.durationMs,metadata,ts:stats,commands:records,verificationScope:'All segments decrypted and packet/continuity validated; MP4 duration/streams probed; first and last two seconds decoded'});save();log({kind:'video_complete',id:entry.id,title:entry.title,bytes:entry.bytes,duration:videoDuration,complete:state.complete,total:state.total});
}catch(error){entry.status='failed';entry.error=String(error);entry.finishedAt=new Date().toISOString();saveJson(path.join(dir,'failure.json'),{id:entry.id,error:String(error),stack:error.stack,current,commands:records});save();log({kind:'video_failed',id:entry.id,title:entry.title,error:String(error),failed:state.failed});}
}
audits={media:await script.exports.mediaShutdown(),playlist:await script.exports.playlistShutdown(),ui:await script.exports.shutdown()};const restored=audits.media.every(x=>x.restored)&&audits.playlist.restored&&audits.ui.restored;save({status:state.complete===state.total?'complete':handled>=limit?'limit_reached':state.failed?'finished_with_failures':'incomplete',audits,auditRestored:restored,current:null});log({kind:'batch_finished',status:state.status,complete:state.complete,failed:state.failed,total:state.total,auditRestored:restored});if(!restored||state.failed)process.exitCode=1;
}finally{if(script){if(!audits){const result={};for(const name of ['mediaShutdown','playlistShutdown','shutdown'])try{result[name]=await script.exports[name]();}catch(e){result[name]={error:String(e)};}save({status:'interrupted',cleanup:result});}await script.unload();}await session.detach();}

