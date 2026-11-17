import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspect} from './native-index.mjs';
const root='site/antigravity/analysis/', out=root+'v2/';
const read=p=>JSON.parse(fs.readFileSync(out+p,'utf8').replace(/^\uFEFF/,''));
const write=(p,o)=>fs.writeFileSync(out+p,JSON.stringify(o,null,2)+'\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
const constants=read('native-constants.json');
const native={};
for(const id of ['W1','M1','C1'])native[id]=inspect(root+constants[id].file);
const samples={};
for(const id of ['W1','M1','C1']){
  const p=read(id+'-provenance.json');
  samples[id]={app_version:p.version,build_dir_id:p.build,url:p.url,bytes:p.size,sha256:p.sha256,sha512_hex:p.sha512,native:constants[id],official_client_executed:false};
}
samples.M2={
  app_version:'2.32.0',build_dir_id:'6141816156848128',
  url:'https://storage.googleapis.com/antigravity-public/antigravity-hub/2.32.0-6141816156848128/darwin-arm/Antigravity.dmg',
  bytes:241278833,sha256:'7ec0f204cf306506ecd77abbb7ba2a6e722471dbf908a86433dcb8efa6ed98f7',
  native:constants.M2,official_client_executed:false,provenance:'Retained first-round verified DMG; see ../macos/VERIFICATION.txt'
};
write('samples.json',{observed_date:'2026-11-17',samples});
const levels={
  E1:'Runtime capture of this exact official sample (none performed in v2)',
  E2:'Static executable instructions and traced construction/serialization branch',
  E3:'Packaged source, descriptor, literal, manifest or file bytes',
  E4:'Inference across samples or from a cited standard; conditions stated',
  E5:'Unresolved or requires runtime state'
};
const evidence=[];
function fn(id,sample,pattern,note,points=[]){
  const re=new RegExp(pattern),matches=native[sample].functions.filter(f=>re.test(f.name));
  if(matches.length!==1)throw Error(`${id}: expected one function, found ${matches.length}`);
  const f=matches[0];
  evidence.push({id,sample,level:'E2',file:constants[sample].file,symbol:f.name,offset:f.offset,bytes:f.size,sha256:sha(native[sample].raw.subarray(f.offset,f.offset+f.size)),instruction_offsets:points,note});
}
fn('UA-W1','W1','codeassistclient\\.userAgent$','Core format plus conditional comments; not a captured full authenticated UA');
fn('UA-M1','M1','codeassistclient\\.userAgent$','Core format plus conditional comments; runtime auth_method is not a fabricated constant');
fn('OS-W1','W1','metadata_provider\\.Initialize\\.func1$','Compiled OS/architecture constants');
fn('OS-M1','M1','metadata_provider\\.Initialize\\.func1$','Compiled OS/architecture constants');
fn('META-LOAD-W1','W1','CodeAssistClient\\)\\.fetchLoadCodeAssistResponse$','Metadata: IdeType=9, PluginType=0; no Platform/IdeVersion/IdeName stores',[42331172,42331179]);
fn('META-ONBOARD-W1','W1','CodeAssistClient\\)\\.OnboardUser$','Metadata: IdeType=9, PluginType=0',[42335173,42335180]);
fn('META-LOAD-M1','M1','CodeAssistClient\\)\\.fetchLoadCodeAssistResponse$','Metadata constructed with IdeType=9, PluginType=0',[35668480,35668484]);
fn('META-ONBOARD-M1','M1','CodeAssistClient\\)\\.OnboardUser$','Metadata constructed with IdeType=9, PluginType=0',[35671896,35671900]);
fn('MODELS-M1','M1','CodeAssistClient\\)\\.fetchAvailableModels$','Project; conditional Location/Entitlement; no metadata');
fn('MODELS-W1','W1','CodeAssistClient\\)\\.fetchAvailableModels$','Windows matching branch');
fn('POST-JSON','M1','codeassistclient\\.doPostAndUnmarshalWithErrorReport\\[go.shape.\\*uint8\\]$','protojson.Marshal default lowerCamel names',[35751152]);
fn('GENERATE-BUILD','M1','codeassistclient\\.BuildGenerateContentRequest$','Input-driven system prompt and request type maps; conditional credits',[35535660,35535696,35539176,35539212]);
fn('GENERATE-CALLER','M1','CodeAssistClient\\)\\.getStreamingTextCompletion$','Traced call to builder then StreamGenerateContent',[35528676,35529312]);
fn('GENERATE-ROUTE','M1','CodeAssistClient\\)\\.StreamGenerateContent$','Recomputes request ID, provider UserAgentName, clears UserPromptId; auth-mode dispatch',[35540808,35540896,35540952]);
fn('GENERATE-ROUTE-W1','W1','CodeAssistClient\\)\\.StreamGenerateContent$','Windows matching dispatcher');
fn('GENERATE-JSON','M1','codeassistclient\\.marshalCCPARequest$','UseProtoNames=false; conditional UseEnumNumbers for nested enum 5/6');
fn('GENERATE-SSE','M1','CodeAssistClient\\)\\.streamGenerateContentFromCCPA$','POST streamGenerateContent with alt=sse and JSON',[35542752,35543408,35543500]);
fn('GENERATE-ID','M1','codeassistclient\\.computeRequestID$','Slash-delimited formats, with random UUID fallback');
fn('GENERATE-AICODE','M1','CodeAssistClient\\)\\.useAICodePredictionFlow$','USE_AICODE parsed bool overrides, otherwise feature state and cooldown');
fn('THOUGHT-SEND','M1','codeassistclient\\.processToolCalls$','Copies per-call ThinkingSignature bytes; fallback base64 ThoughtSignature',[35532136,35532172,35532212]);
fn('THOUGHT-RECEIVE','M1','CodeAssistClient\\)\\.getStreamingTextCompletion-range1$','Part.ThoughtSignature copied to per-call ThinkingSignature',[35723824,35724020]);
fn('HEADERS','M1','CodeAssistClient\\)\\.setHeaders$','UA, context request reason, provider headers and quota override',[35572372]);
fn('HEADERS-HUB','M1','AntigravityHubAuthProvider\\)\\.SetHTTPHeaders$','Account-mode and host gated quota project');
fn('HEADERS-QUOTA','M1','CodeAssistClient\\)\\.maybeOverrideQuotaProject$','Nonempty context quota override',[35378796]);
fn('ENDPOINTS','M1','AntigravityHubAuthProvider\\)\\.UpdateEndpointURL$','Override guards; business/GCP ToS prod; personal daily',[35450084,35450124]);
fn('OAUTH-CALLBACK','M1','BrowserTokenAcquirer\\)\\.AcquireToken$','Loopback listener, /auth/callback and verifier',[39594044,39594412,39594472]);
fn('OAUTH-LOOPBACK','M1','authclient\\.listenLoopbackDualStackWith$','IPv4 ephemeral port, IPv6 same port, localhost fallback');
fn('OAUTH-AUTHURL','M1','authclient\\.buildAuthCodeURL$','S256, consent, offline');
fn('OAUTH-CONFIG','M1','authclient\\.getOAuthConfig$','Personal/business/WIF configurations; secrets recorded only as hashes');
fn('IDENTITY-SECTION','M1','IdentitySection\\)\\.GetName$','identity section name');
fn('IDENTITY-CONDITION','M1','IdentitySection\\)\\.ShouldInclude$','Always true for this section object; other harness selection not inferred');
fn('IDENTITY-ASSEMBLY','M1','CascadeConversationalMixin\\)\\.GetSystemPrompt$','System-prompt assembly separate from HTTP serializer');
fn('CLI-BACKEND','C1','backend\\.NewServerBackend$','Standalone CLI includes codeassistclient and binds CLIAuthProvider',[54832419,54832453]);
fn('CLI-UA','C1','CLIAuthProvider\\)\\.GetUserAgentName$','Default antigravity name with override; not GeminiCLI/0.1.5');
for(const [id,sample] of [['CL-W1','W1'],['CL-M1','M1'],['CL-M2','M2'],['CL-C1','C1']]){
  const c=constants[sample].cl;
  evidence.push({id,sample,level:'E3',file:constants[sample].file,symbol:'fallback_changelist_string (Go string header)',offset:c.offset,data_offset:c.dataOffset,bytes:16,value:c.value});
}
for(const sample of ['W1','M1']){
  for(const s of read(sample+'-schemas.json').schemas)evidence.push({
    id:`SCHEMA-${sample}-${path.basename(s.file,'.proto')}`,sample,level:'E3',
    file:constants[sample].file,symbol:s.file,offset:s.offset,bytes:s.bytes,sha256:s.sha256,note:'Schema is not proof that a field is populated'
  });
  const folder=sample==='W1'?'windows-app-2.32.1':'macos-app-2.32.1';
  for(const [name,file,needles] of [
    ['LAUNCH','dist/lsDefaults.js',['LS_CLOUD_CODE_ENDPOINT','--override_ide_name','--subclient_type','--override_ide_version']],
    ['OAUTH-SOURCE','dist/remote/signInUrls.js',['const LS_GOOGLE_SCOPES','// Personal accounts.','https://www.googleapis.com/auth/aicode',"!== 'S256'", "!== 'offline'"]]
  ]){
    const rel=`unpacked/${folder}/asar/${file}`,b=fs.readFileSync(root+rel);
    evidence.push({id:`${name}-${sample}`,sample,level:'E3',file:rel,symbol:file,offset:0,bytes:b.length,sha256:sha(b),locations:needles.map(needle=>({needle,offset:b.indexOf(needle)}))});
  }
}
const identity=read('M1-identity-literals.json')[1].headers[0];
evidence.push({id:'IDENTITY-TEMPLATE',sample:'M1',level:'E3',file:constants.M1.file,symbol:'embedded antigravity_identity template',offset:identity.dataOffset,bytes:identity.length,sha256:sha(Buffer.from(identity.text)),text:identity.text});
write('evidence-catalog.json',{offset_convention:'Zero-based file byte offsets, not RVA; offsets inside unpacked ASAR files are relative to that file',levels,legacy_note:'First-round reports used three prose evidence categories; this explicit v2 five-level normalization is new, not a claim of pre-existing five labels.',evidence});
const scopes=['cloud-platform','userinfo.email','userinfo.profile','cclog','experimentsandconfigs','aicode'].map(x=>'https://www.googleapis.com/auth/'+x);
const profiles=[];
for(const [sample,os_type,arch] of [['W1','windows','amd64'],['M1','darwin','arm64']]){
  const app_version='2.32.1',cl=constants[sample].cl.value;
  const core=`antigravity/hub/${app_version} (aidev_client; os_type=${os_type}; arch=${arch}; cl=${cl})`;
  profiles.push({
    id:`hub-${app_version}-${os_type}-${arch}-personal-ccpa`,sample,app_version,build_dir_id:samples[sample].build_dir_id,cl,os_type,arch,
    ua:core,ua_semantics:'core-only; authentication/context comments must be resolved at runtime',
    ua_optional_comments:['auth_method=<AUTH_METHOD>','datacollection_opt_in=false','purpose=<PURPOSE>','host_path=<HOST_PATH>','proxy_client=<PROXY_CLIENT>'],
    metadata_platform:0,metadata_platform_name:'PLATFORM_UNSPECIFIED',metadata_platform_emitted:false,
    schema_platform_for_os:os_type==='windows'?{name:'WINDOWS_AMD64',value:5}:{name:'DARWIN_ARM64',value:2},
    ide_name:'antigravity',ide_version:app_version,ide_field_semantics:'launch override values; absent from observed load/onboard metadata construction',
    endpoints:{
      bootstrap:'https://daily-cloudcode-pa.googleapis.com',personal:'https://daily-cloudcode-pa.googleapis.com',business_or_gcp_tos:'https://cloudcode-pa.googleapis.com',
      precedence:['CLOUD_CODE_URL/dev/custom configured URL guards','business/GCP ToS -> prod','personal token -> daily','no-token load-response branch: tier predicate requires runtime data'],
      fallback_policy:null,privacy_endpoint:null,note:'No evidence for Subway prod-first/5-minute fallback policy or a universal privacy override'
    },
    oauth:{
      account_type:'personal',client_id:'1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com',
      scopes,redirect:'http://localhost:<PORT>/auth/callback',port_policy:'ephemeral loopback port; IPv4 then IPv6 on same port, localhost fallback',
      pkce:'S256',response_type:'code',access_type:'offline',prompt:'consent',state:'<STATE>',
      client_secret_sha256_candidates:constants[sample].client_secrets_sha256_only.map(x=>x.sha256),
      client_secret_mapping:'hash-only inventory; individual client-to-secret mapping not asserted'
    },
    headers:{
      'Content-Type':'application/json','User-Agent':null,'Authorization':null,
      'X-Goog-Api-Client':null,'X-Goog-Request-Reason':null,'X-Goog-User-Project':null
    },
    header_policy:{
      null_means:'Resolve under corresponding policy, or omit; never send JSON null as a header',
      'User-Agent':'ua core plus provider/context comments; no invented auth_method',
      Authorization:'OAuth2 transport Bearer <TOKEN>',
      'X-Goog-Api-Client':'not set in traced common CCPA Go path; remove gl-node/22.21.1',
      'X-Goog-Request-Reason':'nonempty request context only',
      'X-Goog-User-Project':'provider auth-mode/host gate and nonempty project; context quota override may replace it',
      Accept:'no constant inferred for all actions',Host:'derive from selected URL; no fixed daily host',header_order:null,
      scope:'Application-constructed headers only; transport headers/order require capture'
    },
    requests:{
      wire_format:'JSON (protojson)',field_names:'lowerCamelCase',emit_unpopulated:false,
      loadCodeAssist:{method:'POST',path:'/v1internal:loadCodeAssist',metadata:{ideType:'ANTIGRAVITY'},optional:['cloudaicompanionProject: nonempty input']},
      onboardUser:{method:'POST',path:'/v1internal:onboardUser',metadata:{ideType:'ANTIGRAVITY'},optional:['tierId: caller input','cloudaicompanionProject: nonempty input']},
      fetchAvailableModels:{method:'POST',path:'/v1internal:fetchAvailableModels',metadata:null,fields:['project'],conditional:['location','entitlement']},
      generation:{
        branch:'personal CCPA continuation; personal AICode/gateway/business dispatches also exist',
        method:'POST',path:'/v1internal:streamGenerateContent',query:{alt:'sse'},content_type:'application/json',
        wrapper_fields:['project','requestId','request','model','userAgent','requestType','enabledCreditTypes'],
        userAgent:'antigravity',userPromptId:{emitted:false,reason:'cleared by StreamGenerateContent after computeRequestID'},
        requestId:{prompt_and_session:'<REQUEST_TYPE>/<SESSION_ID>/<TIMESTAMP_MS>/<USER_PROMPT_ID>/<REASON_ENUM>',prompt_without_session:'<REQUEST_TYPE>/<TIMESTAMP_MS>/<USER_PROMPT_ID>/<REASON_ENUM>',no_prompt:'<REQUEST_TYPE>/<UUID_V4>',empty_request_type:'unknown'},
        requestType_maps:'request-type-maps.json',
        enabledCreditTypes:{condition:'EnableAiCredits boolean input',when_true:['GOOGLE_ONE_AI'],numeric_value:1,when_false:'omit',enum_number_exception:'marshalCCPARequest may set UseEnumNumbers for nested model/config enum values 5 or 6; then [1]'},
        systemInstruction:{source:'caller-supplied prompt assembled above transport',identity_template_evidence:'IDENTITY-TEMPLATE',template_experiment:'generic-system-prompt',autonomous_flag:'IsAutonomous',fixed_identity_literal_per_all_requests:false},
        thoughtSignature:{wire:'base64 string (protobuf bytes)',storage:'ChatMessagePrompt.ThinkingSignature or ChatToolCall.ThinkingSignature; legacy base64 string fallback',preserve:'Keep original assistant parts and per-tool call ID/name/arguments/signature association; no global cache inferred'},
        non_stream_generateContent:'Not established as the same official Hub main path',
        aicode_selection:'USE_AICODE parsed boolean or feature state/cooldown; missing-scope fallback exists'
      }
    },
    evidence_refs:[`CL-${sample}`,`UA-${sample}`,`OS-${sample}`,`LAUNCH-${sample}`,`OAUTH-SOURCE-${sample}`,`META-LOAD-${sample}`,`META-ONBOARD-${sample}`,'GENERATE-CALLER','GENERATE-ROUTE','GENERATE-JSON','GENERATE-SSE','GENERATE-ID','GENERATE-BUILD','HEADERS','HEADERS-HUB','ENDPOINTS','OAUTH-CALLBACK','THOUGHT-SEND','THOUGHT-RECEIVE'],
    cross_platform_note:sample==='W1'?'Windows UA/metadata/dispatch individually checked; detailed conditional generation semantics traced on M1 with identical five descriptor hashes. Those details are cross-platform inference (E4), not a Windows runtime capture.':null,
    runtime_capture:false,ready_as_unconditional_constants:false,
    unresolved:['Full UA with actual authenticated provider state','Transport-generated headers and order','Selected personal CCPA vs AICode branch for a live account','Exact rendered system prompt per model/experiment/harness','Entitlement/tier-dependent optional fields','Privacy-action routing beyond traced common path']
  });
}
write('antigravity-hub-profiles.json',{
  schema_version:2,analysis_date:'2026-11-17',status:'static_branch_specification',selected_candidate:'windows Hub (W1 available); product decision remains Subway owner choice',
  secret_policy:'No plaintext client secret; sha256-only inventory',
  version_changelist:[...['M2','M1','W1','C1'].map(sample=>({sample,app_version:samples[sample].app_version,build_dir_id:samples[sample].build_dir_id,cl:constants[sample].cl.value}))],
  cl_derivation:'Not derivable from observed manifests/build ids; extract exact sample fallback_changelist_string, verify provenance, then publish a version/build/platform tuple.',
  evidence_catalog:'evidence-catalog.json',profiles
});
// Reviewable, deliberately selected instruction windows; full regenerated dumps
// stay ignored, just like the unpacked official binaries.
const windows=[
 ['M1-init-auth.disasm.txt',[[12206464,12206672],[35447376,35447424],[35448496,35449328],[35449744,35450576]]],
 ['W1-ua.disasm.txt',[[14637536,14637760],[42212640,42213200]]],
 ['W1-requests.disasm.txt',[[42331120,42331260],[42335120,42335240]]],
 ['M1-codeassist.disasm.txt',[[35535552,35535760],[35539150,35539280],[35540696,35541000],[35542000,35542240],[35542700,35542800],[35543360,35543540],[35569744,35569900],[35572000,35572848],[35593088,35594560],[35668380,35668640],[35671800,35672080],[35751072,35751220]]],
 ['M1-routing.disasm.txt',[[35539680,35540272],[35554112,35554256]]],
 ['M1-tools-credits.disasm.txt',[[5009116,5009156],[35531680,35532640]]],
 ['M1-streaming.disasm.txt',[[35723780,35724060]]],
 ['M1-oauth.disasm.txt',[[39591696,39592720],[39594380,39594500],[39602288,39602800]]],
 ['M1-identity.disasm.txt',[[29558368,29558464]]],
 ['C1-backend.disasm.txt',[[54832390,54832480]]],
 ['C1-ua.disasm.txt',[[41239264,41239328]]]
];
let text='Selected static instructions. FILE offsets are decimal; no official client was executed.\n';
for(const [file,ranges]of windows){
  const blocks=fs.readFileSync(out+file,'utf8').split(/(?=^FUNCTION )/m);
  for(const block of blocks){
    const lines=block.split(/\r?\n/),selected=lines.slice(1).filter(line=>{
      const m=line.match(/\bfile=(\d+)\b/);return m&&ranges.some(([a,b])=>+m[1]>=a&&+m[1]<b);
    });
    if(selected.length)text+=`\nSOURCE ${file}\n${lines[0].trimEnd()}\n${selected.map(x=>x.trimEnd()).join('\n')}\n`;
  }
}
if(/GOCSPX-[A-Za-z0-9_-]{28}/.test(text))throw Error('secret in curated output');
fs.writeFileSync(out+'evidence-excerpts.log',text);
console.log(JSON.stringify({samples:Object.keys(samples),evidence:evidence.length,profiles:profiles.length,excerpts_bytes:Buffer.byteLength(text)}));
