import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const installer = path.resolve(here, '../../installer');
const base = 'https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/';
fs.mkdirSync(here, {recursive:true});
async function curl(args) {
  return await new Promise(resolve => {
    const p=spawn('curl.exe', ['--silent','--show-error','--location','--connect-timeout','20','--max-time','180', ...args], {windowsHide:true});
    let out='', err='';
    p.stdout.on('data', b=>out+=b); p.stderr.on('data', b=>err+=b);
    p.on('error',e=>resolve({exit:-1,stdout:out,stderr:err+e.message}));
    p.on('exit',exit=>resolve({exit,stdout:out,stderr:err}));
  });
}
const channels=['latest-x64-win','latest-arm64-win','latest-arm64-mac','latest-x64-mac','latest','latest-x64','latest-arm64'];
const attempts=await Promise.all(channels.map(async channel=>{
  const file=path.join(here, `${channel}.yml`);
  const result=await curl(['-H','x-app-version: 2.32.0','-D',file+'.headers.txt','-o',file,'-w','%{http_code}',base+channel+'.yml']);
  const body=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
  return {channel,url:base+channel+'.yml',...result,bytes:Buffer.byteLength(body),version:body.match(/^version:\s*(\S+)/m)?.[1]??null};
}));
fs.writeFileSync(path.join(here,'channel-attempts.json'), JSON.stringify({observedAt:new Date().toISOString(),attempts},null,2)+'\n');
console.log(JSON.stringify(attempts,null,2));
const cli=JSON.parse(fs.readFileSync(path.resolve(here,'../cli-manifest-windows-amd64.json')));
const samples=[
  {id:'W1',version:'2.32.1',build:'6001966350991360',platform:'windows-x64',url:'https://storage.googleapis.com/antigravity-public/antigravity-hub/2.32.1-6001966350991360/windows-x64/Antigravity-x64.exe',name:'Antigravity-App-2.32.1-windows-x64.exe'},
  {id:'M1',version:'2.32.1',build:'6001966350991360',platform:'darwin-arm',url:'https://storage.googleapis.com/antigravity-public/antigravity-hub/2.32.1-6001966350991360/darwin-arm/Antigravity.zip',name:'Antigravity-App-2.32.1-darwin-arm.zip'},
  {id:'C1',version:cli.version,build:'4515810895593472',platform:'windows-x64',url:cli.url,name:'Antigravity-CLI-1.5.9-windows-x64.exe',expectedSha512:cli.sha512},
];
await Promise.all(samples.map(async sample=>{
  const file=path.join(installer,sample.name);
  const h=await curl(['--head','-D',path.join(here,sample.id+'.headers.txt'),sample.url]);
  const size=Number(h.stdout.match(/content-length:\s*(\d+)/i)?.[1]);
  if(h.exit!==0 || !size) throw new Error(`${sample.id} HEAD ${JSON.stringify(h)}`);
  const partDir=path.resolve(here,'../tools/v2-parts',sample.id);
  fs.mkdirSync(partDir,{recursive:true});
  const chunks=Array.from({length:Math.ceil(size/(8*1024*1024))},(_,index)=>({
    index,start:index*8*1024*1024,end:Math.min(size-1,(index+1)*8*1024*1024-1),file:path.join(partDir,String(index).padStart(3,'0')),
  }));
  let next=0;
  await Promise.all(Array.from({length:8},async()=>{
    while(true){
      const c=chunks[next++]; if(!c)return;
      const expected=c.end-c.start+1;
      if(fs.existsSync(c.file) && fs.statSync(c.file).size===expected)continue;
      const r=await curl(['--fail','--retry','2','--range',`${c.start}-${c.end}`,'-D',c.file+'.headers','-o',c.file,sample.url]);
      fs.writeFileSync(c.file+'.stderr',r.stderr);
      const headers=fs.existsSync(c.file+'.headers')?fs.readFileSync(c.file+'.headers','utf8'):'';
      if(r.exit || !fs.existsSync(c.file) || fs.statSync(c.file).size!==expected || !headers.toLowerCase().includes(`content-range: bytes ${c.start}-${c.end}/${size}`))throw new Error(`${sample.id} part ${c.index} failed: ${JSON.stringify(r)}`);
      console.log(`${sample.id} part=${c.index} bytes=${expected}`);
    }
  }));
  const fd=fs.openSync(file,'w'), sha256=createHash('sha256'),sha512=createHash('sha512');
  for(const c of chunks){const b=fs.readFileSync(c.file); fs.writeSync(fd,b);sha256.update(b);sha512.update(b);}
  fs.closeSync(fd);
  const actual512=sha512.digest('hex');
  if(sample.expectedSha512 && actual512!==sample.expectedSha512)throw new Error(`${sample.id}: SHA512 mismatch`);
  if(sample.id==='M1' || sample.id==='W1'){
    const channel=sample.id==='M1'?'latest-arm64-mac.yml':'latest-x64-win.yml';
    const manifest=fs.readFileSync(path.join(here,channel),'utf8');
    const expected=manifest.match(/sha512:\s*(\S+)/)?.[1];
    if(!manifest.includes(sample.url))throw new Error(`${sample.id}: live channel changed; use a separately recorded, verified manifest for this pinned sample`);
    if(!expected || Buffer.from(actual512,'hex').toString('base64')!==expected)throw new Error(`${sample.id}: manifest SHA512 mismatch`);
  }
  const record={...sample,file,size,sha256:sha256.digest('hex'),sha512:actual512,officialClientExecuted:false,observedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(here,sample.id+'-provenance.json'),JSON.stringify(record,null,2)+'\n');
  console.log(`${sample.id} VERIFIED sha256=${record.sha256} bytes=${size}`);
}));
