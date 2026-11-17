import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
export function validateProfile(input){
  const rules=JSON.parse(fs.readFileSync(path.join(dir,'fingerprint-rules.json')));
  const versions=JSON.parse(fs.readFileSync(path.join(dir,'version-map.json')));
  const problems=[];
  if(input.identification_headers_overridden===true)return{verdict:'unknown',
    problems:['custom identification headers are outside the default native-build tuple domain'],scope:rules.scope};
  const required=['cli_version','sdk_version','runtime','runtime_version_reported','os','arch'];
  for(const field of required)if(typeof input[field]!=='string'||!input[field])
    problems.push(`missing ${field}`);
  if(problems.length)return{verdict:'unknown',problems,scope:rules.scope};
  if(!rules.platform.published_pairs.some(([os,arch])=>input.os===os&&input.arch===arch))
    problems.push('OS/Arch pair not among this release family native packages');
  if(input.runtime!=='node')problems.push('embedded Bun matches SDK node branch');
  if(problems.length)return{verdict:'contradiction',problems,scope:rules.scope};
  let rows=versions.filter(v=>v.cli_version===input.cli_version
    &&v.os_values.includes(input.os)&&v.arch_values.includes(input.arch));
  if(input.binary_sha256)rows=rows.filter(v=>v.binary_sha256===input.binary_sha256);
  if(!rows.length)return{verdict:'unknown',problems:['exact platform/build tuple not sampled'],scope:rules.scope};
  const fields=['sdk_version','runtime_version_reported','bun_version','bun_revision','binary_sha256'];
  const match=rows.find(row=>fields.every(field=>input[field]===undefined||input[field]===row[field]));
  if(!match){
    for(const field of fields)if(input[field]!==undefined&&!rows.some(row=>row[field]===input[field]))
      problems.push(`${field} differs from sampled build`);
    if(!problems.length)problems.push('individual values occur but not in one sampled tuple');
    return{verdict:'contradiction',problems,samples:rows.map(r=>r.sample),scope:rules.scope};
  }
  return{verdict:'static-coherent',sample:match.sample,evidence:match.evidence,
    warnings:['Official runtime not executed; runtime version is inferred from native compatibility constant',
      'UA/billing/betas/account/session/TLS require their own contextual evidence'],
    scope:rules.scope};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=process.argv[2];
  if(!file)throw Error('usage: node validate-profile.mjs PROFILE.json');
  const result=validateProfile(JSON.parse(fs.readFileSync(path.resolve(file))));
  console.log(JSON.stringify(result,null,2));
  if(result.verdict==='contradiction')process.exitCode=2;
}
