import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const full=name=>path.join(root,name);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const append=text=>fs.appendFileSync(full('VERIFICATION.txt'),text);
const ledgerCommand=(label,exe,args)=> {
  const result=spawnSync(exe,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:16*1024*1024});
  const stdout=result.stdout||'',stderr=result.stderr||'';
  fs.writeFileSync(full(label+'.stdout.txt'),stdout);fs.writeFileSync(full(label+'.stderr.txt'),stderr);fs.writeFileSync(full(label+'.exit.txt'),String(result.status));
  append('\nCOMMAND '+label+': '+JSON.stringify([exe,...args])+'\nINPUT: '+JSON.stringify({targetPid:56664,seconds:6})+'\nEXIT_STATUS: '+result.status+'\nLITERAL_STDOUT_BEGIN\n'+stdout+'LITERAL_STDOUT_END\nLITERAL_STDERR_BEGIN\n'+stderr+'LITERAL_STDERR_END\n'+(result.error?'EXEC_ERROR: '+result.error.stack+'\n':''));
  if(result.status!==0) throw new Error(label+' failed: '+(stderr||stdout||String(result.error)));
  return result;
};
const parse=name=>fs.readFileSync(full(name+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
append('\nFINAL_MATCHED_TRANSACTION\nSOURCE_PRISTINE_SHA256: '+hash(full('hook_checks.pristine.js'))+'\nSOURCE_MODIFIED_SHA256: '+hash(full('hook_checks.js'))+'\nBINARY_SHA256_BEFORE: '+hash('F:/EVPlayer2/EVPlayer2.exe')+'\n');
fs.copyFileSync(full('hook_checks.pristine.js'),full('hook_checks.patchcheck.js'));
ledgerCommand('patch-reconstruction','C:/Program Files/Git/usr/bin/patch.exe',['--batch','--silent',full('hook_checks.patchcheck.js'),full('hook_checks.patch')]);
if(hash(full('hook_checks.patchcheck.js'))!==hash(full('hook_checks.js'))) throw new Error('Patch reconstruction mismatch');
append('PATCH_RECONSTRUCTION: exact SHA256 match with MODIFIED_FILE\n');
const results={};
for(const [label,agent] of [['baseline','hook_checks.pristine.js'],['modified','hook_checks.js'],['rollback','hook_checks.restored.js']]) {
  if(label==='rollback') {
    fs.copyFileSync(full('hook_checks.js'),full(agent));
    ledgerCommand('rollback-script','C:/Program Files/Git/bin/bash.exe',['--noprofile','--norc','-c','/h/orca/rea/site/evplayer2/hooks/ROLLBACK.sh /h/orca/rea/site/evplayer2/hooks/hook_checks.restored.js']);
    const restored=hash(full(agent)),pristine=hash(full('hook_checks.pristine.js'));if(restored!==pristine) throw new Error('Restored SHA256 mismatch');append('ROLLBACK_RESTORED_SHA256: '+restored+'\nROLLBACK_EQUALS_PRISTINE: true\n');
  }
  ledgerCommand(label,process.execPath,[full('observe.mjs'),'--agent',full(agent),'--output',full(label+'.jsonl'),'--pid','56664','--seconds','6']);
  const rows=parse(label),summary=rows.find(r=>r.kind==='summary'),selftest=rows.find(r=>r.kind==='selftest'),windows=rows.find(r=>r.kind==='window_snapshot'),audit=rows.find(r=>r.kind==='unload_audit');
  if(!summary||!selftest||!windows||!audit||!audit.allRestored) throw new Error(label+' missing successful observations');
  results[label]={enabled:summary.enabled,installed:summary.installed.length,failed:summary.failed,countsByOrigin:summary.countsByOrigin,selftest:{isDebuggerPresent:selftest.isDebuggerPresent,checkRemoteSuccess:selftest.checkRemoteSuccess,remoteDebuggerPresent:selftest.remoteDebuggerPresent},mainWindow:windows.windows.find(w=>w.title==='EVPlayer2'),audit:{checked:audit.checked,allRestored:audit.allRestored}};
  console.log(JSON.stringify({label,...results[label]}));
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
if(!equal(results.baseline.selftest,results.modified.selftest)||!equal(results.baseline.selftest,results.rollback.selftest)) throw new Error('Original debugger results changed');
if(!equal(results.baseline.mainWindow,results.modified.mainWindow)||!equal(results.baseline.mainWindow,results.rollback.mainWindow)) throw new Error('Main window state changed');
const before=hash(full('hook_checks.js'));fs.writeFileSync(full('hook_checks.js'),fs.readFileSync(full('hook_checks.pristine.js'),'utf8').replace('const HOOKS_ENABLED = false;','const HOOKS_ENABLED = true;'));if(hash(full('hook_checks.js'))!==before)throw new Error('Reapplied artifact mismatch');
const binaryAfter=hash('F:/EVPlayer2/EVPlayer2.exe');if(binaryAfter!=='1986e4607b8b5801afe060446f2edc2f186fb0fea19f0cbbf42550452efb6b3a')throw new Error('Original binary hash changed');
fs.writeFileSync(full('transaction_results.json'),JSON.stringify(results,null,2)+'\n');
append('\nOBSERVED_STATE_TRANSITIONS: pristine hooks=false -> modified hooks=true -> restored hooks=false.\nORIGINAL_DEBUGGER_RESULTS_UNCHANGED: true\nMAIN_WINDOW_UNCHANGED: true\nMODIFIED_GOAL_REAPPLIED: HOOKS_ENABLED=true; exact hash retained.\nBINARY_SHA256_AFTER: '+binaryAfter+'\nBINARY_UNCHANGED: true\nFINAL_RESULTS:\n'+JSON.stringify(results,null,2)+'\n');
console.log('TRANSACTION_OK');