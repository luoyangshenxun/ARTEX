// Evaluates exact extracted base/capability rules, with explicit synthetic context.
// Does not import or start a Claude module. Run under the independent Bun tool.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from './tools/acorn-8.15.0/package/dist/acorn.mjs';
import {dir,source,walk} from './source-lib.mjs';
assert.equal(typeof Bun,'object','Run with Bun');
const registry=JSON.parse(fs.readFileSync(path.join(dir,'beta-registry.json'))).entries;
const symbols=Object.fromEntries(registry.map(e=>[e.symbol,{name:e.name,header:e.header}]));
const {text,module}=source('S1',205);
const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
const selected=[];
walk(ast,(n,ancestors)=>{
  if(n.type==='VariableDeclarator'&&['B1','G1'].includes(n.id.name)
    &&!ancestors.some(a=>/Function/.test(a.type)))selected.push(n);
});
let fixture={};
const deps={...symbols,i:{},Dt:()=>fixture.auth==='oauth',nye:()=>true,F4r:()=>fixture.auth==='api_key',
  Kl:()=>false,Ug:()=>false,GA:()=>false,ge:()=>!fixture.interactive,L7n:()=>false,
  I1:()=>true,b:()=>false,F7n:()=>true,tjo:()=>false,nee:()=>true,AS:()=>true,
  o4t:()=>false,UVr:()=>false,F_e:()=>false,A_n:()=>false,H1:()=>false};
const [baseRules,capRules]=new Function(...Object.keys(deps),
  selected.map(n=>`var ${text.slice(n.start,n.end)};`).join('\n')+'return [B1,G1];')(...Object.values(deps));
const token=e=>symbols[e].header;
const subway=['claude-code-20250219','oauth-2025-04-20','interleaved-thinking-2025-05-14',
  'prompt-caching-scope-2026-01-05','effort-2025-11-24','context-management-2025-06-27',
  'thinking-binding-controls-2026-08-01','mid-conversation-output-config-2026-07-01',
  'extended-cache-ttl-2025-04-11'];
const whitelist=['_Sn','dXn','DTe','ilt'].map(e=>symbols[e]);
const rows=[],countRows=[];
for(const family of ['opus','sonnet','haiku','fable'])
for(const auth of ['oauth','api_key']){
  fixture={auth,interactive:false};
  const ctx={model:`synthetic-${family}`,canonical:`synthetic-${family}`,provider:'firstParty',
    firstPartyOnlyBetas:true,firstPartyCapabilityBetas:true,interleavedThinking:true,perTurnTiming:false};
  const countBase=baseRules.filter(r=>r.when(ctx)).map(r=>r.beta);
  const countTokens=[...countBase.filter(e=>whitelist.includes(e)).map(e=>e.header),'token-counting-2024-11-01'];
  countRows.push({family,auth,endpoint:'count_tokens',tokens:countTokens,header:countTokens.join(','),
    evidence:['BETA-BASE-RULES','BETA-COUNTTOKENS-FILTER','BETA-COUNT-CALLER','BETA-COUNT-SDK']});
  for(const interactive of [false,true])
  for(const stream of [false,true])
  for(const tools of [false,true])
  for(const thinking of [false,true]){
    fixture={auth,interactive};
    const base=baseRules.filter(r=>r.when(ctx)).map(r=>r.beta);
    // z7n: an agentic source always appends claude-code if base omitted it.
    if(!base.includes(symbols._Sn))base.push(symbols._Sn);
    for(const rule of capRules)if(rule.when(ctx)&&!base.includes(rule.beta))base.push(rule.beta);
    const tokens=base.filter(e=>e.header!==null).map(e=>e.header);
    // Eos first-request fixture: supports thinking-token-count; no tool-search or latches.
    tokens.push(token('zW'));
    // Sht(undefined,...): this explicit fixture supports effort, so requests its beta.
    tokens.push(token('LTe'));
    // First request only; binding capability is explicitly true in this fixture.
    if(thinking)tokens.push(token('w3'));
    assert.equal(new Set(tokens).size,tokens.length);
    rows.push({family,auth,interactive,stream,tools,thinking,tokens,header:tokens.join(','),
      subway_extra:subway.filter(t=>!tokens.includes(t)),subway_missing:tokens.filter(t=>!subway.includes(t)),
      evidence:['BETA-BASE-RULES','BETA-CAP-RULES','BETA-AGENTIC','BETA-EFFORT','BETA-STICKY-BINDING','BETA-WIRE-ASSEMBLY']});
  }
}
assert.equal(rows.length,128);assert.equal(countRows.length,8);
const output={schema_version:2,sample:'S1',cli_version:'2.1.325',
  evidence_level:'offline-reproduction (exact base/cap rules) + explicit main-request path fixture',
  warning:'Controlled conditional matrix, not a unique production truth table. Model family and the six axes alone do not determine actual betas.',
  runtime:{bun_version:Bun.version,bun_revision:Bun.revision,process_version:process.version},
  context:{provider:'firstParty',agentic_query:true,model_ids:'synthetic; no claim these are published models',
    model_capabilities:{interleavedThinking:true,contextManagement:true,thinkingSupported:true,
      thinkingTokenCount:true,effort:true,binding:true,context1m:false,perTurnEffort:false,perTurnTiming:false},
    first_party_only_betas:true,first_party_capability_betas:true,prompt_cache_scope:true,
    thinking_display:'none',showThinkingSummaries:false,mid_conversation_system:'GA, null header',
    flags:'all additional feature flags false; no env/SDK betas, tools search, output format, fallback, fast, 1h cache, account extras',
    conversation:'new, no sticky beta accepted/refused state; non-mechanical thinking disable',
    independent_axes:'stream/tools do not change tokens in this explicit context; other contexts may'},
  base_rule_source:{module:module.modulePath,spans:selected.map(n=>({start:n.start,end:n.end}))},
  subway_baseline:{provenance:'USER-SUPPLIED 2026-11-17, f314f5d7',tokens:subway},
  rows,count_tokens:countRows};
fs.writeFileSync(path.join(dir,'beta-conditional-matrix.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({matrix_rows:rows.length,count_tokens_rows:countRows.length,passed:true,
  representative:rows.find(r=>r.family==='sonnet'&&r.auth==='oauth'&&r.interactive&&r.thinking)}));
