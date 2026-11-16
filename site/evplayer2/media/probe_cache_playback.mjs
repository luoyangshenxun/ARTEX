import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'cache_playback');
const cache='D:/EVPlayer2_download';
fs.mkdirSync(output,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=fs.readdirSync(cache).map(name=>({name,...fs.statSync(path.join(cache,name))}));
const summary={};for(const f of files){const ext=path.extname(f.name);const x=summary[ext]??={count:0,bytes:0};x.count++;x.bytes+=f.size;}
const selected=['143710-acea0910-8006-480d-92a0-0dbb7d20a8ed.ts','143710-1f0c9000-208a-460b-b230-d3938bcfe80a.ts'];
const samples=[];
for(const name of selected){const source=path.join(cache,name),copy=path.join(output,name),bytes=fs.readFileSync(source);if(fs.existsSync(copy)){if(sha(fs.readFileSync(copy))!==sha(bytes))throw new Error('Different existing sample: '+copy);}else fs.writeFileSync(copy,bytes,{flag:'wx'});const prefix=bytes.subarray(0,65536),hist=Array(256).fill(0);for(const b of prefix)hist[b]++;const entropy=-hist.reduce((n,c)=>c?n+(c/prefix.length)*Math.log2(c/prefix.length):n,0);samples.push({source,copy,bytes:bytes.length,sha256:sha(bytes),copySha256:sha(fs.readFileSync(copy)),prefixBytes:prefix.length,prefixEntropyBitsPerByte:entropy,headerHex:prefix.subarray(0,32).toString('hex'),bytesMod16:bytes.length%16,sourceUnchanged:sha(fs.readFileSync(source))===sha(bytes)});}
const tools={ffprobe:'F:/ffmpeg-master-latest-win64-gpl-shared/bin/ffprobe.exe',ffmpeg:'F:/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe'};
const records=[];
for(let i=0;i<samples.length;i++){
 const input=samples[i].copy;
 const commands=[{label:'ffprobe_'+i,executable:tools.ffprobe,args:['-v','error','-show_error','-show_format','-show_streams','-of','json',input]},{label:'decode_one_frame_'+i,executable:tools.ffmpeg,args:['-hide_banner','-v','error','-nostdin','-i',input,'-map','0:v:0','-frames:v','1','-f','null','NUL']}];
 for(const command of commands){const result=spawnSync(command.executable,command.args,{encoding:'utf8',timeout:30000,windowsHide:true});const record={...command,input,stdout:result.stdout??'',stderr:result.stderr??'',exitStatus:result.status,signal:result.signal,error:result.error?String(result.error):null};records.push(record);for(const key of ['stdout','stderr'])fs.writeFileSync(path.join(output,command.label+'.'+key+'.txt'),record[key]);console.log(JSON.stringify(record));}
}
const result={time:new Date().toISOString(),cache,summary,totalFiles:files.length,totalBytes:files.reduce((n,f)=>n+f.size,0),samples,records};fs.writeFileSync(path.join(output,'cache_probe.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cache,summary,samples,totalBytes:result.totalBytes,probeExitStatuses:records.map(x=>({label:x.label,exitStatus:x.exitStatus}))}));