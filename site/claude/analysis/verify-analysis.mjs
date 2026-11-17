// Meaningful evidence checks. Works on a source-only checkout; verifies bytes too when samples exist.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateProfile} from './validate-profile.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const checks=[];
const record=(name,data)=>{checks.push({name,...data});console.log(`${name}=${JSON.stringify(data)}`);};
const manifest=read('analysis-manifest.json'),evidence=read('evidence-index.json');
const versions=read('version-map.json'),samples=read('sample-provenance.json');
assert.equal(manifest.status,'static-analysis-complete-with-runtime-boundaries');
for(const name of manifest.deliverables){
  const bytes=fs.readFileSync(path.join(dir,name));
  new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(name.endsWith('.md'))assert(!bytes.includes(Buffer.from('[待填]')),name);
  else JSON.parse(bytes);
}
record('REPORTS',{reopened:manifest.deliverables.length,status:'PASS'});

const groups=new Map;
for(const [id,e]of Object.entries(evidence.entries)){
  assert(samples.some(s=>s.id===e.sample),`${id}: sample`);
  assert(evidence.levels.includes(e.evidence_level),`${id}: level`);
  assert(/^[0-9a-f]{64}$/.test(e.span_sha256),`${id}: sha`);
  assert(e.module_end>e.module_offset,`${id}: range`);
  if(!groups.has(e.sample))groups.set(e.sample,[]);
  groups.get(e.sample).push([id,e]);
}
let originalByteSpans=0,originalBinaries=0,packagedSources=0,missingSamples=0;
for(const [sampleId,entries]of groups){
  const sample=samples.find(s=>s.id===sampleId);
  if(sample.binary){
    const file=path.join(dir,sample.binary);
    if(!fs.existsSync(file)){missingSamples++;continue;}
    const binary=fs.readFileSync(file);
    assert.equal(sha(binary),sample.binarySha256,`${sampleId}: binary SHA256`);
    originalBinaries++;
    for(const [id,e]of entries){
      assert(e.binary_offset>=0&&e.binary_offset+e.byte_length<=binary.length,id);
      const span=binary.subarray(e.binary_offset,e.binary_offset+e.byte_length);
      assert.equal(sha(span),e.span_sha256,`${id}: original byte span`);
      const text=span.toString(e.source_encoding);
      assert(text.startsWith(e.excerpt),`${id}: excerpt`);
      if(e.native_constants)for(const c of Object.values(e.native_constants))
        assert.equal(binary.subarray(c.binary_offset,c.binary_offset+c.value.length).toString('latin1'),c.value,id);
      originalByteSpans++;
    }
  }else for(const [id,e]of entries){
    if(!e.local_source)continue;
    const file=path.join(dir,e.local_source);
    if(!fs.existsSync(file)){missingSamples++;continue;}
    const bytes=fs.readFileSync(file);
    assert.equal(sha(bytes),e.module_sha256,`${id}: packaged file sha`);
    const selected=bytes.subarray(e.byte_offset,e.byte_offset+e.byte_length);
    assert.equal(sha(selected),e.span_sha256,`${id}: file span`);
    assert(selected.toString('utf8').startsWith(e.excerpt),id);
    packagedSources++;
  }
}
record('EVIDENCE',{entries:Object.keys(evidence.entries).length,originalByteSpans,
  originalBinaries,packagedSources,missingSamples,mode:missingSamples?'source-checkout':'original-artifact-byte-check',status:'PASS'});

for(const s of samples){
  assert(s.integrityVerified,`${s.id} integrity`);
  assert.match(s.archiveSha256,/^[0-9a-f]{64}$/);
  assert.equal(s.officialBinaryExecuted,false);
  assert.equal(s.lifecycleScriptsExecuted,false);
}
for(const v of versions){
  for(const field of ['cli_version','sdk_version','bun_version','runtime_version_reported'])
    assert.equal(typeof v[field],'string',`${v.sample}: ${field}`);
  assert(v.os_values.length&&v.arch_values.length);
  assert(v.runtime_value_evidence.startsWith('inference:'));
  assert(evidence.entries[v.evidence]);
}
const sampledDarwin=versions.filter(v=>v.platform==='darwin-arm64');
assert.equal(sampledDarwin[0].cli_version,'2.1.258');
assert.equal(sampledDarwin.at(-1).cli_version,'2.1.326');
for(let i=1;i<sampledDarwin.length;i++)
  assert(Number(sampledDarwin[i].cli_version.split('.').at(-1))-Number(sampledDarwin[i-1].cli_version.split('.').at(-1))<=10);
const transitions=read('version-transitions.json');
assert.equal(transitions.length,5);
for(const t of transitions){
  assert.equal(Number(t.after.cli_version.split('.').at(-1))-Number(t.before.cli_version.split('.').at(-1)),1);
  assert(versions.some(v=>v.sample===t.before.sample&&v[t.field]===t.before.value));
  assert(versions.some(v=>v.sample===t.after.sample&&v[t.field]===t.after.value));
}
record('VERSION_COVERAGE',{nativeRows:versions.length,preciseAdjacentTransitions:transitions.length,
  first:sampledDarwin[0].cli_version,last:sampledDarwin.at(-1).cli_version,status:'PASS'});

const linux={cli_version:'2.1.325',sdk_version:'0.128.0',bun_version:'1.4.4',bun_revision:'6634fc3b5',
  runtime:'node',runtime_version_reported:'v26.12.1',os:'Linux',arch:'arm64'};
const coherent=validateProfile(linux);
assert.equal(coherent.verdict,'static-coherent');
const wrongSDK=validateProfile({...linux,sdk_version:'0.94.0',runtime_version_reported:'v24.3.0'});
assert.equal(wrongSDK.verdict,'contradiction');
assert.equal(validateProfile({...linux,os:'MacOS',arch:'x32'}).verdict,'contradiction');
assert.equal(validateProfile({...linux,cli_version:'2.1.999'}).verdict,'unknown');
assert.equal(validateProfile({...linux,sdk_version:'0.94.0',
  identification_headers_overridden:true}).verdict,'unknown');
const currentSubway=validateProfile({...linux,cli_version:'2.1.326',
  sdk_version:'0.94.0',runtime_version_reported:'v24.3.0'});
assert.equal(currentSubway.verdict,'contradiction');
assert.equal(validateProfile({...linux,cli_version:'2.1.280',os:'MacOS',sdk_version:'0.112.1',
  bun_version:'1.4.3',bun_revision:undefined,runtime_version_reported:'v26.3.0'}).verdict,'static-coherent');
record('PROFILE_COHERENCE',{coherent,wrongSDK,currentSubway,status:'PASS'});

for(const version of ['1.4.1','1.4.3','1.4.4']){
  const p=read(`offline-results-bun-${version}.json`);
  assert.equal(p.runtime.bun_version,version);
  assert.equal(p.properties['X-Stainless-Runtime'],'node');
  assert.equal(p.properties['X-Stainless-Runtime-Version'],p.runtime.process_version);
  assert.equal(p.officialBinaryExecuted,false);assert.equal(p.anthropicRequests,0);
  for(const [i,example]of p.billingExamples.entries()){
    const codeUnits=[4,7,20].map(index=>example.input[index]||'0').join('');
    const expected=crypto.createHash('sha256').update('59cf53e54c78'+codeUnits+example.cli_version).digest('hex').slice(0,3);
    assert.equal(example.fingerprint,expected);
    assert.equal(example.fingerprint,['b5b','ff3','cac'][i]);
    assert.equal(example.minimal_header,`x-anthropic-billing-header: cc_version=2.1.325.${expected}; cc_entrypoint=cli; cch=00000;`);
  }
  assert.equal(p.requests.length,4);
  for(const req of p.requests){
    assert.equal(new URL(req.url).hostname,'offline.invalid');
    const h=new Map(req.headers.map(([k,v])=>[k.toLowerCase(),v]));
    assert.equal(h.get('accept'),'application/json');
    assert.equal(h.get('x-stainless-package-version'),'0.128.0');
    assert.equal(h.get('x-stainless-helper-method'),req.body.stream?'stream':undefined);
    assert.equal(h.has('authorization'),req.auth==='oauth');
    assert.equal(h.has('x-api-key'),req.auth==='api_key');
    assert(!('betas'in req.body),'SDK moved betas to header');
    assert.equal(req.body.metadata.user_id,p.metadata.user_id);
    assert.equal(req.body.system[0].text,p.billingExamples[0].minimal_header);
  }
  const metadata=JSON.parse(p.metadata.user_id);
  assert.equal(metadata.device_id,'0'.repeat(64));
  assert.equal(metadata.extra,'fixture');
  assert(!('tk'in metadata));assert(!('nested'in metadata));
  assert(!('extra'in p.oversizedMetadata));
  assert.equal(p.systemExamples.length,5);
  assert.equal(new Headers(p.endpointExamples[0].headers).get('anthropic-beta'),
    'claude-code-20250219,oauth-2025-04-20,token-counting-2024-11-01');
  assert(p.wireProbe.raw.includes('\r\nA-First: a\r\nUser-Agent: synthetic-probe\r\nX-App: cli\r\nZ-Last: z\r\n'));
  assert(p.wireProbe.sdk_raw.includes('\r\nx-stainless-runtime: node\r\n'));
  assert(p.wireProbe.sdk_raw.includes('\r\nx-stainless-helper-method: stream\r\n'));
  for(const ex of p.entrypointExamples){
    assert(ex.ua.includes(`external, ${ex.entry}`));
    assert(ex.billing.includes(`cc_entrypoint=${ex.entry};`));
  }
  record(`BUN_${version}`,{revision:p.runtime.bun_revision,node:p.runtime.process_version,
    fingerprintExamples:p.billingExamples.map(e=>e.fingerprint),fetchInterceptions:p.requests.length,loopbackCaptures:2,status:'PASS'});
}
const matrix=read('beta-conditional-matrix.json');
assert.equal(matrix.rows.length,128);assert.equal(matrix.count_tokens.length,8);
const keys=matrix.rows.map(r=>[r.family,r.auth,r.interactive,r.stream,r.tools,r.thinking].join(':'));
assert.equal(new Set(keys).size,128);
for(const r of matrix.rows){
  assert.equal(new Set(r.tokens).size,r.tokens.length);
  assert.equal(r.tokens.join(','),r.header);
  assert(!r.tokens.includes('mid-conversation-output-config-2026-07-01'));
  assert.equal(r.tokens.includes('oauth-2025-04-20'),r.auth==='oauth');
  assert.equal(r.tokens.includes('thinking-binding-controls-2026-08-01'),r.thinking);
  const equivalent=matrix.rows.filter(s=>s.family===r.family&&s.auth===r.auth
    &&s.interactive===r.interactive&&s.thinking===r.thinking);
  assert(equivalent.every(s=>s.header===r.header),'stream/tools fixture independence');
}
for(const r of matrix.count_tokens){
  assert.equal(r.tokens.at(-1),'token-counting-2024-11-01');
  assert.equal(r.tokens.includes('claude-code-20250219'),r.family!=='haiku');
  assert.equal(r.tokens.includes('oauth-2025-04-20'),r.auth==='oauth');
}
record('BETA_MATRIX',{messages:matrix.rows.length,count_tokens:matrix.count_tokens.length,
  controlled_context:true,production_unique:false,status:'PASS'});
const old=evidence.entries['METADATA-HISTORY-2.1.77'],next=evidence.entries['METADATA-HISTORY-2.1.78'];
assert(old.excerpt.includes('user_${'));assert(next.excerpt.includes('device_id:'));
assert(!next.excerpt.includes('user_${'));
record('METADATA_TRANSITION',{before:'2.1.77 legacy',after:'2.1.78 JSON',adjacent:true,status:'PASS'});

const output={schema_version:2,date:new Date().toISOString(),command:`node ${path.join(dir,'verify-analysis.mjs')}`,
  cwd:path.resolve(dir,'../../..'),checks,result:'PASS',official_claude_executed:false,anthropic_api_requests:0};
fs.writeFileSync(path.join(dir,'workspace-verification.json'),JSON.stringify(output,null,2)+'\n');
console.log('ANALYSIS_VERIFICATION=PASS');
