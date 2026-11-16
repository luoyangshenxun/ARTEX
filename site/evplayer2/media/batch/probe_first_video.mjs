import fs from 'node:fs';import crypto from 'node:crypto';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const root=new URL('./',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('account_manifest.json',root),'utf8'));
const inv=JSON.parse(fs.readFileSync(new URL('../PlayerLibRender56_vs.dll.inventory.json',root),'utf8'));if(crypto.createHash('sha256').update(fs.readFileSync(inv.file)).digest('hex')!==inv.sha256)throw Error('Render changed');
const session=await frida.attach(manifest.pid);let script,audits;
try{const source='const SPEC={hwnd:"0x250514"};\n'+fs.readFileSync(new URL('account.agent.js',root),'utf8')+'\n'+fs.readFileSync(new URL('media.agent.js',root),'utf8');script=await session.createScript(source,{name:'batch-first-video-input-probe'});script.message.connect((m,d)=>{if(d&&m.type==='send')fs.writeFileSync(new URL('first_clear_sample.ts',root),d);else console.log(JSON.stringify(m));});await script.load();
const before=await script.exports.mediaState();const course=manifest.courses[0],item=course.items[0];const action=await script.exports.invokeIndex(course.detailObject,course.model,item.path,'on_treeView_doubleClicked');
let state;for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));state=await script.exports.mediaState();if(state.durationMs>0&&state.io?.length)break;}
const paused=await script.exports.mediaPause();audits={media:await script.exports.mediaShutdown(),ui:await script.exports.shutdown()};const r={time:new Date().toISOString(),pid:manifest.pid,course:course.title,item:item.title,before,action,state,paused,audits};fs.writeFileSync(new URL('first_video_probe.json',root),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));
}finally{if(script){if(!audits){try{await script.exports.mediaShutdown();await script.exports.shutdown();}catch{}}await script.unload();}await session.detach();}
