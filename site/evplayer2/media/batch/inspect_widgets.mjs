import fs from 'node:fs';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const pid=Number(process.argv[2]||67068),session=await frida.attach(pid);let script;
try{script=await session.createScript(`
const core=Process.getModuleByName('Qt5Core.dll'),widgets=Process.getModuleByName('Qt5Widgets.dll');
function find(m,p){const e=m.enumerateExports().find(e=>e.name.startsWith(p));if(!e)throw Error('No export '+p);return e.address;}
function fn(m,p,ret,args){return new NativeFunction(find(m,p),ret,args,{exceptions:'propagate'});}
const qdtor=fn(core,'??1QString@@','void',['pointer']);
const objName=fn(core,'?objectName@QObject','pointer',['pointer','pointer']);
const className=fn(core,'?className@QMetaObject@@','pointer',['pointer']);
const children=fn(core,'?children@QObject','pointer',['pointer']);
const labelText=fn(widgets,'?text@QLabel','pointer',['pointer','pointer']);
const buttonText=fn(widgets,'?text@QAbstractButton','pointer',['pointer','pointer']);
const windowTitle=fn(widgets,'?windowTitle@QWidget','pointer',['pointer','pointer']);
const isVisible=fn(widgets,'?isVisible@QWidget','bool',['pointer']);
const modelOf=fn(widgets,'?model@QAbstractItemView','pointer',['pointer']);
function qread(p){const d=p.readPointer();if(d.isNull())return '';const len=d.add(4).readS32(),off=d.add(16).readS64().toNumber();if(len<0||len>100000)return '<invalid>';return d.add(off).readUtf16String(len);}
function qcall(f,o){const r=Memory.alloc(8);f(o,r);try{return qread(r);}finally{qdtor(r);}}
function meta(o){return new NativeFunction(o.readPointer().readPointer(),'pointer',['pointer'],{exceptions:'propagate'})(o);}
function cname(o){return className(meta(o)).readCString();}
function list(p){const d=p.readPointer(),begin=d.add(8).readS32(),end=d.add(12).readS32();if(begin<0||end<begin||end-begin>20000)throw Error('Bad QList');return Array.from({length:end-begin},(_,i)=>d.add(16+(begin+i)*8).readPointer());}
rpc.exports={inspect(){
 const out=Memory.alloc(8);fn(widgets,'?allWidgets@QApplication','pointer',['pointer'])(out);
 const nodes=[],seen=new Set();function visit(o,depth,parent){if(o.isNull()||seen.has(o.toString())||depth>18)return;seen.add(o.toString());try{
 const c=cname(o),n={object:o.toString(),class:c,name:qcall(objName,o),parent,depth};
 if(/QLabel/.test(c))n.text=qcall(labelText,o);else if(/Q(PushButton|ToolButton|RadioButton|CheckBox)/.test(c))n.text=qcall(buttonText,o);
 if(depth===0){n.visible=isVisible(o);n.title=qcall(windowTitle,o);}
 if(/(ListView|TreeView|TableView|TreeWidget|ListWidget|TableWidget)/.test(c)){const m=modelOf(o);n.model=m.toString();if(!m.isNull())n.modelClass=cname(m);}
 nodes.push(n);for(const child of list(children(o)))visit(child,depth+1,o.toString());
 }catch(error){nodes.push({object:o.toString(),depth,error:String(error)});}}
 for(const o of list(out))visit(o,0,null);
 return {time:new Date().toISOString(),pid:Process.id,count:nodes.length,nodes};
}};
`,{name:'qt-account-widgets-readonly'});await script.load();const r=await script.exports.inspect();fs.writeFileSync(new URL('widgets.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({pid:r.pid,count:r.count,interesting:r.nodes.filter(n=>n.text||n.model||n.error||/Course|Student|MainWindow|Player|Down|Cate|File|PlayList/.test(n.class||''))},null,2));}finally{if(script)await script.unload();await session.detach();}
