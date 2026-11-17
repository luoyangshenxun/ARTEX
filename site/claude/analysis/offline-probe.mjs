// Run with the independently acquired Bun tool. Never launches/imports Claude.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import vm from 'node:vm';
import {parse} from './tools/acorn-8.15.0/package/dist/acorn.mjs';
import {dir, source, walk} from './source-lib.mjs';

if (typeof Bun === 'undefined') throw new Error('Run this probe under Bun, not Node.');
const used = [];
function take(index, names) {
  const {module, text} = source('S1', index);
  const ast = parse(text, {ecmaVersion: 'latest', sourceType: 'module'});
  const nodes = [];
  walk(ast, (node, ancestors) => {
    if (!names.includes(node.id?.name ?? node.key?.name)) return;
    if (node.type !== 'MethodDefinition' && ancestors.some(a => /Function/.test(a.type))) return;
    if (!['VariableDeclarator', 'FunctionDeclaration', 'MethodDefinition'].includes(node.type)) return;
    nodes.push(node);
  });
  for (const name of names) assert(nodes.some(n => (n.id?.name ?? n.key?.name) === name), name);
  return nodes.map(node => {
    const code = text.slice(node.start, node.end);
    used.push({module: module.modulePath, symbol: node.id?.name ?? node.key?.name,
      start: node.start, end: node.end, binaryOffset: module.contentsOffset + node.start,
      sha256: crypto.createHash('sha256').update(code).digest('hex')});
    if (node.type === 'VariableDeclarator') return `var ${code};`;
    if (node.type === 'MethodDefinition') return `var ${node.key.name} = (class { ${code} }).prototype.${node.key.name};`;
    return code;
  }).join('\n');
}
const sdkSlice = take(285, ['b0', 'se', 'ae', 'ce', 'H', 'L', 'CGr']);
const sdk = new Function(`${sdkSlice}; var U; return {se, ae, L, H, CGr};`)();
const properties = sdk.ae();
assert.equal(properties['X-Stainless-Runtime'], 'node');
assert.equal(properties['X-Stainless-Runtime-Version'], process.version);

const osInputs = ['darwin','win32','linux','android','freebsd','openbsd','ios','ios-simulator','sunos','unknown',''];
const archInputs = ['x32','x86_64','x64','arm','aarch64','arm64','ia32','riscv64','unknown',''];
const platformDomains = {os: osInputs.map(input => ({input, output: sdk.L(input)})),
  arch: archInputs.map(input => ({input, output: sdk.H(input)}))};
const contexts = [
  {name:'Deno wins over Edge and process', globals:{Deno:{build:{os:'linux',arch:'aarch64'},version:{deno:'2.synthetic'}},EdgeRuntime:'edge.synthetic',process}},
  {name:'Edge wins over process', globals:{EdgeRuntime:'edge.synthetic',process}},
  {name:'Bun process branch', globals:{process}},
  {name:'unknown globals', globals:{}},
];
const branchResults = contexts.map(({name,globals}) => ({name,
  result: vm.runInNewContext(`${sdkSlice}; var U; ae()`, globals)}));
assert.equal(branchResults[0].result['X-Stainless-Runtime'], 'deno');
assert.equal(branchResults[1].result['X-Stainless-Runtime'], 'edge');
assert.equal(branchResults[2].result['X-Stainless-Runtime'], 'node');

const billingSlice = take(464, ['F', 'j', 'T$s']);
const billing = new Function('D', `${billingSlice}; return {select:j,fp:T$s};`)(crypto.createHash);
const cliSlice=take(205,['FW','sJs','Vc','oJs','K5','W5']);
let fixture={entry:'cli',provider:'firstParty',workload:undefined,interactive:true};
const cli=new Function('i','process','O6','Ol','ke','bI','EI','Ni','tC','lo','Nue','$5','Es','i3','SI','gSn','t',
  `${cliSlice}; return {ua:FW,billing:sJs};`)(
  {},{env:{}},()=>fixture.override,()=>fixture.workload,()=>fixture.provider,
  ()=>false,()=>false,()=>true,n=>Boolean(n?.session),()=>undefined,
  ()=>undefined,()=>false,()=>false,u=>u.hostname,()=>true,()=>fixture.dispatch,()=>{});
// i/process are fixtures so the host's real environment never influences these cases.
// Supply entry explicitly through the same override function used by production.
fixture.override='cli';
const inputs = ['Hello, Claude Code!', '', 'abcd😀ghijklmnopqrstu中'];
const billingExamples = inputs.map(input => ({input,cli_version:'2.1.325',
  indices_zero_based:[4,7,20], code_units:[4,7,20].map(i=>input[i]??'0'),
  fingerprint:billing.fp(input,'2.1.325'),
  minimal_header:cli.billing(billing.fp(input,'2.1.325'))}));
const entrypointExamples=[];
for(const entry of ['cli','sdk-cli','local-agent','claude-desktop-3p']){
  fixture.override=entry;
  fixture.workload=entry==='cli'?'cron':undefined;
  entrypointExamples.push({entry,ua:cli.ua(),billing:cli.billing('abc')});
  assert(cli.ua().includes(`external, ${entry}`));
  assert(cli.billing('abc').includes(`cc_entrypoint=${entry};`));
}
fixture.override='cli';fixture.workload=undefined;fixture.dispatch='fixture';
const extendedBilling=cli.billing('abc',{session:true,isMainSession:false},'req_TEST',
  '00000000-0000-4000-8000-000000000001','user',{promptIndex:0,turnIndex:1},
  {responseBeforeCompaction:{messageId:'msg_TEST',turnPosition:{promptIndex:2,turnIndex:3}}});
assert(extendedBilling.includes('cc_is_subagent=true;'));
assert(extendedBilling.endsWith('cc_dispatch_entrypoint=fixture;'));
assert.equal(billing.select([{type:'user',isMeta:true,message:{content:'skip'}},
  {type:'user',message:{content:[{type:'image'},{type:'text',text:'chosen'}]}}]),'chosen');

const identitySlice=take(464,['Cqe','B','L','k']);
const metadataEnv={CLAUDE_CODE_EXTRA_METADATA:JSON.stringify({extra:'fixture',
  device_id:'cannot-override',nested:{excluded:true},tk:'reserved'})};
const identityDeps={process:{env:metadataEnv},rt:JSON.parse,t:()=>{},SD:()=>undefined,
  Pe:Boolean,i:{},zn:()=>false,x9e:()=>undefined,hD:()=> '0'.repeat(64),
  dT:()=>({accountUuid:'00000000-0000-4000-8000-000000000002'}),hn:()=>undefined,
  G:()=> '00000000-0000-4000-8000-000000000001',_:JSON.stringify};
const metadataBuilder=new Function(...Object.keys(identityDeps),
  `${identitySlice}; return Cqe;`)(...Object.values(identityDeps));
const metadata=metadataBuilder(),decodedMetadata=JSON.parse(metadata.user_id);
assert.equal(decodedMetadata.device_id,'0'.repeat(64));
assert.equal(decodedMetadata.extra,'fixture');assert(!('nested'in decodedMetadata));assert(!('tk'in decodedMetadata));
metadataEnv.CLAUDE_CODE_EXTRA_METADATA=JSON.stringify({extra:'x'.repeat(600)});
const oversizedMetadata=JSON.parse(metadataBuilder().user_id);
assert(!('extra'in oversizedMetadata));
const systemSlice=take(464,['T','v','U','XNr']);
const systemPrefix=new Function('ke',`${systemSlice}; return XNr;`)(()=>fixture.provider);
const systemExamples=[{}, {isNonInteractive:true}, {isNonInteractive:true,hasAppendSystemPrompt:true},
  {recorded:'synthetic recorded prefix'}].map(input=>({provider:fixture.provider,input,output:systemPrefix(input)}));
fixture.provider='vertex';
systemExamples.push({provider:fixture.provider,input:{isNonInteractive:true},output:systemPrefix({isNonInteractive:true})});
fixture.provider='firstParty';
const headerSlice = take(321, ['r_', 'Os', 'o_', 's_', 'T', 'buildHeaders',
  'authHeaders','apiKeyAuth','bearerAuth','getUserAgent']);
const headerApi = new Function('CGr','b0', `${headerSlice}; var Uu=Symbol(),Ca=Array.isArray;
  return {T,buildHeaders,authHeaders,apiKeyAuth,bearerAuth,getUserAgent};`)(sdk.CGr,properties['X-Stainless-Package-Version']);
const endpointsSlice=take(321,['Ei','Bc','Ls','Za','qr','$n']);
const endpointDeps={X:class{constructor(client){this._client=client}},ho:class{},kl:class{},by:Error,
  Uc:{},my:[],ci:{},Wr:Error,T:headerApi.T};
const SDKMessages=new Function(...Object.keys(endpointDeps),
  `${endpointsSlice}; return Ei;`)(...Object.values(endpointDeps));
const defaultHeaders = {'x-app':'cli','User-Agent':'claude-cli/2.1.325 (external, cli)',
  'X-Claude-Code-Session-Id':'00000000-0000-4000-8000-000000000001'};
const authModes = {oauth:{Authorization:'Bearer SYNTHETIC_OFFLINE'},
  api_key:{'X-Api-Key':'SYNTHETIC_OFFLINE'}};
const requests = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(new URL(url).hostname, 'offline.invalid');
  requests.push({url, method:options.method, headers:[...options.headers],
    body:JSON.parse(options.body)});
  return new Response('{"type":"message","content":[]}', {headers:{'content-type':'application/json'}});
};
for (const [auth, authHeaders] of Object.entries(authModes)) {
  const receiver = {_options:{dangerouslyAllowBrowser:true,defaultHeaders},_authState:{},
    getUserAgent:headerApi.getUserAgent,authHeaders:headerApi.authHeaders,
    apiKeyAuth:headerApi.apiKeyAuth,bearerAuth:headerApi.bearerAuth,
    apiKey:auth==='api_key'?'SYNTHETIC_OFFLINE':null,
    authToken:auth==='oauth'?'SYNTHETIC_OFFLINE':null,validateHeaders:()=>{}};
  receiver._options.timeout=600000;
  receiver.post=async(url,options)=>{
    const headers=await headerApi.buildHeaders.call(receiver,{options:{timeout:options.timeout??600000,
      headers:options.headers},method:'POST',bodyHeaders:{'Content-Type':'application/json'},retryCount:0});
    return fetch(`https://offline.invalid${url}`,{method:'POST',headers,body:JSON.stringify(options.body)});
  };
  const endpoint=new SDKMessages(receiver);
  for (const stream of [false,true]) {
    await endpoint.create({model:'synthetic-model',max_tokens:1,messages:[{role:'user',content:'test'}],
      stream,betas:['claude-code-20250219'],metadata,
      system:[{type:'text',text:billingExamples[0].minimal_header},{type:'text',text:systemExamples[0].output}]},
      {headers:stream?{'x-stainless-helper-method':'stream'}:{}});
    requests.at(-1).auth=auth;
    const headers=new Headers(requests.at(-1).headers);
    assert.equal(headers.get('Accept'),'application/json');
    assert.equal(headers.get('X-Stainless-Runtime-Version'),process.version);
    assert(!('betas'in requests.at(-1).body));
  }
}
const endpointExamples=[];
const endpoint=new SDKMessages({post:(url,options)=>{
  const item={url,body:options.body,headers:[...options.headers.values]};
  endpointExamples.push(item);return item;
}});
endpoint.countTokens({model:'synthetic-model',messages:[{role:'user',content:'test'}],
  betas:['claude-code-20250219','oauth-2025-04-20']});
assert.equal(new Headers(endpointExamples[0].headers).get('anthropic-beta'),
  'claude-code-20250219,oauth-2025-04-20,token-counting-2024-11-01');
// Separate local-only real fetch captures wire order/casing; no external network.
let resolveWire;
const wirePromise = new Promise(resolve => resolveWire=resolve);
const server = net.createServer(socket => {
  let received='';
  socket.on('data', bytes => {
    received+=bytes.toString('latin1');
    if (!received.includes('\r\n\r\n')) return;
    resolveWire(received.slice(0,received.indexOf('\r\n\r\n')+4));
    socket.end('HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}');
  });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const wireHeaders = new Headers([['Z-Last','z'],['X-App','cli'],['A-First','a'],['User-Agent','synthetic-probe']]);
const iteration=[...wireHeaders];
await originalFetch(`http://127.0.0.1:${server.address().port}/wire`,{method:'POST',headers:wireHeaders,body:'{}',proxy:null});
const wire=await wirePromise;
await new Promise(resolve=>server.close(resolve));
let resolveSDKWire;
const sdkWirePromise=new Promise(resolve=>resolveSDKWire=resolve);
const sdkServer=net.createServer(socket=>{
  let data='';
  socket.on('data',bytes=>{
    data+=bytes.toString('latin1');
    if(!data.includes('\r\n\r\n'))return;
    resolveSDKWire(data.slice(0,data.indexOf('\r\n\r\n')+4));
    socket.end('HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}');
  });
});
await new Promise(resolve=>sdkServer.listen(0,'127.0.0.1',resolve));
await originalFetch(`http://127.0.0.1:${sdkServer.address().port}/sdk-wire`,
  {method:'POST',headers:new Headers(requests[1].headers),body:'{}',proxy:null});
const sdkWire=await sdkWirePromise;
await new Promise(resolve=>sdkServer.close(resolve));
const output={runtime:{bun_version:Bun.version,bun_revision:Bun.revision,process_version:process.version,
  platform:process.platform,arch:process.arch,process_tag:Object.prototype.toString.call(process)},
  properties,platformDomains,branchResults,billingExamples,entrypointExamples,extendedBilling,
  metadata,oversizedMetadata,systemExamples,endpointExamples,requests,
  wireProbe:{input:[['Z-Last','z'],['X-App','cli'],['A-First','a'],['User-Agent','synthetic-probe']],
    iteration,raw:wire,sdk_raw:sdkWire,protocol:'HTTP/1.1',
    scope:'independent Bun tool, loopback HTTP; not Claude TLS'},
  used,officialBinaryExecuted:false,anthropicRequests:0};
const outputFile = path.join(dir,`offline-results-bun-${Bun.version}.json`);
fs.writeFileSync(outputFile,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({output:outputFile,runtime:output.runtime,properties,
  fingerprints:billingExamples.map(e=>e.fingerprint),requests:requests.length,wire,passed:true}));
