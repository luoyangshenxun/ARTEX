import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function inspect(file) {
  const b=fs.readFileSync(file), sections=[];
  let format,arch,imageBase=0;
  if(b.readUInt32LE(0)===0xfeedfacf){
    format='Mach-O'; arch=b.readUInt32LE(4)===0x100000c?'arm64':'amd64';
    for(let i=0,o=32;i<b.readUInt32LE(16);i++){
      const cmd=b.readUInt32LE(o),len=b.readUInt32LE(o+4);
      if(cmd===0x19) for(let j=0,s=o+72;j<b.readUInt32LE(o+64);j++,s+=80)sections.push({name:b.subarray(s,s+16).toString().split('\0')[0],address:Number(b.readBigUInt64LE(s+32)),bytes:Number(b.readBigUInt64LE(s+40)),offset:b.readUInt32LE(s+48)});
      o+=len;
    }
  }else if(b.subarray(0,2).toString()==='MZ'){
    format='PE'; const pe=b.readUInt32LE(0x3c); arch=b.readUInt16LE(pe+4)===0x8664?'amd64':'arm64';
    imageBase=Number(b.readBigUInt64LE(pe+24+24));
    const count=b.readUInt16LE(pe+6),start=pe+24+b.readUInt16LE(pe+20);
    for(let j=0,s=start;j<count;j++,s+=40)sections.push({name:b.subarray(s,s+8).toString().split('\0')[0],address:imageBase+b.readUInt32LE(s+12),bytes:b.readUInt32LE(s+16),offset:b.readUInt32LE(s+20)});
  }else throw new Error('Unsupported native format');
  const off=address=>{const s=sections.find(s=>s.offset && address>=s.address&&address<s.address+s.bytes);return s?s.offset+address-s.address:null;};
  const va=offset=>{const s=sections.find(s=>s.offset&&offset>=s.offset&&offset<s.offset+s.bytes);return s?s.address+offset-s.offset:null;};
  const sig=Buffer.from([0xf1,0xff,0xff,0xff,0,0,arch==='arm64'?4:1,8]);
  let p=-1;
  for(let at=b.indexOf(sig);at>=0;at=b.indexOf(sig,at+1)){
    const n=Number(b.readBigUInt64LE(at+8)),text=Number(b.readBigUInt64LE(at+24));
    if(n>1000&&n<1000000&&(off(text)!==null||text===0)){p=at;break;}
  }
  if(p<0)throw new Error('Go pclntab not found');
  const u64=o=>Number(b.readBigUInt64LE(p+o)),base=u64(24)||sections.find(s=>s.name==='__text'||s.name==='.text').address,names=p+u64(32),table=p+u64(64),functions=[];
  for(let i=0;i<u64(8);i++){
    const e=table+i*8,addr=base+b.readUInt32LE(e),f=table+b.readUInt32LE(e+4),n=names+b.readUInt32LE(f+4);
    functions.push({name:b.subarray(n,b.indexOf(0,n)).toString(),address:addr,offset:off(addr),size:b.readUInt32LE(e+8)-b.readUInt32LE(e)});
  }
  const stringAt=address=>{const o=off(address);if(o===null)return null;const ptr=Number(b.readBigUInt64LE(o)),len=Number(b.readBigUInt64LE(o+8)),d=off(ptr);if(d===null||len<0||len>10000)return null;return {address,offset:o,dataOffset:d,length:len,value:b.subarray(d,d+len).toString()};};
  const pclnVA=va(p),namesVA=va(names);
  const marker=Buffer.alloc(16);marker.writeBigUInt64LE(BigInt(pclnVA));marker.writeBigUInt64LE(BigInt(namesVA),8);
  let moduleOffset=b.indexOf(marker);
  const moduleWords=moduleOffset<0?[]:Array.from({length:70},(_,i)=>Number(b.readBigUInt64LE(moduleOffset+i*8)));
  let types=sections.find(s=>s.name==='__go_type')?.address;
  if(!types && moduleOffset>=0){
    // These samples use the same Go 1.28 moduledata layout. Validate the
    // candidate by decoding concrete struct names below, rather than using
    // the adjacent GC bitmap pointer as a type base.
    if(off(moduleWords[37])!==null)types=moduleWords[37];
    // moduledata types/etypes are found against the Name/struct shape below;
    // record all mapped words rather than asserting a fixed runtime version.
    for(let i=25;!types&&i<55;i++){
      const start=moduleWords[i],end=moduleWords[i+1];
      if(off(start)!==null && off(end-1)!==null && end>start && end-start>1000000 && end-start<100000000) {
        if(i>=35&&i<=45){types=start;break;}
      }
    }
  }
  function nameAt(address){
    let o=off(address);if(o===null)return null;
    const flags=b[o++];let n=0,shift=0,x;
    do{x=b[o++];n|=(x&127)<<shift;shift+=7;if(shift>28)return null;}while(x&128);
    if(n<0||n>10000)return null;
    return {name:b.subarray(o,o+n).toString(),flags,offset:o};
  }
  function structAt(address){
    const o=off(address);if(o===null || (b[o+23]&31)!==25)return null;
    const nameOffset=b.readInt32LE(o+40),name=types?nameAt(types+nameOffset):null;
    const fieldsAddress=Number(b.readBigUInt64LE(o+56)),count=Number(b.readBigUInt64LE(o+64)),fieldsOffset=off(fieldsAddress);
    if(!name||count>1500||fieldsOffset===null)return null;
    const fields=[];
    for(let i=0,f=fieldsOffset;i<count;i++,f+=24){
      const n=nameAt(Number(b.readBigUInt64LE(f))),t=Number(b.readBigUInt64LE(f+8)),to=off(t);
      fields.push({name:n?.name??null,offset:Number(b.readBigUInt64LE(f+16)),typeAddress:t,typeName:to!==null&&types?nameAt(types+b.readInt32LE(to+40))?.name:null});
    }
    return {name:name.name,address,offset:o,size:Number(b.readBigUInt64LE(o)),fields};
  }
  const structs=[];
  if(types){
    const typeSection=sections.find(s=>types>=s.address&&types<s.address+s.bytes);
    for(let o=off(types);o+80<typeSection.offset+typeSection.bytes;o+=8){
      if((b[o+23]&31)!==25)continue;
      try{const s=structAt(va(o));if(s && /ClientMetadata|GenerateContent|BuildGenerateContent|CodeAssistClient|AuthProvider|MarshalOptions|ChatMessage|ChatToolCall|Prediction|LoadCodeAssistRequest|OnboardUserRequest|FetchAvailableModelsRequest|AuthClient|Content|Part|FunctionCall|ThoughtSignature|RequestParams/.test(s.name))structs.push(s);}catch{}
    }
  }
  return {file:path.resolve(file),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),format,arch,sections,pclnOffset:p,functions,types,moduleOffset,moduleWords,structs,off,va,stringAt,raw:b};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/native-index.mjs')){
  const [file,out]=process.argv.slice(2);if(!file||!out)throw new Error('usage: native-index.mjs FILE OUTPUT.json');
  const r=inspect(file),{raw,off,va,stringAt,functions,...json}=r;
  json.functionCount=functions.length;
  json.functions=functions.filter(f=>/codeassistclient|metadata_provider|fallback_changelist|build\.ClientInfo|ls_version|AuthClient|AuthProvider|thoughtsignature|thought_signature|SignIn|signIn|jetski\/cli|prompt.*identity/i.test(f.name));
  fs.writeFileSync(out,JSON.stringify(json,null,2)+'\n');
  console.log(JSON.stringify({file:r.file,sha256:r.sha256,format:r.format,arch:r.arch,functions:r.functions.length,types:r.types,moduleOffset:r.moduleOffset,structs:r.structs.length}));
}
