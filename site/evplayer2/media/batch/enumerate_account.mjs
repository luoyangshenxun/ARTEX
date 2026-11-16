import fs from 'node:fs';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const root=new URL('./',import.meta.url),spec={hwnd:'0x250514'},pid=67068;
const session=await frida.attach(pid);let script,audit;
try{script=await session.createScript('const SPEC='+JSON.stringify(spec)+';\n'+fs.readFileSync(new URL('account.agent.js',root),'utf8'),{name:'account-course-enumeration'});await script.load();const before=await script.exports.snapshot();fs.writeFileSync(new URL('account_before.json',root),JSON.stringify(before,null,2)+'\n');
const action=await script.exports.invokeIndex('0x1fc828a6fe0','0x1fc8356d010',[0,0],'slot_treeViewDoubleClicked');
await new Promise(r=>setTimeout(r,4000));const after=await script.exports.snapshot();fs.writeFileSync(new URL('account_after_first_course.json',root),JSON.stringify({action,...after},null,2)+'\n');
console.log(JSON.stringify({action,widgets:after.widgets,models:after.models.map(m=>({view:m.object,model:m.model,count:m.nodes.length,first:m.nodes.slice(0,3)}))},null,2));audit=await script.exports.shutdown();console.log('audit',audit);
}finally{if(script){if(!audit)try{console.log('audit',await script.exports.shutdown());}catch{}await script.unload();}await session.detach();}
