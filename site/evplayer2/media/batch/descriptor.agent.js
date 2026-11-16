(function(){
const m=Process.getModuleByName('PlayerLibRender56_vs.dll'),records=[],handles=[];
function std(p){const n=p.add(16).readU64().toNumber(),cap=p.add(24).readU64().toNumber();if(n<0||n>10000000||cap<n)throw Error('Invalid std::string');const d=cap<16?p:p.readPointer();return {n,d,text:()=>d.readUtf8String(n)};}
function safe(x,name='',depth=0){if(depth>12)return '<depth-limit>';if(/key|token|sign|auth|password|salt|secret|license|^iv$/i.test(name))return '<redacted>';if(Array.isArray(x))return x.map(v=>safe(v,'',depth+1));if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,safe(v,k,depth+1)]));if(typeof x==='string'){if(/^https?:\/\//.test(x))return x.replace(/[?#].*/,'');if(x.length>500)return '<string:'+x.length+'>';return x;}return x;}
function track(rva,cb){const p=m.base.add(rva),original=Array.from(new Uint8Array(p.readByteArray(16)));const h=Interceptor.attach(p,cb);handles.push({p,original,h});}
track(0x1e740,{onEnter(a){this.relevant=this.returnAddress.equals(m.base.add(0x42409));if(this.relevant){this.out=a[0];try{const s=std(a[1]);this.inputBytes=s.n;send({kind:'encrypted_descriptor',bytes:s.n},s.d.readByteArray(s.n));}catch(e){records.push({error:String(e)});}}},onLeave(){if(!this.relevant)return;try{const s=std(this.out),parsed=JSON.parse(s.text());const r={kind:'decrypted_descriptor',encryptedBytes:this.inputBytes,plaintextBytes:s.n,rootKeys:Object.keys(parsed),content:safe(parsed)};records.push(r);}catch(e){records.push({kind:'descriptor_parse_error',error:String(e)});}}});
Object.assign(rpc.exports,{
 descriptorResult(){return records;},
 descriptorShutdown(){for(const x of handles)x.h.detach();Interceptor.flush();return new Promise(resolve=>setTimeout(()=>resolve(handles.map(x=>({address:x.p.toString(),restored:JSON.stringify(x.original)===JSON.stringify(Array.from(new Uint8Array(x.p.readByteArray(16))))}))),50));}
});
})();
