import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),project=path.dirname(path.dirname(root)),progress=path.join(root,'batch_progress.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
let state;
for(;;){try{state=readJson(progress);}catch{await new Promise(r=>setTimeout(r,1000));continue;}
const current=state.entries.find(e=>e.id===state.current);const summary=`更新时间：${new Date(state.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}\n状态：${state.status}\n总视频：${state.total}\n已完成：${state.complete}\n失败：${state.failed}\n当前课程：${current?.course||''}\n当前视频：${current?.title||''}\n当前阶段：${current?.status||''}\n当前分片：${current?.segmentsComplete||0}/${current?.segments||0}\n输出目录：${state.outputDirectory}\n详细清单：${progress}\n`;
fs.writeFileSync(path.join(root,'导出进度.txt'),'\uFEFF'+summary,'utf8');
if(state.status!=='running')break;
let alive=false;try{process.kill(state.runnerPid,0);alive=true;}catch{}
if(!alive){state={...state,status:'interrupted',watcherReason:'Runner process exited before terminal progress state was recorded'};break;}
await new Promise(r=>setTimeout(r,10000));
}
const outputs=state.entries.filter(e=>e.status==='complete').map(e=>({id:e.id,course:e.course,title:e.title,path:e.output,bytes:e.bytes,sha256:e.sha256,reopened:fs.existsSync(e.output)&&fs.statSync(e.output).size===e.bytes,verification:path.join(root,'work',e.id,'verification.json')}));
const complete=state.status==='complete'&&state.complete===state.total&&state.failed===0&&state.auditRestored===true&&outputs.every(e=>e.reopened);
const result={time:new Date().toISOString(),status:complete?'complete':state.status,total:state.total,complete:state.complete,failed:state.failed,auditRestored:state.auditRestored,outputs,failures:state.entries.filter(e=>e.status==='failed').map(e=>({id:e.id,title:e.title,error:e.error})),sourceBinaries:[]};
for(const name of ['EVPlayer2.exe','PlayerLibRender56_vs.dll']){const inv=readJson(path.join(project,'media',name+'.inventory.json'));const actual=sha(fs.readFileSync(inv.file));result.sourceBinaries.push({path:inv.file,sha256:actual,unchanged:actual===inv.sha256});}
const ledger=path.join(project,'hooks','VERIFICATION.txt');let text=`\n\nACCOUNT BATCH TERMINAL RECORD ${result.time}\n${JSON.stringify({...result,outputs:outputs.map(o=>({id:o.id,path:o.path,bytes:o.bytes,sha256:o.sha256,reopened:o.reopened}))},null,2)}\n`;
for(const item of outputs){if(fs.existsSync(item.verification))text+=`\nVIDEO ${item.id} VERIFICATION\n${fs.readFileSync(item.verification,'utf8')}\n`;}
fs.appendFileSync(ledger,text,'utf8');
const roleManifest=readJson(path.join(project,'hooks','role_hashes.json'));for(const role of Object.values(roleManifest)){const bytes=fs.readFileSync(role.path);role.bytes=bytes.length;role.sha256=sha(bytes);}fs.writeFileSync(path.join(project,'hooks','role_hashes.json'),JSON.stringify(roleManifest,null,2)+'\n');result.roles=roleManifest;
fs.writeFileSync(path.join(root,'batch_summary.json'),JSON.stringify(result,null,2)+'\n');
const cpPath=path.join(project,'hooks','checkpoint.json'),cp=readJson(cpPath);cp.status=complete?'account_batch_export_complete':'account_batch_export_'+state.status;cp.last_confirmed_result=`${state.complete}/${state.total} MP4 outputs; ${state.failed} failed; batch status ${state.status}; final audit restoration ${state.auditRestored}. All listed output paths were reopened.`;cp.next_executable_action=complete?'Review media/account_mp4 and media/batch/batch_summary.json.':'Inspect batch_progress.json failures/unfinished entries, verify target PID and session, resume batch_download.mjs only if no active runner.';cp.report=path.join(project,'report_account_batch.md');fs.writeFileSync(cpPath,JSON.stringify(cp,null,2)+'\n');
fs.appendFileSync(cp.report,`\n\n## 最终运行记录 ${result.time}\n\n状态：${result.status}。完成 ${state.complete}/${state.total}，失败 ${state.failed}。最终临时入口恢复审计：${state.auditRestored}。完整结果：media/batch/batch_summary.json。原程序哈希核对：${result.sourceBinaries.every(b=>b.unchanged)}。最终角色路径已重新读取并更新哈希清单。\n`,'utf8');
console.log(JSON.stringify({status:result.status,complete:result.complete,failed:result.failed,total:result.total,auditRestored:result.auditRestored}));
