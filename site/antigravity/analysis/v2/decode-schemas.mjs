import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const [file,out]=process.argv.slice(2),bytes=fs.readFileSync(file);
const require=createRequire(path.resolve('site/antigravity/analysis/unpacked/macos-app-2.32.0-verified/asar/package.json'));
const {fromBinary}=require('@bufbuild/protobuf');
const {FileDescriptorProtoSchema}=require('@bufbuild/protobuf/wkt');
function endAt(start){
  let o=start,first=true;
  const read=()=>{let v=0,k=0,c;do{c=bytes[o++];v+=(c&127)*2**k;k+=7;if(k>56)throw Error('invalid varint')}while(c&128);return v;};
  while(o<start+1048576){const at=o,key=read(),n=Math.floor(key/8),w=key&7;if((!first&&n===1)||n<1||n>15)return at;first=false;if(w===0)read();else if(w===2){const len=read();o+=len;}else return at;}throw Error('descriptor too long');
}
function msg(m){return {name:m.name,fields:m.field.map(f=>({name:f.name,jsonName:f.jsonName,number:f.number,type:f.type,typeName:f.typeName,label:f.label,optional:f.proto3Optional})),enums:m.enumType.map(e=>({name:e.name,values:e.value.map(v=>({name:v.name,number:v.number}))})),nested:m.nestedType.map(msg)}}
const schemas=[];
for(const match of bytes.toString('latin1').matchAll(/google\/internal\/cloud\/code\/v1internal\/[a-z_]+\.proto/g)){
  const start=match.index-2;if(bytes[start]!==10||bytes[start+1]!==match[0].length)continue;
  // The credits raw descriptor is 0x20b bytes, loaded explicitly by its
  // generated init function (M1 file offset 5009144). Its concatenated rodata
  // suffix happens to resemble valid protobuf fields; do not infer its end.
  let raw,decoded;try{raw=bytes.subarray(start,match[0].endsWith('/credits.proto')?start+0x20b:endAt(start));decoded=fromBinary(FileDescriptorProtoSchema,raw);}catch{continue;}
  if(decoded.name!==match[0])continue;
  const messages=decoded.messageType.filter(m=>decoded.name.endsWith('/credits.proto')||/^(Credits|ClientMetadata|LoadCodeAssistRequest|OnboardUserRequest|GenerateContentRequest|FetchAvailableModelsRequest|GenerateChatRequest|InternalAtomicAgenticChatRequest)$/.test(m.name)).map(msg);
  if(messages.length)schemas.push({file:decoded.name,offset:start,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),syntax:decoded.syntax,enums:decoded.enumType.map(e=>({name:e.name,values:e.value.map(v=>({name:v.name,number:v.number}))})),messages});
}
fs.writeFileSync(out,JSON.stringify({sample:path.resolve(file),schemas},null,2)+'\n');
for(const s of schemas)console.log(JSON.stringify({file:s.file,offset:s.offset,sha256:s.sha256,messages:s.messages.map(m=>m.name)}));
