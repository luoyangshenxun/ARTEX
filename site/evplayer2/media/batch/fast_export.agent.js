(function(){
const render=Process.getModuleByName('PlayerLibRender56_vs.dll');
function stdInfo(p){const n=p.add(16).readU64().toNumber(),cap=p.add(24).readU64().toNumber();if(n<0||n>100000||cap<n)throw Error('Bad string');return {n,p:cap<16?p:p.readPointer()};}
function std(p){const s=stdInfo(p);return s.p.readUtf8String(s.n);}
function cxxString(s){const b=Memory.allocUtf8String(s),p=Memory.alloc(32);p.writePointer(b);p.add(16).writeU64(s.length);p.add(24).writeU64(Math.max(s.length,16));return p;}
function ctxOf(io){return ptr(io).add(8).readPointer().add(0x170).readPointer();}
function rowsOf(io){const ctx=ctxOf(io),head=ctx.add(0x2a8).readPointer(),rows=[];function walk(n){if(n.equals(head)||n.add(0x19).readU8())return;walk(n.readPointer());const o=n.add(0x40).readPointer(),index=o.add(8).readU32();if(index!==0xffffffff)rows.push({index,file:std(n.add(0x20)),object:o.toString(),nameObject:n.add(0x20).toString()});walk(n.add(16).readPointer());}walk(head.add(8).readPointer());rows.sort((a,b)=>a.index-b.index);if(rows.some((r,i)=>r.index!==i))throw Error('Noncontiguous order');return rows;}
let bound=null;
function sourceOf(o){const d=o.add(0x28).readPointer(),n=d.add(4).readS32();return d.add(d.add(16).readS64().toNumber()).readUtf16String(n);}
function guard(io){if(bound&&bound.io===io&&sourceOf(bound.player)!==bound.source)throw Error('Video source changed during export');}
Object.assign(rpc.exports,{
 fastBind(io,object){bound={io,player:ptr(object),source:sourceOf(ptr(object))};return {bound:true};},
 fastOrder(io){const ctx=ctxOf(io),rows=rowsOf(io);return {io,context:ctx.toString(),rows:rows.map(r=>{const o=ptr(r.object),strings={};for(const offset of [0x18,0x38,0x58,0x78,0xd8,0xf8]){try{strings['0x'+offset.toString(16)]=std(o.add(offset)).replace(/[?#].*/,'');}catch{}}return {...r,size:o.add(0x98).readU64().toString(),strings};})};},
 segmentUrl(io,index){guard(io);const row=rowsOf(io).find(r=>r.index===index);if(!row)throw Error('Index missing');return {file:row.file,url:std(ptr(row.object).add(0x38))};},
 decryptSegment(io,index,input){guard(io);const row=rowsOf(io).find(r=>r.index===index);if(!row)throw Error('Index missing');const name=ptr(row.nameObject),get=new NativeFunction(render.base.add(0x41e20),'pointer',['pointer','pointer'],{exceptions:'propagate'});const original=get(ctxOf(io),name);if(original.isNull()||original.add(8).readU32()!==index||!original.add(0x264).readU8())throw Error('Segment key not initialized: returned='+original+' expected='+row.object+' index='+(original.isNull()?'null':original.add(8).readU32())+' ready='+(original.isNull()?'null':original.add(0x264).readU8()));
 const clone=Memory.alloc(0x2a8);Memory.copy(clone,original,0x2a8);const key=stdInfo(clone.add(0x268));if(key.n<16)throw Error('Short xor key');const keyBytes=new Uint8Array(key.p.readByteArray(16));const enc=new Uint8Array(input),n=enc.length;if(n<16||n%16)throw Error('Ciphertext is not aligned');for(let i=0;i<n;i++)enc[i]^=keyBytes[i%16];const inputPtr=Memory.alloc(n);inputPtr.writeByteArray(enc.buffer);const outputPtr=Memory.alloc(n);new NativeFunction(render.base.add(0x3ec80),'void',['pointer','pointer','pointer','uint'],{exceptions:'propagate'})(clone,outputPtr,inputPtr,n/16);return outputPtr.readByteArray(n);
 }
});
})();
