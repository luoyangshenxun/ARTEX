import fs from 'node:fs';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('widgets.json',import.meta.url),'utf8'));
const targets=snapshot.nodes.filter(n=>n.model&&n.model!=='0x0'||/^(CourseForm|CourseDetailForm|CourseListForm|PlayListForm|MainWindow|StudentListDialog)$/.test(n.class||''));
const session=await frida.attach(snapshot.pid);let script;
try{script=await session.createScript(`
const targets=${JSON.stringify(targets)};
function meta(o){return new NativeFunction(o.readPointer().readPointer(),'pointer',['pointer'],{exceptions:'propagate'})(o);}
function str(table,idx){const d=table.add(idx*24),n=d.add(4).readS32(),off=d.add(16).readS64().toNumber();return d.add(off).readUtf8String(n);}
function methods(m,depth=0){if(m.isNull()||depth>5)return [];const t=m.add(8).readPointer(),d=m.add(16).readPointer(),n=d.add(16).readU32(),off=d.add(20).readU32();if(n>2000)throw Error('Too many methods');const self=[];for(let i=0;i<n;i++){const p=d.add(4*(off+i*5));self.push({id:i,name:str(t,p.readU32()),argc:p.add(4).readU32(),flags:p.add(16).readU32()});}return [{class:str(t,d.add(4).readU32()),revision:d.readU32(),count:n,methods:self},...methods(m.readPointer(),depth+1)];}
rpc.exports={inspect(){return targets.map(n=>{const o=ptr(n.model||n.object),vt=o.readPointer();return {...n,methods:methods(meta(o)),vtable:Array.from({length:44},(_,i)=>{const a=vt.add(i*8).readPointer();let p=a;const lines=[];try{let f=Instruction.parse(p);if(f.mnemonic==='jmp'&&f.operands[0].type==='imm'){p=ptr(f.operands[0].value);f=Instruction.parse(p);}for(let j=0;j<8;j++){lines.push(f.toString());p=f.next;f=Instruction.parse(p);}}catch(e){lines.push(String(e));}return {slot:i,address:a.toString(),symbol:DebugSymbol.fromAddress(a).toString(),lines};})};});}};
`,{name:'qt-account-model-metadata'});await script.load();const r=await script.exports.inspect();fs.writeFileSync(new URL('model_metadata.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.map(n=>({class:n.modelClass||n.class,object:n.model||n.object,name:n.name,methods:n.methods.slice(0,1),vtable:n.model?n.vtable.slice(11,20):undefined})),null,2));}finally{if(script)await script.unload();await session.detach();}
