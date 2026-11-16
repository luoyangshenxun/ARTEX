const core=Process.getModuleByName('Qt5Core.dll'),widgets=Process.getModuleByName('Qt5Widgets.dll'),user=Process.getModuleByName('user32.dll');
function addr(m,p){const e=m.enumerateExports().find(e=>e.name.startsWith(p));if(!e)throw Error('No export '+p);return e.address;}
function native(m,p,r,a){return new NativeFunction(addr(m,p),r,a,{exceptions:'propagate'});}
const qdtor=native(core,'??1QString@@','void',['pointer']),vdtor=native(core,'??1QVariant@@','void',['pointer']),vstr=native(core,'?toString@QVariant@@','pointer',['pointer','pointer']);
const objName=native(core,'?objectName@QObject','pointer',['pointer','pointer']),className=native(core,'?className@QMetaObject@@','pointer',['pointer']);
const allWidgets=native(widgets,'?allWidgets@QApplication','pointer',['pointer']),children=native(core,'?children@QObject','pointer',['pointer']),modelOf=native(widgets,'?model@QAbstractItemView','pointer',['pointer']);
const visible=native(widgets,'?isVisible@QWidget','bool',['pointer']);
function qread(p){const d=p.readPointer();if(d.isNull())return '';const n=d.add(4).readS32(),off=d.add(16).readS64().toNumber();if(n<0||n>100000)throw Error('Bad QString');return d.add(off).readUtf16String(n);}
function qcall(f,o){const r=Memory.alloc(8);f(o,r);try{return qread(r);}finally{qdtor(r);}}
function meta(o){return new NativeFunction(o.readPointer().readPointer(),'pointer',['pointer'],{exceptions:'propagate'})(o);}
function cname(o){return className(meta(o)).readCString();}
function list(p){const d=p.readPointer(),a=d.add(8).readS32(),b=d.add(12).readS32();if(a<0||b<a||b-a>20000)throw Error('Bad QList');return Array.from({length:b-a},(_,i)=>d.add(16+8*(a+i)).readPointer());}
function widgetsNow(){const out=Memory.alloc(8);allWidgets(out);return list(out).map(o=>{const c=cname(o),n={object:o.toString(),class:c,name:qcall(objName,o),visible:!!visible(o)};if(c==='QTreeView'){const m=modelOf(o);n.model=m.toString();}return n;});}
function method(m,i,r,a){return new NativeFunction(m.readPointer().add(i*8).readPointer(),r,a,{exceptions:'propagate'});}
function invalidIndex(){const x=Memory.alloc(24);x.writeS32(-1);x.add(4).writeS32(-1);x.add(8).writePointer(ptr(0));x.add(16).writePointer(ptr(0));return x;}
function indexAt(m,path){const idx=method(m,11,'pointer',['pointer','pointer','int','int','pointer']);let p=invalidIndex();for(const row of path){const next=Memory.alloc(24);idx(m,next,row,0,p);p=next;}return p;}
function readModel(m){const rows=method(m,14,'int',['pointer','pointer']),idx=method(m,11,'pointer',['pointer','pointer','int','int','pointer']),data=method(m,17,'pointer',['pointer','pointer','pointer','int']),out=[];
 function visit(parent,path,depth){const count=rows(m,parent);if(depth>30||count<0||count>10000)throw Error('Model bounds');for(let row=0;row<count;row++){if(out.length>20000)throw Error('Model too large');const x=Memory.alloc(24);idx(m,x,row,0,parent);const v=Memory.alloc(32),q=Memory.alloc(8);data(m,v,x,3);vstr(v,q);let title;try{title=qread(q);}finally{qdtor(q);vdtor(v);}const item=x.add(8).readPointer(),p=[...path,row],childCount=rows(m,x);out.push({path:p,title,internal:item.toString(),dataObject:item.isNull()?null:item.readPointer().toString(),childCount});if(childCount)visit(x,p,depth+1);}}
 visit(invalidIndex(),[],0);return out;
}
function mstr(table,i){const d=table.add(i*24);return d.add(d.add(16).readS64().toNumber()).readUtf8String(d.add(4).readS32());}
function ownMethod(o,name){const m=meta(o),t=m.add(8).readPointer(),d=m.add(16).readPointer(),count=d.add(16).readU32(),off=d.add(20).readU32();for(let i=0;i<count;i++){const p=d.add((off+5*i)*4);if(mstr(t,p.readU32())===name)return {id:i,argc:p.add(4).readU32(),call:m.add(24).readPointer()};}throw Error('Method missing '+name+' on '+cname(o));}
const getTid=native(user,'GetWindowThreadProcessId','uint',['pointer','pointer']);
const hwnd=ptr(SPEC.hwnd),uiTid=getTid(hwnd,ptr(0)),dispatch=addr(user,'DispatchMessageW'),original=Array.from(new Uint8Array(dispatch.readByteArray(16)));
const post=native(user,'PostMessageW','int',['pointer','uint','pointer','pointer']);
let pending=null;
const hook=Interceptor.attach(dispatch,{onEnter(){if(pending&&Process.getCurrentThreadId()===uiTid){const p=pending;pending=null;try{p.resolve(p.action());}catch(e){p.reject(String(e));}}}});
function onUi(action){if(pending)throw Error('UI action already pending');return new Promise((resolve,reject)=>{pending={action,resolve,reject};if(!post(hwnd,0,ptr(0),ptr(0))){pending=null;reject('PostMessage failed');}setTimeout(()=>{if(pending&&pending.resolve===resolve){pending=null;reject('UI action timeout');}},15000);});}
rpc.exports={
 snapshot(){return onUi(()=>{const ws=widgetsNow(),models=ws.filter(w=>w.model&&w.model!=='0x0').map(w=>({...w,nodes:readModel(ptr(w.model))}));return {pid:Process.id,uiTid,widgets:ws.filter(w=>/Course|MainWindow/.test(w.class)),models};});},
 invokeIndex(object,model,path,name){return onUi(()=>{const o=ptr(object);if(!/Course/.test(cname(o)))throw Error('Not a course widget');const mi=ownMethod(o,name);if(mi.argc!==1)throw Error('Expected one argument');const idx=indexAt(ptr(model),path),args=Memory.alloc(16);args.writePointer(ptr(0));args.add(8).writePointer(idx);new NativeFunction(mi.call,'void',['pointer','int','int','pointer'],{exceptions:'propagate'})(o,0,mi.id,args);return {invoked:name,path,object,model,class:cname(o)};});},
 shutdown(){hook.detach();Interceptor.flush();return new Promise(resolve=>setTimeout(()=>resolve({dispatch:dispatch.toString(),restored:JSON.stringify(original)===JSON.stringify(Array.from(new Uint8Array(dispatch.readByteArray(16))))}),50));}
};
