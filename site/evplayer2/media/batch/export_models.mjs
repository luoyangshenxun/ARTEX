import fs from 'node:fs';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('widgets.json',import.meta.url),'utf8'));
const targets=snapshot.nodes.filter(n=>n.model&&n.model!=='0x0'&&n.modelClass==='TreeModel');
const session=await frida.attach(snapshot.pid);let script;
try{script=await session.createScript(`
const targets=${JSON.stringify(targets)},core=Process.getModuleByName('Qt5Core.dll');
function fn(p,r,a){return new NativeFunction(core.enumerateExports().find(e=>e.name.startsWith(p)).address,r,a,{exceptions:'propagate'});}
const vdtor=fn('??1QVariant@@','void',['pointer']),qdtor=fn('??1QString@@','void',['pointer']),vstr=fn('?toString@QVariant@@','pointer',['pointer','pointer']),vtype=fn('?userType@QVariant@@','int',['pointer']);
function qread(p){const d=p.readPointer();if(d.isNull())return '';const n=d.add(4).readS32(),off=d.add(16).readS64().toNumber();if(n<0||n>100000)throw Error('Invalid QString');return d.add(off).readUtf16String(n);}
function method(m,i,r,a){return new NativeFunction(m.readPointer().add(i*8).readPointer(),r,a,{exceptions:'propagate'});}
rpc.exports={inspect(){return targets.map(t=>{
 const m=ptr(t.model),rowCount=method(m,14,'int',['pointer','pointer']),index=method(m,11,'pointer',['pointer','pointer','int','int','pointer']),data=method(m,17,'pointer',['pointer','pointer','pointer','int']);
 const root=Memory.alloc(24);root.writeS32(-1);root.add(4).writeS32(-1);root.add(8).writePointer(ptr(0));root.add(16).writePointer(ptr(0));
 let total=0;const nodes=[];
 function walk(parent,path,depth){if(depth>30)throw Error('Depth limit');const count=rowCount(m,parent);if(count<0||count>10000)throw Error('Invalid model row count '+count);
 for(let row=0;row<count;row++){if(++total>20000)throw Error('Too many nodes');const idx=Memory.alloc(24);index(m,idx,row,0,parent);const record={path:[...path,row],internal:idx.add(8).readPointer().toString(),roles:{}};
 for(const role of [0,3,256,257,258,259,260]){const v=Memory.alloc(32);data(m,v,idx,role);try{const type=vtype(v);if(!type)continue;const q=Memory.alloc(8);vstr(v,q);let text;try{text=qread(q);}finally{qdtor(q);}record.roles[role]={type,text};}finally{vdtor(v);}}
 record.childCount=rowCount(m,idx);nodes.push(record);if(record.childCount)walk(idx,record.path,depth+1);
 }}walk(root,[],0);
 const lines=[];let a=m.readPointer().add(17*8).readPointer();let ins=Instruction.parse(a);if(ins.mnemonic==='jmp'&&ins.operands[0].type==='imm')a=ptr(ins.operands[0].value);for(let i=0;i<260;i++){const ins=Instruction.parse(a);lines.push({address:a.toString(),text:ins.toString()});a=ins.next;if(ins.mnemonic==='ret')break;}
 return {...t,total,nodes,dataDisassembly:lines};
});}};
`,{name:'authorized-course-model-export'});await script.load();const r=await script.exports.inspect();fs.writeFileSync(new URL('course_models.json',import.meta.url),JSON.stringify({time:new Date().toISOString(),pid:snapshot.pid,models:r},null,2)+'\n');console.log(JSON.stringify(r.map(n=>({view:n.object,model:n.model,total:n.total,first:n.nodes.slice(0,7)})),null,2));}finally{if(script)await script.unload();await session.detach();}
