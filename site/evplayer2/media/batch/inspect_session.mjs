import fs from 'node:fs';
import crypto from 'node:crypto';
import * as frida from '../../hooks/node_modules/frida/build/src/frida.js';
const root=new URL('./',import.meta.url);
const pid=Number(process.argv[2]||67068);
const inventory=JSON.parse(fs.readFileSync(new URL('../EVPlayer2.exe.inventory.json',root),'utf8'));
if(crypto.createHash('sha256').update(fs.readFileSync(inventory.file)).digest('hex')!==inventory.sha256)throw Error('Source binary changed');
const session=await frida.attach(pid);let script;
try{
script=await session.createScript(`
rpc.exports={inspect(){
 const modules=Process.enumerateModules().filter(m=>/Qt5(Core|Widgets|Gui)|EVPlayer/.test(m.name));
 const exports=modules.flatMap(m=>m.enumerateExports().filter(e=>/allWidgets|children@QObject|objectName@QObject|className@QMetaObject|windowTitle@QWidget|text@(QLabel|QPushButton|QLineEdit)|model@Q|rowCount@|columnCount@|index@QAbstractItemModel|data@QAbstractItemModel|self@QCoreApplication|instance@QCoreApplication/.test(e.name)).map(e=>({module:m.name,name:e.name,address:e.address.toString()})));
 const user=Process.getModuleByName('user32.dll'),wins=[];
 const enumWins=new NativeFunction(user.getExportByName('EnumWindows'),'int',['pointer','pointer']);
 const getPid=new NativeFunction(user.getExportByName('GetWindowThreadProcessId'),'uint',['pointer','pointer']);
 const getTitle=new NativeFunction(user.getExportByName('GetWindowTextW'),'int',['pointer','pointer','int']);
 const visible=new NativeFunction(user.getExportByName('IsWindowVisible'),'int',['pointer']);
 const cb=new NativeCallback((h)=>{const p=Memory.alloc(4);getPid(h,p);if(p.readU32()===Process.id){const b=Memory.alloc(2048),n=getTitle(h,b,1024);wins.push({hwnd:h.toString(),title:b.readUtf16String(n),visible:!!visible(h)});}return 1;},'int',['pointer','pointer']);
 enumWins(cb,ptr(0));return {pid:Process.id,modules:modules.map(m=>({name:m.name,base:m.base.toString(),size:m.size})),exports,windows:wins};
}};
`,{name:'account-inventory-readonly'});
await script.load();const result=await script.exports.inspect();
fs.writeFileSync(new URL('session_inventory.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
}finally{if(script)await script.unload();await session.detach();}
