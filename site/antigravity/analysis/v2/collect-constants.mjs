import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspect} from './native-index.mjs';
const root='site/antigravity/analysis/';
const samples={
  M2:['unpacked/macos-app-2.32.0-verified/Antigravity.app/Contents/Resources/bin/language_server',0x10c15e180],
  M1:['unpacked/macos-app-2.32.1/Antigravity.app/Contents/Resources/bin/language_server',0x10c15e180],
  W1:['unpacked/windows-app-2.32.1/resources/bin/language_server.exe',0x14c891c00],
  C1:['../installer/Antigravity-CLI-1.5.9-windows-x64.exe',0x14d7e11b0],
};
const result={},secrets=new Set();
for(const [id,[file,header]]of Object.entries(samples)){
  const r=inspect(root+file),cl=r.stringAt(header),secretRecords=[];
  for(let o=r.raw.indexOf('GOCSPX-');o>=0;o=r.raw.indexOf('GOCSPX-',o+1)){
    // getOAuthConfig explicitly stores length 0x23 (35) beside the literal
    // pointer; rodata strings are concatenated without a NUL delimiter.
    const literal=r.raw.subarray(o,o+35);
    if(/^GOCSPX-[A-Za-z0-9_-]{28}$/.test(literal.toString())){
      const value=literal.toString();secrets.add(value);
      secretRecords.push({offset:o,length:35,boundary:'getOAuthConfig immediate 0x23; verify per sample',sha256:createHash('sha256').update(literal).digest('hex')});
    }
    const a=r.va(o);if(a===null)continue;
    const marker=Buffer.alloc(8);marker.writeBigUInt64LE(BigInt(a));
    for(let p=r.raw.indexOf(marker);p>=0;p=r.raw.indexOf(marker,p+1)){
      if(p+16>r.raw.length)continue;
      const n=Number(r.raw.readBigUInt64LE(p+8));
      if(n<20||n>60)continue;
      const raw=r.raw.subarray(o,o+n),value=raw.toString();
      if(!/^GOCSPX-[A-Za-z0-9_-]+$/.test(value))continue;
      secrets.add(value);
      const rec={offset:o,length:n,stringHeaderOffset:p,sha256:createHash('sha256').update(raw).digest('hex')};
      if(!secretRecords.some(s=>s.offset===o))secretRecords.push(rec);
    }
  }
  const marks=['<identity>','You are Antigravity','enabled_credit_types','user_prompt_id','X-Goog-Api-Client','gl-node/22.21.1'];
  const occurrences={};
  for(const s of marks){
    occurrences[s]=[];for(let o=r.raw.indexOf(s);o>=0;o=r.raw.indexOf(s,o+1))occurrences[s].push(o);
  }
  result[id]={file,sha256:r.sha256,bytes:r.bytes,format:r.format,arch:r.arch,cl,client_secrets_sha256_only:secretRecords,occurrences};
}
for(const file of fs.readdirSync(root+'v2').filter(f=>f.endsWith('.disasm.txt'))){
  const p=root+'v2/'+file;let text=fs.readFileSync(p,'utf8');
  for(const secret of secrets)text=text.replaceAll(secret,'[CLIENT_SECRET_REDACTED]');
  // Remove any adjacent rodata preview whose exact secret boundary was not decoded.
  text=text.replace(/GOCSPX-[^"\r\n]*/g,'[CLIENT_SECRET_REDACTED]');
  fs.writeFileSync(p,text);
}
fs.writeFileSync(root+'v2/native-constants.json',JSON.stringify(result,null,2)+'\n');
for(const [id,r]of Object.entries(result))console.log(JSON.stringify({sample:id,cl:r.cl.value,clOffset:r.cl.offset,clDataOffset:r.cl.dataOffset,secretHashes:r.client_secrets_sha256_only.map(s=>s.sha256),occurrences:r.occurrences}));
