'use strict';
// Observe arguments and original results. Every hook is removed before detaching.
const HOOKS_ENABLED = false;
const MAX_EVENTS_PER_API = 60;
const counts = Object.create(null), emitted = Object.create(null);
const installed = [], failed = [], attached = new Set(), attempted = new Set(), internalThreads = new Set();
const countsByOrigin = {application:Object.create(null),observer_selftest:Object.create(null)};
let moduleObserver = null;
const watchedNames = /Debugger|DebugObject|DebugPort|QueryInformationProcess|SetInformationThread|WindowDisplayAffinity|Toolhelp32|Process32|EnumWindows|GetClassName|GetThreadContext|SetThreadContext/i;
const interestingProcess = /vbox|vmware|vmtools|vmacthlp|vmupgrade|wireshark|fiddler|x64dbg|x32dbg|ollydbg|ida64|ida\.exe|frida|obs64|obs32|bandicam/i;
function emit(event) { send(Object.assign({time: new Date().toISOString(), pid: Process.id}, event)); }
function hex(address, size) { return Array.from(new Uint8Array(address.readByteArray(size)), x => x.toString(16).padStart(2, '0')).join(''); }
function ansi(p) { try { return p.isNull() ? null : p.readCString(512); } catch (_) { return '<unreadable>'; } }
function wide(p, size) { try { return p.isNull() ? null : p.readUtf16String(size); } catch (_) { return '<unreadable>'; } }
function caller(p) { const m = Process.findModuleByAddress(p); return m ? {module:m.name, rva:p.sub(m.base).toString(), address:p.toString()} : {address:p.toString()}; }
function findExport(moduleName, name) { const m = Process.findModuleByName(moduleName); return m ? m.findExportByName(name) : null; }
function emitCall(api, detail, context, force) {
  counts[api] = (counts[api] || 0) + 1;
  const originCounts=countsByOrigin[context.origin]; originCounts[api]=(originCounts[api]||0)+1;
  if (!force && (emitted[api] || 0) >= MAX_EVENTS_PER_API) return;
  emitted[api] = (emitted[api] || 0) + 1;
  emit(Object.assign({kind:'api_call', api, origin:context.origin, threadId:context.threadId, caller:context.caller,stack:context.stack}, detail));
}
function attach(moduleName, name, enter, leave) {
  const address = findExport(moduleName, name);
  if (address === null || attempted.has(address.toString())) return;
  attempted.add(address.toString());
  const original = hex(address, 16);
  try {
    Interceptor.attach(address, {
      onEnter(args) {
        this.origin = internalThreads.has(this.threadId) ? 'observer_selftest' : 'application';
        this.caller = caller(this.returnAddress); this.active = true;
        if(this.origin==='application'&&(countsByOrigin.application[name]||0)<2) { try { this.stack=Thread.backtrace(this.context,Backtracer.ACCURATE).slice(0,10).map(caller); } catch(_) {} }
        try { if (enter) enter.call(this, args); } catch (error) { this.active = false; emit({kind:'observer_error', api:name, error:String(error)}); }
      },
      onLeave(retval) {
        if (!this.active) return;
        try { leave.call(this, retval); } catch (error) { emit({kind:'observer_error', api:name, error:String(error)}); }
      }
    });
    attached.add(address.toString());
    const record = {module:moduleName, api:name, address:address.toString(), original};
    installed.push(record); emit(Object.assign({kind:'hook_installed'}, record));
  } catch (error) { const failure={module:moduleName,api:name,address:address.toString(),original,error:String(error)}; failed.push(failure); emit(Object.assign({kind:'hook_error'},failure)); }
}
function installHooks() {
  attach('kernel32.dll','IsDebuggerPresent',null,function(r) { emitCall('IsDebuggerPresent',{result:r.toInt32()},this); });
  attach('kernel32.dll','CheckRemoteDebuggerPresent',function(a) { this.handle=a[0].toString(); this.output=a[1]; },function(r) {
    emitCall('CheckRemoteDebuggerPresent',{handle:this.handle, success:r.toInt32(), debuggerPresent:!r.isNull()&&!this.output.isNull()?this.output.readU32():null},this);
  });
  attach('ntdll.dll','NtQueryInformationProcess',function(a) { this.infoClass=a[1].toUInt32(); this.active=[7,30,31].includes(this.infoClass); this.output=a[2]; this.length=a[3].toUInt32(); },function(r) {
    let value=null; if(r.toInt32()>=0&&!this.output.isNull()) value=this.infoClass===31?this.output.readU32():this.output.readPointer().toString();
    emitCall('NtQueryInformationProcess',{infoClass:this.infoClass,status:r.toInt32(),value},this);
  });
  attach('ntdll.dll','NtSetInformationThread',function(a) { this.infoClass=a[1].toUInt32(); this.active=this.infoClass===17; },function(r) {
    emitCall('NtSetInformationThread',{infoClass:this.infoClass,status:r.toInt32()},this);
  });
  attach('kernel32.dll','CreateToolhelp32Snapshot',function(a) { this.flags=a[0].toUInt32(); this.targetPid=a[1].toUInt32(); },function(r) {
    emitCall('CreateToolhelp32Snapshot',{flags:this.flags,targetPid:this.targetPid,handle:r.toString()},this);
  });
  for(const name of ['Process32FirstW','Process32NextW']) attach('kernel32.dll',name,function(a) { this.entry=a[1]; },function(r) {
    const success=!r.isNull(); let processName=null, processId=null;
    if(success&&!this.entry.isNull()) { processId=this.entry.add(8).readU32(); processName=wide(this.entry.add(Process.pointerSize===8?44:36),260); }
    emitCall(name,{success,processId,processName,interesting:!!(processName&&interestingProcess.test(processName))},this,processName&&interestingProcess.test(processName));
  });
  attach('user32.dll','SetWindowDisplayAffinity',function(a) { this.hwnd=a[0].toString(); this.affinity=a[1].toUInt32(); },function(r) {
    emitCall('SetWindowDisplayAffinity',{hwnd:this.hwnd,affinity:this.affinity,success:!r.isNull(),lastError:this.lastError},this,true);
  });

  attach('win32u.dll','NtUserSetWindowDisplayAffinity',function(a) { this.hwnd=a[0].toString(); this.affinity=a[1].toUInt32(); },function(r) {
    emitCall('NtUserSetWindowDisplayAffinity',{hwnd:this.hwnd,affinity:this.affinity,success:!r.isNull()},this,true);
  });
  attach('kernel32.dll','VirtualProtect',function(a) {
    const setter=findExport('user32.dll','SetWindowDisplayAffinity');
    this.active=setter!==null&&a[0].compare(setter)<=0&&a[0].add(a[1].toUInt32()).compare(setter)>0;
    if(this.active) { this.address=a[0].toString(); this.size=a[1].toUInt32(); this.newProtection=a[2].toUInt32(); this.setter=setter; this.before=hex(setter,16); }
  },function(r) {
    emitCall('VirtualProtect',{address:this.address,size:this.size,newProtection:this.newProtection,success:!r.isNull(),setterBefore:this.before,setterAfter:hex(this.setter,16)},this,true);
  });
  attach('user32.dll','GetWindowDisplayAffinity',function(a) { this.hwnd=a[0].toString(); this.output=a[1]; },function(r) {
    emitCall('GetWindowDisplayAffinity',{hwnd:this.hwnd,success:!r.isNull(),affinity:!r.isNull()&&!this.output.isNull()?this.output.readU32():null},this);
  });
  attach('user32.dll','EnumWindows',function(a) { this.callback=a[0].toString(); },function(r) {
    emitCall('EnumWindows',{callback:this.callback,success:!r.isNull()},this);
  });
  attach('user32.dll','GetClassNameW',function(a) { this.hwnd=a[0].toString(); this.output=a[1]; },function(r) {
    emitCall('GetClassNameW',{hwnd:this.hwnd,className:r.toInt32()>0?wide(this.output,r.toInt32()):null},this);
  });
  for(const name of ['GetThreadContext','SetThreadContext']) attach('kernel32.dll',name,function(a) { this.handle=a[0].toString(); },function(r) {
    emitCall(name,{threadHandle:this.handle,success:!r.isNull()},this);
  });
  attach('kernel32.dll','GetProcAddress',function(a) { this.active=a[1].compare(ptr('0xffff'))>0; if(this.active) { this.symbol=ansi(a[1]); this.active=!!this.symbol&&watchedNames.test(this.symbol); } },function(r) {
    emitCall('GetProcAddress',{symbol:this.symbol,resolved:r.toString()},this,true);
  });
}
function asObserver(action) {
  const tid=Process.getCurrentThreadId(); internalThreads.add(tid);
  try { return action(); } finally { internalThreads.delete(tid); }
}
function selftest() { return asObserver(() => {
  const isDebugger=new NativeFunction(findExport('kernel32.dll','IsDebuggerPresent'),'int',[]);
  const checkRemote=new NativeFunction(findExport('kernel32.dll','CheckRemoteDebuggerPresent'),'int',['pointer','pointer']);
  const currentProcess=new NativeFunction(findExport('kernel32.dll','GetCurrentProcess'),'pointer',[]);
  const flag=Memory.alloc(4); flag.writeU32(0xdeadbeef);
  const result={kind:'selftest',isDebuggerPresent:isDebugger(),checkRemoteSuccess:checkRemote(currentProcess(),flag),remoteDebuggerPresent:flag.readU32()};
  emit(result); return result;
}); }
function windowSnapshot() { return asObserver(() => {
  const names=['EnumWindows','GetWindowThreadProcessId','GetWindowDisplayAffinity','IsWindowVisible','GetWindowTextW'];
  const addresses=names.map(n=>findExport('user32.dll',n));
  if(addresses.some(a=>a===null)) return {kind:'window_snapshot',windows:[],error:'user32 exports unavailable'};
  const enumWindows=new NativeFunction(addresses[0],'int',['pointer','pointer']);
  const getPid=new NativeFunction(addresses[1],'uint32',['pointer','pointer']);
  const getAffinity=new NativeFunction(addresses[2],'int',['pointer','pointer']);
  const visible=new NativeFunction(addresses[3],'int',['pointer']);
  const getTitle=new NativeFunction(addresses[4],'int',['pointer','pointer','int']);
  const windows=[],pidBuf=Memory.alloc(4),affBuf=Memory.alloc(4),titleBuf=Memory.alloc(512);
  const cb=new NativeCallback(hwnd=> {
    getPid(hwnd,pidBuf); if(pidBuf.readU32()!==Process.id) return 1;
    affBuf.writeU32(0); const ok=getAffinity(hwnd,affBuf); const length=getTitle(hwnd,titleBuf,256);
    windows.push({hwnd:hwnd.toString(),visible:!!visible(hwnd),title:length>0?titleBuf.readUtf16String(length):'',affinityReadSuccess:!!ok,affinity:ok?affBuf.readU32():null}); return 1;
  },'int',['pointer','pointer']);
  enumWindows(cb,ptr(0)); const result={kind:'window_snapshot',windows}; emit(result); return result;
}); }
rpc.exports={
  summary() { return {enabled:HOOKS_ENABLED,installed,failed,counts,countsByOrigin,emitted}; },
  selftest,
  snapshot:windowSnapshot,
  shutdown() {
    if(moduleObserver) { moduleObserver.detach(); moduleObserver=null; }
    Interceptor.detachAll(); Interceptor.flush();
    return new Promise(resolve=>setTimeout(()=>resolve({counts,emitted}),50));
  }
};
setImmediate(() => {
  emit({kind:'modules',modules:Process.enumerateModules().filter(m=>/^(EVPlayer2\.exe|Bridge\.dll|MetaLib\.dll|PlayerLibRender56_vs\.dll)$/i.test(m.name)).map(m=>({name:m.name,base:m.base.toString(),size:m.size,path:m.path}))});
  if(HOOKS_ENABLED) {
    installHooks();
    moduleObserver=Process.attachModuleObserver({onAdded(m) { if(/^(kernel32|kernelbase|ntdll|user32|win32u)\.dll$/i.test(m.name)) installHooks(); }});
  }
  emit({kind:'ready',enabled:HOOKS_ENABLED,installed:installed.length});
});