import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const out=path.join(path.dirname(fileURLToPath(import.meta.url)),'full_video');
const full=JSON.parse(fs.readFileSync(path.join(out,'latest_capture.json')));
const head=JSON.parse(fs.readFileSync(path.join(out,'latest_head_capture.json')));
const fullCapture=JSON.parse(fs.readFileSync(full.result)),headCapture=JSON.parse(fs.readFileSync(head.result));
if(!fullCapture.complete||!headCapture.complete)throw new Error('Both captures must finish before assembly');
const body=fs.readFileSync(full.raw),prefix=fs.readFileSync(head.raw);
const fingerprint=body.subarray(0,65536),match=prefix.indexOf(fingerprint);
if(match<0)throw new Error('Supplement has no exact 64KiB overlap with full capture');
const secondMatch=prefix.indexOf(fingerprint,match+1);if(secondMatch>=0)throw new Error('Overlap is ambiguous');
let sync=-1;
for(let i=0;i<188;i++){let hits=0;for(let j=0;j<30&&i+188*j<prefix.length;j++)if(prefix[i+188*j]===0x47)hits++;if(hits>=25){sync=i;break;}}
if(sync<0)throw new Error('Head has no TS synchronization');
const pts=[],pat=[],resyncs=[];
for(let i=sync;i+188<=prefix.length;i+=188){if(prefix[i]!==0x47){const lost=i;let next=-1;for(let j=i+1;j+188*8<prefix.length;j++){let ok=true;for(let k=0;k<8;k++)if(prefix[j+188*k]!==0x47){ok=false;break;}if(ok){next=j;break;}}if(next<0)break;resyncs.push({from:lost,to:next});i=next;}const b=prefix.subarray(i,i+188);const pid=((b[1]&31)<<8)|b[2];if(pid===0)pat.push(i);if(!(b[1]&64))continue;const af=(b[3]>>4)&3;if(af===0||af===2)continue;let p=4;if(af===3)p+=b[4]+1;if(p+14>188||b[p]!==0||b[p+1]!==0||b[p+2]!==1||!(b[p+7]&128))continue;const a=b.subarray(p+9,p+14),value=(a[0]&14)*536870912+a[1]*4194304+(a[2]&254)*16384+a[3]*128+(a[4]>>1);pts.push({offset:i,pid,seconds:value/90000});}
const firstLow=pts.find(p=>p.seconds<2&&p.offset<match);if(!firstLow)throw new Error('No near-zero timestamp before overlap');
let start=sync;
if(pts[0].seconds>2||resyncs.some(x=>x.to<=firstLow.offset)){const segmentStart=resyncs.filter(x=>x.to<=firstLow.offset).at(-1)?.to??sync;const lastPat=pat.filter(offset=>offset>=segmentStart&&offset<=firstLow.offset).at(-1);start=lastPat??segmentStart;}
if(start>match)throw new Error('Invalid prefix trim');
const overlapBytes=Math.min(prefix.length-match,body.length);
let confirmedOverlap=0;while(confirmedOverlap<overlapBytes&&prefix[match+confirmedOverlap]===body[confirmedOverlap])confirmedOverlap++;
if(confirmedOverlap<65536)throw new Error('Overlap check unexpectedly failed');
const output=path.join(full.run,'full_clear_complete.ts');
if(fs.existsSync(output))throw new Error('Assembly output already exists');
const fd=fs.openSync(output,'wx');try{fs.writeSync(fd,prefix.subarray(start,match));fs.writeSync(fd,body);}finally{fs.closeSync(fd);}
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result={time:new Date().toISOString(),output,bytes:fs.statSync(output).size,sha256:hash(output),fullRaw:full.raw,headRaw:head.raw,headStartOffset:start,headMatchedOffset:match,prefixBytes:match-start,exactOverlapBytes:confirmedOverlap,firstPts:pts.slice(0,5),nearZeroPts:firstLow,resyncs,headCaptureResult:head.result,fullCaptureResult:full.result,rawCaptureUnchanged:hash(full.raw)===fullCapture.sha256};
fs.writeFileSync(path.join(full.run,'assembly_result.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(out,'latest_assembly.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
