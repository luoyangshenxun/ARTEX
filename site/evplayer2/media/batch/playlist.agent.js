(function(){
const m=Process.getModuleByName('PlayerLibRender56_vs.dll'),p=m.base.add(0x3ec80),original=Array.from(new Uint8Array(p.readByteArray(16)));let sequence=0,bytes=0;const calls=[];
const hook=Interceptor.attach(p,{onEnter(a){this.root=a[0].add(8).readU32()===0xffffffff;if(this.root){this.out=a[1];this.n=a[3].toUInt32()*16;this.object=a[0].toString();if(this.n>0x40000)throw Error('Invalid playlist size');}},onLeave(){if(this.root&&this.n){sequence++;bytes+=this.n;calls.push({sequence,bytes:this.n,object:this.object});send({kind:'decrypted_playlist_chunk',sequence,bytes:this.n,object:this.object},this.out.readByteArray(this.n));}}});
Object.assign(rpc.exports,{
 playlistReset(){sequence=0;bytes=0;calls.length=0;},
 playlistCalls(){return {sequence,bytes,calls};},
 playlistShutdown(){hook.detach();Interceptor.flush();return new Promise(resolve=>setTimeout(()=>resolve({address:p.toString(),restored:JSON.stringify(original)===JSON.stringify(Array.from(new Uint8Array(p.readByteArray(16))))}),50));}
});
})();
