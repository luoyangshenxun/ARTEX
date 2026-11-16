(function(){
const render=Process.getModuleByName('PlayerLibRender56_vs.dll'),core=Process.getModuleByName('Qt5Core.dll');
function exp(prefix){return render.enumerateExports().find(e=>e.name.startsWith(prefix)).address;}
const handles=[],ioSeen=new Map(),events=[];let player=null,firstClear=null;
function qsource(o){const d=o.add(0x28).readPointer(),n=d.add(4).readS32();if(n<0||n>200000)throw Error('Bad source');return d.add(d.add(16).readS64().toNumber()).readUtf16String(n);}
function state(){if(!player)return {bound:false};const read=(p,t)=>new NativeFunction(exp(p),t,['pointer'],{exceptions:'propagate'})(player);return {bound:true,object:player.toString(),currentMs:Number(read('?currentTime@MediaPlayer','int64')),durationMs:Number(read('?duration@MediaPlayer','int64')),paused:!!read('?isPaused@MediaPlayer','bool'),stopped:!!read('?isStoped@MediaPlayer','bool'),sourceBase:qsource(player).replace(/[?#].*/,''),io:[...ioSeen.values()],events};}
function track(p,callback){const original=Array.from(new Uint8Array(p.readByteArray(16)));const h=Interceptor.attach(p,callback);handles.push({p,original,h});}
track(exp('?playFile@MediaPlayer'),{onEnter(a){player=a[0];events.push({kind:'playFile',object:player.toString(),sourceLength:qsource(player).length});}});
track(exp('?currentTime@MediaPlayer'),{onEnter(a){if(!player)player=a[0];}});
track(render.base.add(0x388a0),{onEnter(a){this.io=a[0];this.output=a[3];this.capacity=a[4].toUInt32();try{const wrapper=a[0].add(8).readPointer(),context=wrapper.add(0x170).readPointer();if(!ioSeen.has(a[0].toString()))ioSeen.set(a[0].toString(),{io:a[0].toString(),wrapper:wrapper.toString(),context:context.toString()});}catch(e){events.push({kind:'io_error',error:String(e)});}},onLeave(r){const n=r.toInt32();if(n>0&&!firstClear){firstClear={bytes:n,io:this.io.toString()};send({kind:'first_clear',...firstClear},this.output.readByteArray(n));}}});
Object.assign(rpc.exports,{
 mediaState:state,
 mediaReset(){ioSeen.clear();events.length=0;firstClear=null;},
 mediaBind(object,io){player=ptr(object);if(io){const p=ptr(io),wrapper=p.add(8).readPointer(),context=wrapper.add(0x170).readPointer();ioSeen.set(io,{io,wrapper:wrapper.toString(),context:context.toString()});}return state();},
 mediaPause(){return onUi(()=>{if(!player)throw Error('No player');new NativeFunction(exp('?pause@MediaPlayer'),'void',['pointer'],{exceptions:'propagate'})(player);return state();});},
 mediaShutdown(){for(const x of handles)x.h.detach();Interceptor.flush();return new Promise(resolve=>setTimeout(()=>resolve(handles.map(x=>({address:x.p.toString(),restored:JSON.stringify(x.original)===JSON.stringify(Array.from(new Uint8Array(x.p.readByteArray(16))))}))),50));}
});
})();
