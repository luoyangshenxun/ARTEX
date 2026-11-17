import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='site/antigravity/analysis/',out=root+'v2/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const records=[];
for(const [id,file,url,needle] of [
  ['download-page','download-page.html','https://antigravity.google/download','windows-x64/Antigravity-x64.exe'],
  ['refresh-scope-standard','rfc6749.txt','https://www.rfc-editor.org/rfc/rfc6749.txt','The requested scope MUST NOT include any scope'],
  ['gemini-cli-stable','gemini-cli-latest-release.json','https://api.github.com/repos/google-gemini/gemini-cli/releases/latest','\"tag_name\"']
]){
  const b=fs.readFileSync(out+file),offset=b.indexOf(needle);
  if(offset<0)throw Error(id+' missing');
  records.push({id,url,local_snapshot:file,observed_date:'2026-11-17',bytes:b.length,sha256:sha(b),offset,
    ...(id==='refresh-scope-standard'?{section:'6',lines:[2597,2602],conclusion:'Refresh scopes cannot exceed the original grant; additional scope requires an authorization grant.'}:{}),
    ...(id==='gemini-cli-stable'?(()=>{const j=JSON.parse(b);return {tag_name:j.tag_name,published_at:j.published_at,prerelease:j.prerelease,release_url:j.html_url}})():{})
  });
}
for(const [id,file]of [
  ['W1','unpacked/windows-app-2.32.1/resources/app-update.yml'],
  ['M1','unpacked/macos-app-2.32.1/Antigravity.app/Contents/Resources/app-update.yml']
]){
  const b=fs.readFileSync(root+file);
  records.push({id:'updater-'+id,sample:id,file,offset:0,bytes:b.length,sha256:sha(b),content:b.toString('utf8')});
}
fs.writeFileSync(out+'external-references.json',JSON.stringify({records},null,2)+'\n');
console.log(JSON.stringify({references:records.length}));
