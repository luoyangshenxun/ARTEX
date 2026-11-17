import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve('site/antigravity/analysis'),out=path.join(root,'v2');
const read=p=>JSON.parse(fs.readFileSync(path.join(out,p),'utf8'));
const sha=(b,alg='sha256')=>createHash(alg).update(b).digest('hex');
const results=[],cache=new Map();
function bytes(file){const p=path.resolve(file);if(!cache.has(p))cache.set(p,fs.readFileSync(p));return cache.get(p)}
function passed(name,details){results.push({name,pass:true,...details})}
const {samples}=read('samples.json');
for(const id of ['W1','M1','C1','M2']){
  const s=samples[id],p=id==='M2'?JSON.parse(fs.readFileSync(path.join(root,'macos/download-provenance.json'),'utf8')):read(id+'-provenance.json');
  const b=bytes(p.file??p.sample);
  assert.equal(b.length,s.bytes,id+' installer size');
  assert.equal(sha(b),s.sha256,id+' installer SHA256');
  const n=bytes(path.join(root,s.native.file));
  assert.equal(n.length,s.native.bytes,id+' native size');
  assert.equal(sha(n),s.native.sha256,id+' native SHA256');
  assert.equal(n.subarray(s.native.cl.dataOffset,s.native.cl.dataOffset+10).toString(),s.native.cl.value);
  if(s.sha512_hex)assert.equal(sha(b,'sha512'),s.sha512_hex);
  if(id==='W1'||id==='M1'){
    const yml=fs.readFileSync(path.join(out,id==='W1'?'latest-x64-win.yml':'latest-arm64-mac.yml'),'utf8');
    assert(yml.includes(s.url));assert.equal(Buffer.from(sha(b,'sha512'),'hex').toString('base64'),yml.match(/sha512: (\S+)/)[1]);
  }
  if(id==='C1'){
    const m=JSON.parse(fs.readFileSync(path.join(root,'cli-manifest-windows-amd64.json'),'utf8'));
    assert.equal(sha(b,'sha512'),m.sha512);assert.equal(s.url,m.url);
  }
  passed('sample_'+id,{installer_sha256:s.sha256,native_sha256:s.native.sha256,cl:s.native.cl.value});
}
const {evidence}=read('evidence-catalog.json'),ids=new Set();
for(const e of evidence){
  assert(!ids.has(e.id),'duplicate evidence');ids.add(e.id);
  const b=bytes(path.join(root,e.file));
  assert(e.offset>=0&&e.offset+e.bytes<=b.length,e.id+' bounds');
  if(e.sha256)assert.equal(sha(b.subarray(e.offset,e.offset+e.bytes)),e.sha256,e.id+' region SHA256');
  for(const o of e.instruction_offsets??[])assert(o>=e.offset&&o<e.offset+e.bytes,e.id+' instruction bounds');
  for(const l of e.locations??[])assert(l.offset>=0&&b.subarray(l.offset,l.offset+Buffer.byteLength(l.needle)).toString()===l.needle,e.id+' source location');
}
passed('evidence_regions',{count:evidence.length});
const m=read('M1-schemas.json'),w=read('W1-schemas.json');
assert.equal(m.schemas.length,5);
for(const s of m.schemas)assert.equal(w.schemas.find(x=>x.file===s.file)?.sha256,s.sha256,s.file+' cross-platform descriptor');
const metadata=m.schemas.flatMap(x=>x.messages).find(x=>x.name==='ClientMetadata');
assert.equal(metadata.enums.find(x=>x.name==='Platform').values.find(x=>x.name==='WINDOWS_AMD64').number,5);
assert.equal(metadata.enums.find(x=>x.name==='PluginType').values.find(x=>x.name==='PLUGIN_UNSPECIFIED').number,0);
const credits=m.schemas.flatMap(x=>x.messages).find(x=>x.name==='Credits');
assert.equal(credits.enums[0].values.find(x=>x.name==='GOOGLE_ONE_AI').number,1);
passed('protobuf_descriptors',{matched:5});
const p=read('antigravity-hub-profiles.json');
assert.equal(p.profiles.length,2);
for(const x of p.profiles){
  for(const k of ['app_version','cl','os_type','arch','ua','metadata_platform','ide_name','ide_version','endpoints','oauth','headers'])assert(k in x,k+' missing');
  assert.equal(x.cl,'1021296516');assert(x.ua.includes(`os_type=${x.os_type}; arch=${x.arch}; cl=${x.cl}`));
  assert.equal(x.metadata_platform_emitted,false);assert.equal(x.metadata_platform,0);
  assert.deepEqual(x.requests.loadCodeAssist.metadata,{ideType:'ANTIGRAVITY'});
  assert.deepEqual(x.requests.onboardUser.metadata,{ideType:'ANTIGRAVITY'});
  assert.equal(x.requests.generation.userPromptId.emitted,false);
  assert.equal(x.oauth.scopes.length,6);assert(x.oauth.scopes.includes('https://www.googleapis.com/auth/aicode'));
  assert.equal(x.oauth.pkce,'S256');assert.equal(x.oauth.redirect,'http://localhost:<PORT>/auth/callback');
  assert.equal(x.ready_as_unconditional_constants,false);assert.equal(x.runtime_capture,false);
  for(const ref of x.evidence_refs)assert(ids.has(ref),'unknown ref '+ref);
}
passed('profiles',{count:2,unconditional_constants:false});
const files=new Set([
  ...execFileSync('git',['ls-files','--others','--exclude-standard','--','site/antigravity'],{encoding:'utf8'}).trim().split(/\r?\n/),
  ...execFileSync('git',['diff','--name-only','--','site/antigravity'],{encoding:'utf8'}).trim().split(/\r?\n/)
].filter(Boolean));
let jsonCount=0;
for(const f of files){
  if(!fs.statSync(f).isFile())continue;
  assert(!/\.(exe|zip|dmg|7z|asar|dll)$/i.test(f),'binary entered publishable set '+f);
  const b=fs.readFileSync(f),text=b.toString('utf8');
  assert(!/GOCSPX-[A-Za-z0-9_-]{28}/.test(text),'plaintext secret '+f);
  assert(Buffer.from(text,'utf8').equals(b),'invalid UTF-8 '+f);
  if(f.endsWith('.json')){JSON.parse(text);jsonCount++;}
  // Transaction snapshots preserve the original bytes, including links whose
  // base directory is the live report's directory rather than transaction/.
  if(f.endsWith('.md')&&!f.includes('/transaction/'))for(const hit of text.matchAll(/\]\(([^)]+)\)/g)){
    const target=hit[1];
    if(/^(https?:|#)/.test(target))continue;
    assert(fs.existsSync(path.resolve(path.dirname(f),target.split('#')[0])),'broken local link '+f+' -> '+target);
  }
}
passed('publication_files',{count:files.size,json_files:jsonCount,plaintext_secret_found:false,binaries_found:false});
console.log(JSON.stringify({pass:true,official_client_executed:false,checks:results},null,2));
