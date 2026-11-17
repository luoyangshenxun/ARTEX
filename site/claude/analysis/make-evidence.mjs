import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parse} from './tools/acorn-8.15.0/package/dist/acorn.mjs';
import {dir,graphs,source,walk} from './source-lib.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const all=graphs(), entries={}, cache=new Map;
function nativeFormat(bytes){
  if(bytes.readUInt32LE(0)===0xfeedfacf){
    const cpu=bytes.readUInt32LE(4);
    return{format:'Mach-O 64 little-endian',os:'MacOS',arch:cpu===0x100000c?'arm64':cpu===0x1000007?'x64':`cpu:${cpu}`,cpu_type:cpu,header_offset:0};
  }
  if(bytes.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))){
    assert.equal(bytes[4],2);assert.equal(bytes[5],1);
    const machine=bytes.readUInt16LE(18);
    return{format:'ELF64 little-endian',os:'Linux',arch:machine===183?'arm64':machine===62?'x64':`machine:${machine}`,machine,header_offset:0};
  }
  if(bytes.readUInt16LE(0)===0x5a4d){
    const pe=bytes.readUInt32LE(0x3c);assert.equal(bytes.readUInt32LE(pe),0x4550);
    const machine=bytes.readUInt16LE(pe+4);
    return{format:'PE',os:'Windows',arch:machine===0x8664?'x64':machine===0xaa64?'arm64':`machine:${machine}`,machine,header_offset:pe};
  }
  throw Error('Unrecognized native format');
}
function indexed(sample,index){
  const key=`${sample}:${index}`;
  if(cache.has(key))return cache.get(key);
  const data=source(sample,index);
  const ast=parse(data.text,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true});
  const nodes=[];
  walk(ast,(node,ancestors)=>{
    if(!['VariableDeclarator','FunctionDeclaration','MethodDefinition'].includes(node.type))return;
    if(node.type!=='MethodDefinition'&&ancestors.some(a=>/Function/.test(a.type)))return;
    nodes.push(node);
  });
  const value={...data,ast,nodes};
  cache.set(key,value);
  return value;
}
function span(id,sample,index,symbol,start,end,level='call-chain'){
  const {module,text}=source(sample,index);
  assert(start>=0&&end<=text.length&&end>start,id);
  const bytes=fs.readFileSync(path.join(dir,module.extractedPath));
  const scale=module.encoding===2?2:1;
  const selected=bytes.subarray(start*scale,end*scale);
  entries[id]={sample,cli_version:all.find(g=>g.sample===sample).version,
    module:module.modulePath,module_index:index,function:symbol,
    module_offset:start,module_end:end,binary_offset:module.contentsOffset+start*scale,
    byte_length:selected.length,source_encoding:module.textEncoding,
    module_sha256:module.sha256,span_sha256:sha(selected),
    evidence_level:level,excerpt:text.slice(start,Math.min(end,start+3500)),
    excerpt_truncated:end-start>3500};
}
function fn(id,sample,index,symbol,level='call-chain'){
  const data=indexed(sample,index);
  const node=data.nodes.find(n=>(n.id?.name??n.key?.name)===symbol);
  assert(node,`${sample}:${index}:${symbol}`);
  span(id,sample,index,symbol,node.start,node.end,level);
}
const targets=[
  ['ST-DETECT',285,'se'],['ST-PROPS',285,'ae'],['ST-OS',285,'L'],['ST-ARCH',285,'H'],
  ['ST-MEMO',285,'CGr'],['SDK-HEADERS',321,'buildHeaders'],['SDK-MERGE',321,'T'],
  ['SDK-ENTRIES',321,'r_'],['SDK-HELPER-MERGE',321,'s_'],
  ['SDK-BETA-ENDPOINTS',321,'Ei'],['SDK-BODY-NORMALIZE',321,'Bc'],
  ['SDK-AUTH',321,'authHeaders'],['SDK-API-KEY',321,'apiKeyAuth'],
  ['SDK-BEARER',321,'bearerAuth'],['SDK-DEFAULT-UA',321,'getUserAgent'],
  ['HTTP-CUSTOM-HEADERS',321,'uun'],['HTTP-REQUEST-CONTEXT',321,'$d'],
  ['HTTP-CONTEXT-NAME',321,'cs'],['HTTP-SENDER-HEADERS',321,'sg'],
  ['CLI-HEADERS',321,'Vd'],['UA',205,'FW'],['ENTRY-NORMALIZE',71,'N'],
  ['ENTRY-INTERACTIVE',71,'l$a'],
  ['ENTRY-ENUM',71,'Eqo'],['ENTRY-OVERRIDE',205,'iPa'],['BILLING',205,'sJs'],
  ['BILLING-INDEX',464,'T$s'],['BILLING-INPUT',464,'j'],['BILLING-SALT',464,'F','literal'],
  ['SYSTEM-PREFIX',464,'XNr'],['SYSTEM-ORDER',464,'Pla'],['SYSTEM-CACHE',464,'C$s'],
  ['SYSTEM-WIRE-CACHE',641,'xos'],['METADATA',464,'Cqe'],['METADATA-FILTER',464,'B'],
  ['DEVICE-ID',205,'hD'],['DEVICE-SAVE',205,'Me'],['DEVICE-CONFIG-PATH',56,'aYr'],
  ['DEVICE-CONFIG-LEGACY',56,'z_'],['SESSION-ID',42,'G'],['JSON-STRINGIFY',50,'_'],
  ['BETA-BASE-RULES',205,'B1'],['BETA-CAP-RULES',205,'G1'],
  ['BETA-BASE',205,'$1'],['BETA-CACHED',205,'ree'],['BETA-AGENTIC',205,'z7n'],
  ['BETA-SERIALIZE',173,'v2'],['BETA-COUNTTOKENS-FILTER',173,'vSn'],
  ['BETA-INTERLEAVED',205,'N7n'],['BETA-CONTEXT',205,'I1'],
  ['BETA-STRUCTURED',205,'F7n'],['BETA-PROMPT-CACHE',205,'nee'],
  ['BETA-MID-CONV',205,'FC'],['BETA-TOOL-CHANGE',205,'F_e'],
  ['BETA-INLINE',205,'A_n'],['BETA-TOOL-GATE',205,'UVr'],
  ['BETA-PER-TURN',205,'o4t'],['BETA-TIMING',205,'m2o'],
  ['BETA-FIRST-PARTY',173,'OS'],['BETA-PROVIDER',173,'nye'],
  ['BETA-NONINTERACTIVE',42,'ge'],['BETA-THINK-SUMMARY',205,'L7n'],
  ['BETA-EFFORT',641,'Sht'],['BETA-OUTPUT-FORMAT',641,'Gns'],
  ['BETA-SERVER-FALLBACK',641,'C0n'],['BETA-FALLBACK-CREDIT',641,'A0n'],
  ['OAUTH-ENDPOINTS',45,'o','literal'],['OAUTH-SCOPES',45,'Pqo'],
  ['OAUTH-BETA',45,'Hu','literal'],
  ['OAUTH-REFRESH-SCOPES',45,'Q5t'],['OAUTH-AUTHORIZE',205,'d2o'],
  ['OAUTH-EXCHANGE',205,'oYs'],['OAUTH-REFRESH',205,'O_e'],
  ['OAUTH-EXPIRY',205,'$O'],['SETUP-TOKEN',1961,'zqa'],
  ['HTTP-FETCH',173,'dqr'],['HTTP-FETCH-OPTIONS',147,'Wl'],
  ['TLS-OPTIONS',147,'xP'],['TLS-MTLS',147,'Bo'],
  ['HTTP-UNDICI-PROXY',147,'iS'],['HTTP-UNDICI-AGENT',147,'Zo'],
  ['ENTRY-SDK-REQUEST-OVERRIDE',205,'sPa'],
  ['BODY-TRAILER',205,'vTe'],['BODY-TRAILER-LIMIT',205,'VXs','literal'],
  ['BODY-TRAILER-BUFFER',205,'g3r'],['REQUEST-WRAPPER',321,'Sv'],
  ['BETA-BINDING-MODE',641,'tGn'],['BETA-BINDING-GATE',641,'nGn'],
  ...['U_n','L2o','I2o','F_n','$_n','O2o','P2o','M2o','D2o','ZJs'].map(symbol=>[`HEADER-${symbol}`,205,symbol,'literal']),
  ...['zd','Gd','ba','kIo','Zp','em','Yjt'].map(symbol=>[`HEADER-${symbol}`,321,symbol,'literal']),
];
for(const [id,index,symbol,level]of targets)fn(id,'S1',index,symbol,level);
const snippets=[
  ['BETA-WIRE-ASSEMBLY',641,'Jqe',3129400,3138400],
  ['BETA-STICKY-BINDING',641,'Eos',3111600,3112050],
  ['BETA-COUNT-CALLER',641,'E$t',1192600,1193210],
  ['BETA-COUNT-SDK',321,'BetaMessages.countTokens',120908,121405],
  ['BETA-MESSAGE-SDK',321,'BetaMessages.create',120100,120990],
  ['SETUP-TOKEN-OPTIONS',2015,'ConsoleOAuthFlow',18070,18410],
  ['OAUTH-FORMAT-TOKENS',662,'Sz.formatTokens',8350,9090],
  ['OAUTH-NO-REFRESH',205,'vl',624010,624900],
  ['OAUTH-ENV-401',205,'lT',616420,616990],
  ['SETUP-TOKEN-SUCCESS',2015,'ConsoleOAuthFlow',18700,19100],
  ['SDK-STREAM-HELPER',321,'MessageStream.createMessage',151600,152100],
  ['CLI-CLIENT-OPTIONS',321,'jB',303560,306000],
  ['SYSTEM-LITERALS',464,'T/v/U',2890,3190],
];
for(const [id,index,symbol,start,end]of snippets)span(id,'S1',index,symbol,start,end);
const betaData=indexed('S1',173);
const oauthBeta=indexed('S1',45).nodes.find(n=>n.id?.name==='Hu')?.init?.value;
assert.equal(typeof oauthBeta,'string');
const registry=[];
for(const node of betaData.nodes){
  if(node.type!=='VariableDeclarator'||node.start<154000||node.start>157000)continue;
  const init=node.init;
  if(init?.type!=='CallExpression'||!['M','Wc'].includes(init.callee.name))continue;
  const name=init.arguments[0]?.value;
  const header=init.callee.name==='Wc'?null:
    init.arguments[1]?.type==='Literal'?init.arguments[1].value:
    init.arguments[1]?.name==='Hu'?oauthBeta:undefined;
  if(header===undefined)continue;
  const id=`BETA-CONSTANT-${node.id.name}`;
  span(id,'S1',173,node.id.name,node.start,node.end,'literal');
  registry.push({symbol:node.id.name,name,header,evidence:id});
}
fs.writeFileSync(path.join(dir,'beta-registry.json'),JSON.stringify({
  sample:'S1',cli_version:'2.1.325',scope:'CLI beta registry; not all tokens present in the generated SDK',
  entries:registry},null,2)+'\n');

const versions=[];
for(const graph of all){
  const binary=fs.readFileSync(path.join(dir,graph.binary));
  const native=binary.subarray(0,graph.base).toString('latin1');
  const bunMatch=/Bun v(\d+\.\d+\.\d+) \(([0-9a-f]{7,40})\)/.exec(native);
  const nodeMatch=/node\/(v\d+\.\d+\.\d+)/.exec(native);
  assert(bunMatch&&nodeMatch,graph.sample);
  const sdkModule=graph.modules.find(m=>{
    if(!/\.js$/.test(m.modulePath))return false;
    return fs.readFileSync(path.join(dir,m.extractedPath)).includes(Buffer.from('X-Stainless-Package-Version'));
  });
  assert(sdkModule,graph.sample);
  const sdkText=fs.readFileSync(path.join(dir,sdkModule.extractedPath)).toString(sdkModule.textEncoding);
  const first=sdkText.indexOf('X-Stainless-Package-Version');
  const local=sdkText.slice(Math.max(0,first-2000),first);
  const sdkMatch=[...local.matchAll(/["'](0\.\d+\.\d+)["']/g)].at(-1);
  assert(sdkMatch,graph.sample);
  const sdkAt=Math.max(0,first-2000)+sdkMatch.index;
  const versionId=`VERSION-${graph.sample}`;
  span(versionId,graph.sample,sdkModule.index,'SDK package version',sdkAt,sdkAt+sdkMatch[0].length,'literal');
  entries[versionId].native_constants={
    bun:{value:bunMatch[0],binary_offset:bunMatch.index},
    node_compatibility:{value:nodeMatch[0],binary_offset:nodeMatch.index}
  };
  const provenance=JSON.parse(fs.readFileSync(path.join(dir,'sample-provenance.json')))
    .find(p=>p.id===graph.sample);
  const os=provenance.platform.startsWith('darwin')?'MacOS':provenance.platform.startsWith('win32')?'Windows':'Linux';
  const arch=provenance.platform.includes('arm64')?'arm64':'x64';
  const format=nativeFormat(binary);assert.equal(format.os,os);assert.equal(format.arch,arch);
  versions.push({cli_version:graph.version,sdk_version:sdkMatch[1],bun_version:bunMatch[1],
    runtime_version_reported:nodeMatch[1],os_values:[os],arch_values:[arch],
    bun_revision:bunMatch[2],sample:graph.sample,platform:provenance.platform,
    runtime_value_evidence:'inference: native node/version constant + SDK process.version branch; official binary not run',
    evidence:versionId,binary_sha256:graph.binarySha256,native_format:format});
}
versions.sort((a,b)=>Number(a.cli_version.split('.').at(-1))-Number(b.cli_version.split('.').at(-1))||a.platform.localeCompare(b.platform));
fs.writeFileSync(path.join(dir,'version-map.json'),JSON.stringify(versions,null,2)+'\n');
for(const graph of all){
  const sdk=versions.find(v=>v.sample===graph.sample);
  const marker='X-Stainless-Package-Version';
  const module=graph.modules.find(m=>{
    if(!/\.js$/.test(m.modulePath))return false;
    return fs.readFileSync(path.join(dir,m.extractedPath)).includes(Buffer.from(marker));
  });
  const text=source(graph.sample,module.index).text;
  const start=text.indexOf(marker),end=text.indexOf('other:',start);
  span(`ST-CROSS-${graph.sample}`,graph.sample,module.index,'SDK platform branch',
    Math.max(0,start-450),Math.min(text.length,end>start?end+100:start+2600));
}
for(const [sample,index,functions]of [
  ['S4b',282,['Mct']],['S4a',342,['_Se']],
]){
  for(const symbol of functions)fn(`CROSS-BILLING-${sample}`,sample,index,symbol);
}
span('CROSS-METADATA-S4b','S4b',282,'metadata JSON',4629940,4630400);
span('CROSS-METADATA-S4a','S4a',342,'metadata JSON',996980,997530);
span('CROSS-BILLING-FIELDS-S4b','S4b',134,'billing builder',1400,2700);
span('CROSS-BILLING-FIELDS-S4a','S4a',142,'billing builder',2200,3490);

const provenance=JSON.parse(fs.readFileSync(path.join(dir,'sample-provenance.json')));
function packageSpan(id,sample,file,symbol,start,end,level='call-chain'){
  const p=provenance.find(p=>p.id===sample);
  const full=path.join(dir,p.packageRoot,file),bytes=fs.readFileSync(full),text=bytes.toString('utf8');
  const selected=Buffer.from(text.slice(start,end));
  entries[id]={sample,cli_version:p.version,module:`package/${file}`,function:symbol,
    local_source:path.relative(dir,full).replaceAll('\\','/'),
    module_offset:start,module_end:end,byte_offset:Buffer.byteLength(text.slice(0,start)),
    binary_offset:null,byte_length:selected.length,source_encoding:'utf8',
    module_sha256:sha(bytes),span_sha256:sha(selected),evidence_level:level,
    excerpt:text.slice(start,Math.min(end,start+3500)),excerpt_truncated:end-start>3500};
}
for(const sample of ['S5','S7']){
  const p=provenance.find(p=>p.id===sample);
  const file=path.join(dir,p.packageRoot,'install.cjs');
  const text=fs.readFileSync(file,'utf8');
  const ast=parse(text,{ecmaVersion:'latest',sourceType:'script',allowHashBang:true});
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'&&['getPlatformKey','detectMusl','resolvePlatformPackageDir'].includes(n.id.name))
      packageSpan(`INSTALL-${sample}-${n.id.name}`,sample,'install.cjs',n.id.name,n.start,n.end);
  }
  const manifest=fs.readFileSync(path.join(dir,p.packageRoot,'package.json'),'utf8');
  packageSpan(`NPM-MANIFEST-${sample}`,sample,'package.json','optionalDependencies',0,manifest.length,'literal');
}
for(const p of provenance.filter(p=>p.platform==='main')){
  const file=path.join(dir,p.packageRoot,'cli.js');
  if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8'),at=text.indexOf('user_id:');
  if(at<0)continue;
  const start=text.lastIndexOf('function ',at),end=text.indexOf('async function ',at);
  assert(start>=0&&end>at&&end-start<5000,p.id);
  const name=/function ([\w$]+)/.exec(text.slice(start))?.[1]??'metadata';
  packageSpan(`METADATA-HISTORY-${p.version}`,p.id,'cli.js',name,start,end);
}
const extraction=all.map(g=>({sample:g.sample,version:g.version,binary:g.binary,
  binary_sha256:g.binarySha256,base:g.base,byte_count:g.byteCount,
  offsets_at:g.offsetsAt,trailer_offset:g.trailerOffset,module_table_offset:g.modulesOffset,
  module_table_length:g.modulesLength,record_size:g.recordSize,module_count:g.modules.length,
  entrypoint:g.entrypoint,entrypoint_path:g.modules[g.entrypoint].modulePath,
  native_format:versions.find(v=>v.sample===g.sample).native_format,
  encoding:'0=binary,1=latin1,2=utf16le',method:'validated trailer + 32-byte offsets + 52-byte module records',
  official_binary_executed:false}));
fs.writeFileSync(path.join(dir,'extraction-index.json'),JSON.stringify(extraction,null,2)+'\n');
fs.writeFileSync(path.join(dir,'evidence-index.json'),JSON.stringify({schema_version:2,
  date:'2026-11-17',offsets:'zero-based; binary_offset absolute in original executable; module_offset JS code units; raw encoding scale recorded',
  levels:['literal','call-chain','offline-reproduction','runtime-capture','inference'],
  entries},null,2)+'\n');
console.log(JSON.stringify({evidence_entries:Object.keys(entries).length,versions:versions.length,
  beta_registry_entries:registry.length,official_binary_executed:false}));
