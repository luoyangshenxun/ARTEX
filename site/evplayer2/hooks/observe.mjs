import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as frida from 'frida';
const args=process.argv.slice(2), options={seconds:'6'};
for(let i=0;i<args.length;i+=2) { if(!args[i].startsWith('--')||args[i+1]===undefined) throw new Error('Expected --name value'); options[args[i].slice(2)]=args[i+1]; }
if(!options.agent||!options.output||(!options.pid&&!options.spawn)) throw new Error('Use --agent FILE --output FILE --pid PID [--seconds 6] or --spawn EXE');
const seconds=Number(options.seconds); if(!Number.isFinite(seconds)||seconds<0||seconds>120) throw new Error('seconds must be between 0 and 120');
fs.mkdirSync(path.dirname(path.resolve(options.output)),{recursive:true});
const fd=fs.openSync(options.output,'w');
const write=event=> { const line=JSON.stringify(event); fs.writeSync(fd,line+'\n'); if(['run_start','ready','selftest','window_snapshot','summary','unload_audit','run_end','error'].includes(event.kind)) console.log(line); };
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let session=null,script=null,device=null,spawnedPid=null,detached=false,exitCode=0;
let resolveReady,rejectReady; const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
const readyTimeout=setTimeout(()=>rejectReady(new Error('Agent ready timeout')),15000);
try {
  device=await frida.getLocalDevice();
  const targetPid=options.spawn?(spawnedPid=await device.spawn([options.spawn])):Number(options.pid);
  write({kind:'run_start',pid:targetPid,spawn:options.spawn||null,agent:path.resolve(options.agent),agentSha256:sha(options.agent),seconds,fridaVersion:frida.version||null});
  session=await device.attach(targetPid);
  session.detached.connect((reason,crash)=> { detached=true; write({kind:'detached',reason,crash:crash?String(crash):null}); });
  script=await session.createScript(fs.readFileSync(options.agent,'utf8'),{name:'evplayer2-observe-checks'});
  script.message.connect(message=> {
    if(message.type==='send') { write(message.payload); if(message.payload.kind==='ready') resolveReady(message.payload); }
    else { write({kind:'agent_message',message}); if(message.type==='error') { exitCode=1; rejectReady(new Error(message.description)); } }
  });
  await script.load(); await ready; clearTimeout(readyTimeout);
  if(spawnedPid!==null) await device.resume(spawnedPid);
  if(!options.spawn) { await script.exports.selftest(); await script.exports.snapshot(); }
  const deadline=Date.now()+seconds*1000;
  while(!detached&&Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,100));
  if(!detached) {
    if(options.spawn) { await script.exports.selftest(); await script.exports.snapshot(); }
    const summary=await script.exports.summary(); write({kind:'summary',...summary});
    await script.exports.shutdown(); await script.unload(); script=null;
    const addresses=summary.installed.map(({api,address,original})=>({api,address,original}));
    const audit=await session.createScript(`rpc.exports={check(){return ${JSON.stringify(addresses)}.map(x=>{const actual=Array.from(new Uint8Array(ptr(x.address).readByteArray(16)),b=>b.toString(16).padStart(2,'0')).join('');return {...x,actual,restored:actual===x.original};});}};`);
    await audit.load(); const results=await audit.exports.check(); await audit.unload();
    write({kind:'unload_audit',checked:results.length,allRestored:results.every(r=>r.restored),results});
    if(results.some(r=>!r.restored)) exitCode=1;
  }
} catch(error) { exitCode=1; clearTimeout(readyTimeout); ready.catch(()=>{}); write({kind:'error',message:error.message,stack:error.stack}); }
finally {
  clearTimeout(readyTimeout);
  if(script&&!detached) { try { await script.exports.shutdown(); await script.unload(); } catch(error) { write({kind:'cleanup_error',message:error.message}); exitCode=1; } }
  if(session&&!detached) { try { await session.detach(); } catch(error) { write({kind:'cleanup_error',message:error.message}); exitCode=1; } }
  if(spawnedPid!==null) { try { await device.kill(spawnedPid); write({kind:'spawn_cleanup',pid:spawnedPid,killed:true}); } catch(error) { write({kind:'spawn_cleanup',pid:spawnedPid,message:error.message}); } }
  write({kind:'run_end',exitCode}); fs.closeSync(fd); process.exitCode=exitCode;
}