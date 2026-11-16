import fs from 'node:fs';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const pid=Number(process.argv[2]||67068),session=await frida.attach(pid);let script;
try{script=await session.createScript(`
const core=Process.getModuleByName('Qt5Core.dll'),widgets=Process.getModuleByName('Qt5Widgets.dll');
function fn(m,p,ret,args){const e=m.enumerateExports().find(e=>e.name.startsWith(p));if(!e)throw Error('No export '+p);return new NativeFunction(e.address,ret,args,{exceptions:'propagate'});}
const instance=fn(core,'?instance@QCoreApplication','pointer',[]),app=instance();
rpc.exports={inspect(){
const v=app.readPointer(),vtable=[];for(let i=0;i<12;i++){const p=v.add(i*8).readPointer();vtable.push({index:i,address:p.toString(),symbol:DebugSymbol.fromAddress(p).toString(),instructions:Array.from({length:3}).reduce((a)=>{const p0=a.length?ptr(a.at(-1).next):p;const ins=Instruction.parse(p0);a.push({text:ins.toString(),next:ins.next.toString()});return a;},[])});}
const all=fn(widgets,'?allWidgets@QApplication','pointer',['pointer']);const out=Memory.alloc(8);const r=all(out);const d=out.readPointer();return {app:app.toString(),vtable,list:{return:r.toString(),out:out.readByteArray(8),data:d.toString(),header:Array.from({length:4},(_,i)=>d.add(i*4).readS32()),firstPointers:Array.from({length:5},(_,i)=>d.add(16+i*8).readPointer().toString())}};
}};
`,{name:'qt-session-layout-readonly'});await script.load();const r=await script.exports.inspect();fs.writeFileSync(new URL('qt_layout.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r,null,2));}finally{if(script)await script.unload();await session.detach();}
