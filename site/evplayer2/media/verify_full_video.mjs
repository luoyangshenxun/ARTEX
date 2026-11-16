import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const media=path.dirname(fileURLToPath(import.meta.url)),out=path.join(media,'full_video');
const current=JSON.parse(fs.readFileSync(path.join(out,'latest_capture.json')));
const capture=JSON.parse(fs.readFileSync(current.result));
if(!capture.complete||capture.hostError||capture.audit.some(x=>!x.restored))throw new Error('Capture is incomplete or restoration audit failed');
const order=JSON.parse(fs.readFileSync(path.join(out,'segment_order.json')));
const assembly=JSON.parse(fs.readFileSync(path.join(out,'latest_assembly.json')));
const cleaned=JSON.parse(fs.readFileSync(path.join(out,'clean_ts_result.json')));
const run=capture.run,raw=cleaned.output,records=[];
const ffprobe='F:/ffmpeg-master-latest-win64-gpl-shared/bin/ffprobe.exe';
const ffmpeg='F:/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe';
const ffplay='F:/ffmpeg-master-latest-win64-gpl-shared/bin/ffplay.exe';
function execute(label,executable,args,{timeout=120000,windowsHide=true}={}){
 const r=spawnSync(executable,args,{encoding:'utf8',timeout,windowsHide,maxBuffer:64*1024*1024});
 const record={label,executable,args,stdout:r.stdout??'',stderr:r.stderr??'',exitStatus:r.status,signal:r.signal,error:r.error?String(r.error):null};
 records.push(record);for(const key of ['stdout','stderr'])fs.writeFileSync(path.join(run,label+'.'+key+'.txt'),record[key]);
 fs.writeFileSync(path.join(run,'verification_commands.json'),JSON.stringify(records,null,2)+'\n');
 console.log(JSON.stringify({label,exitStatus:r.status,error:record.error,stdoutBytes:Buffer.byteLength(record.stdout),stderrBytes:Buffer.byteLength(record.stderr)}));
 return record;
}
function requireZero(record){if(record.exitStatus!==0)throw new Error(record.label+' failed; see '+path.join(run,record.label+'.stderr.txt'));return record;}
const chunks=fs.readFileSync(capture.index,'utf8').trim().split('\n').map(s=>JSON.parse(s));
let offset=0,sequence=0;const perFile=new Map();
for(const chunk of chunks){if(chunk.offset!==offset||chunk.sequence!==++sequence)throw new Error('Chunk index discontinuity');offset+=chunk.bytes;for(const filename of chunk.sourcePaths){const name=path.win32.basename(filename),entry=perFile.get(name)??{file:name,firstChunk:chunk.sequence,lastChunk:chunk.sequence,attributedBytes:0,readChunks:0};entry.lastChunk=chunk.sequence;entry.attributedBytes+=chunk.bytes;entry.readChunks++;perFile.set(name,entry);}}
if(offset!==fs.statSync(capture.raw).size)throw new Error('Raw size and index differ');
const observed=[...perFile.keys()],indices=observed.map(name=>order.ordered.find(x=>x.file===name)?.index);
const missing=order.ordered.filter(x=>!perFile.has(x.file));
if(missing.length||indices.some((n,i)=>n!==i))throw new Error('Incomplete or inconsistent segment coverage');
const rawBytes=fs.readFileSync(raw),tsStats={bytes:rawBytes.length,packetSize:188,firstSyncOffset:0,packets:0,syncErrors:0,transportErrors:0,scrambledPackets:0,continuityErrors:0,pids:{}};
let alignment=-1;for(let i=0;i<188;i++){let hits=0;for(let j=0;j<30&&i+188*j<rawBytes.length;j++)if(rawBytes[i+188*j]===0x47)hits++;if(hits>=25){alignment=i;break;}}
if(alignment<0)throw new Error('No TS alignment');tsStats.firstSyncOffset=alignment;
const counters=new Map();
for(let i=alignment;i+188<=rawBytes.length;i+=188){const b=rawBytes.subarray(i,i+188);tsStats.packets++;if(b[0]!==0x47){tsStats.syncErrors++;continue;}const pid=((b[1]&31)<<8)|b[2],af=(b[3]>>4)&3,cc=b[3]&15;tsStats.pids[pid]=(tsStats.pids[pid]??0)+1;if(b[1]&128)tsStats.transportErrors++;if(b[3]&192)tsStats.scrambledPackets++;const discontinuity=(af===2||af===3)&&b[4]>0&&(b[5]&128);if((af===1||af===3)&&pid!==8191){const prev=counters.get(pid);if(prev!==undefined&&!discontinuity&&cc!==((prev+1)&15)&&cc!==prev)tsStats.continuityErrors++;counters.set(pid,cc);}}
const rawInfo=JSON.parse(requireZero(execute('raw_probe',ffprobe,['-v','warning','-show_format','-show_streams','-of','json',raw])).stdout);
const targetMs=capture.prepared.saved.durationMs;
const inputVideo=rawInfo.streams.find(x=>x.codec_type==='video');
if(!inputVideo?.width||!inputVideo?.height)throw new Error('Raw TS video parameters missing');
const output=path.join(run,'full_video.mp4');
requireZero(execute('remux',ffmpeg,['-hide_banner','-v','warning','-nostdin','-n','-fflags','+genpts','-i',raw,'-map','0:v:0','-map','0:a:0?','-c','copy','-bsf:a','aac_adtstoasc','-avoid_negative_ts','make_zero','-movflags','+faststart',output]));
const mp4=JSON.parse(requireZero(execute('mp4_probe',ffprobe,['-v','error','-show_format','-show_streams','-of','json',output])).stdout);
const video=mp4.streams.find(x=>x.codec_type==='video'),audio=mp4.streams.find(x=>x.codec_type==='audio');
const duration=Number(mp4.format.duration),durationDeltaMs=duration*1000-targetMs;
if(Math.abs(durationDeltaMs)>2000)throw new Error('MP4 duration differs from player by '+durationDeltaMs+'ms');
// A complete decode checks every video frame and all audio; errors must fail the command.
const decode=requireZero(execute('full_decode',ffmpeg,['-hide_banner','-v','error','-xerror','-nostdin','-i',output,'-map','0:v:0','-map','0:a:0?','-f','null','NUL'],{timeout:600000}));
const frameFiles=[];
for(const [label,time] of [['start',0],['middle',duration/2],['end',Math.max(0,duration-2)]]){
 const file=path.join(run,'frame_'+label+'.jpg');requireZero(execute('frame_'+label,ffmpeg,['-hide_banner','-v','error','-nostdin','-n','-ss',String(time),'-i',output,'-map','0:v:0','-frames:v','1','-q:v','2','-update','1',file]));frameFiles.push({label,time,file,bytes:fs.statSync(file).size});
}
requireZero(execute('play_start',ffplay,['-hide_banner','-loglevel','warning','-autoexit','-an','-window_title','Recovered full video','-x','960','-y','540','-t','6',output],{timeout:20000,windowsHide:false}));
requireZero(execute('play_end',ffplay,['-hide_banner','-loglevel','warning','-autoexit','-an','-window_title','Recovered full video - ending','-x','960','-y','540','-ss',String(Math.max(0,duration-8)),'-t','6',output],{timeout:20000,windowsHide:false}));
const checksum=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result={time:new Date().toISOString(),complete:true,output,raw,bytes:fs.statSync(output).size,sha256:checksum(output),targetDurationMs:targetMs,durationSeconds:duration,durationDeltaMs,video:{codec:video.codec_name,width:video.width,height:video.height,frames:video.nb_frames,duration:video.duration},audio:audio?{codec:audio.codec_name,sampleRate:audio.sample_rate,channels:audio.channels,duration:audio.duration}:null,order:{count:order.count,observed:observed.length,missing:missing.length,indices,allMatch:true,segments:[...perFile.values()]},tsStats,fullDecode:{exitStatus:decode.exitStatus,stderr:decode.stderr},frames:frameFiles,commands:records.map(x=>({label:x.label,exitStatus:x.exitStatus,error:x.error})),captureResult:current.result};
fs.writeFileSync(path.join(run,'full_verification.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(out,'full_result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,order:{count:order.count,observed:observed.length,missing:missing.length,allMatch:true}}));
