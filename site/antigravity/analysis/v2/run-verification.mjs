import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const cwd=process.cwd(),root=path.resolve('site/antigravity/analysis'),out=path.join(root,'v2');
const tx=path.join(root,'macos/transaction'),scratch=path.join(root,'tools/v2-transaction');
fs.mkdirSync(scratch,{recursive:true});
const live=path.join(root,'macos/antigravity-macos-fingerprint.md');
const baseline=path.join(tx,'BASELINE_FILE.md'),modified=path.join(tx,'MODIFIED_FILE.md');
const patch=path.join(tx,'DIFF_FILE.patch'),rollback=path.join(tx,'ROLLBACK.sh'),verification=path.join(root,'macos/VERIFICATION.txt');
const gitbin='C:/Program Files/Git/usr/bin',commands=[];
const sha=b=>createHash('sha256').update(b).digest('hex'),slash=p=>p.replaceAll('\\','/');
const env={...process.env,PATH:gitbin.replaceAll('/','\\')+';'+process.env.PATH};
function run(label,exe,args,expected=0){
  const r=spawnSync(exe,args,{cwd,encoding:'utf8',env,windowsHide:true,maxBuffer:16*1024*1024});
  const rec={label,command:[exe,...args],cwd,stdout:r.stdout??'',stderr:r.stderr??'',exit_status:r.status,spawn_error:r.error?.message??null};
  commands.push(rec);
  if(r.status!==expected)throw Error(JSON.stringify(rec));
  return rec;
}
const original=fs.readFileSync(baseline),changed=fs.readFileSync(live);
assert.equal(sha(original),'8e30933cc10c763aae28fa07eec7e1749248d819dd2d669f8c1b43a3001bd182');
assert(!original.equals(changed));
fs.writeFileSync(modified,changed);
// Normalize the edited shell source to LF before running it on the POSIX shell.
fs.writeFileSync(rollback,fs.readFileSync(rollback,'utf8').replace(/\r\n/g,'\n'));
const probe=path.join(out,'probe-report.mjs');
const b=run('BASELINE','node',[probe,baseline,'--mode','fingerprint']);
const m=run('MODIFIED','node',[probe,modified,'--mode','fingerprint']);
const d=run('DIFF',gitbin+'/diff.exe',['-U0','--label','antigravity-macos-fingerprint.md','--label','antigravity-macos-fingerprint.md',slash(baseline),slash(modified)],1);
fs.writeFileSync(patch,d.stdout);
const replay=path.join(scratch,'patch-replay.md');
fs.writeFileSync(replay,original);
run('PATCH_REPLAY',gitbin+'/patch.exe',['--binary','--batch','--forward',slash(replay),slash(patch)]);
assert(fs.readFileSync(replay).equals(changed),'patch replay bytes');
const restored=path.join(scratch,'rollback-copy.md');
fs.writeFileSync(restored,changed);
run('ROLLBACK_SCRIPT',gitbin+'/sh.exe',[slash(rollback),slash(restored)]);
const r=run('ROLLBACK','node',[probe,restored,'--mode','fingerprint']);
assert(fs.readFileSync(restored).equals(original),'rollback pristine bytes');
assert.equal(r.stdout,b.stdout);
// Reapply the selected report state to the modified role after the rollback test.
fs.writeFileSync(modified,changed);
assert(fs.readFileSync(modified).equals(fs.readFileSync(live)));
fs.writeFileSync(path.join(out,'verification-results.json'),JSON.stringify({
  status:'in_progress',date:'2026-11-17',commands,
  behaviors:{BASELINE:JSON.parse(b.stdout),MODIFIED:JSON.parse(m.stdout),ROLLBACK:JSON.parse(r.stdout)}
},null,2)+'\n');
const v=run('OFFLINE_VALIDATION','node',[path.join(out,'validate-deliverables.mjs')]);
const header='\n\n[ROUND_V2_2026-11-17]\nTarget: '+live+'\nChanged fields: primary app_version/CL, request metadata assignments, generation branching, OAuth and conditional endpoint/header specification.\nBaseline: exact first-round macOS report, not the first-round empty-file rollback baseline.\n';
const ledger=header+commands.map(c=>`LABEL: ${c.label}\nCOMMAND_JSON: ${JSON.stringify(c.command)}\nINPUT: --mode fingerprint for BASELINE/MODIFIED/ROLLBACK\nEXIT_STATUS: ${c.exit_status}\nSTDOUT_BEGIN\n${c.stdout}STDOUT_END\nSTDERR_BEGIN\n${c.stderr}STDERR_END\n`).join('\n')+
  `BASELINE_SHA256=${sha(original)}\nMODIFIED_SHA256=${sha(changed)}\nRESTORED_SHA256=${sha(fs.readFileSync(restored))}\nPATCH_REPLAY_MATCH=true\nROLLBACK_MATCH=true\nREAPPLY_MATCH=true\nOFFICIAL_CLIENT_EXECUTED=false\n`;
const prior=fs.readFileSync(verification,'utf8'),marker='\n\n[ROUND_V2_2026-11-17]\n';
fs.writeFileSync(verification,prior.split(marker)[0]+ledger);
const roles={MODIFIED_FILE:modified,DIFF_FILE:patch,VERIFICATION:verification,ROLLBACK:rollback};
const reopened={};
for(const [name,file]of Object.entries(roles)){const b=fs.readFileSync(file);reopened[name]={path:file,bytes:b.length,sha256:sha(b)}}
const result={
  date:'2026-11-17',target:live,original_baseline:{path:baseline,bytes:original.length,sha256:sha(original)},
  pre_modification_probe:{command:['node','site/antigravity/analysis/v2/probe-report.mjs','site/antigravity/analysis/macos/antigravity-macos-fingerprint.md','--mode','fingerprint'],stdout:'{"app_version":"2.32.0","cl":"1020486441","round":"v1"}\n',stderr:'',exit_status:0},
  commands,behaviors:{BASELINE:JSON.parse(b.stdout),MODIFIED:JSON.parse(m.stdout),ROLLBACK:JSON.parse(r.stdout)},
  patch_reconstructs_modified:true,restored_hash_equals_original:true,reapplied_modified:true,official_client_executed:false,roles_reopened:reopened,
  corrected_errors:[
    {source:'build-deliverables.mjs first run',exit_status:1,error:'SyntaxError: Invalid or unexpected token',correction:'Removed shell-style backslash escapes around JavaScript quote literals'},
    {source:'build-deliverables.mjs function lookup',exit_status:1,error:'POST-JSON: expected one function, found 0',correction:'Matched the free generic function and exact authclient/Cascade symbols'},
    {source:'build-deliverables.mjs input JSON',exit_status:1,error:'SyntaxError: Unexpected token BOM',correction:'Accepted then normalized UTF-8 BOM in PowerShell-generated evidence JSON'},
    {source:'validate-deliverables.mjs first run',exit_status:1,error:'broken local link in transaction/BASELINE_FILE.md',correction:'Preserve snapshot bytes; validate navigable links relative to live report files, not relocated transaction snapshots'},
    {source:'rg Windows wildcard path',exit_status_of_enclosing_command:0,diagnostic:'OS error 123 for v2/*.txt',correction:'Used rg -g *.txt against the directory; subcommand status was not separately captured'},
    {source:'credits.proto heuristic parser diagnostic',exit_status_of_diagnostic_command:0,diagnostic:'illegal tag: field no 13 wire type 7',correction:'Recovered exact 0x20b descriptor length from init instruction FILE 5009144; both platform hashes now match'},
    {source:'git diff --check -- site/antigravity',exit_status:1,diagnostic:'Native unified patch context lines consisting of one space were flagged as trailing whitespace in the patch and literal stdout ledger',correction:'Generated a native unified diff with zero context (-U0), then repeated patch replay and rollback verification'}
  ],
  verification_result:JSON.parse(v.stdout),git:'No new commit, push or merge performed in round v2'
};
fs.writeFileSync(path.join(out,'verification-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:true,behaviors:result.behaviors,roles_reopened:reopened},null,2));
