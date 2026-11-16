import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const media=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(media),out=path.join(media,'full_video');
const read=p=>JSON.parse(fs.readFileSync(p));
const result=read(path.join(out,'full_result.json')),latest=read(path.join(out,'latest_capture.json')),capture=read(latest.result),headLatest=read(path.join(out,'latest_head_capture.json')),head=read(headLatest.result),order=read(path.join(out,'segment_order.json')),assembly=read(path.join(out,'latest_assembly.json')),clean=read(path.join(out,'clean_ts_result.json')),restore=read(path.join(out,'playback_state_restored.json'));
const checkpoint=read(path.join(root,'hooks/checkpoint.json')),roleBefore=read(path.join(root,'hooks/role_hashes.json')),historical=read(path.join(root,'hooks/transaction_results.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),fileHash=p=>sha(fs.readFileSync(p));
if(!result.complete||!restore.success||!order.all147ReadInOrder)throw new Error('Full recovery, segment order or playback restoration is incomplete');
if(fileHash(result.output)!==result.sha256)throw new Error('MP4 hash changed');
if(result.fullDecode.exitStatus!==0||result.fullDecode.stderr||result.commands.some(x=>x.exitStatus!==0))throw new Error('Verification command failed');
if(capture.audit.some(x=>!x.restored)||head.audit.some(x=>!x.restored))throw new Error('Hooks not restored');
const binaries=['EVPlayer2.exe','PlayerLibRender56_vs.dll'].map(name=>{const inv=read(path.join(media,name+'.inventory.json')),actual=fileHash(inv.file);if(actual!==inv.sha256)throw new Error('Installed binary hash mismatch');return {file:inv.file,sha256:actual,matchesInventory:true};});
const cacheFiles=order.ordered.map(x=>({index:x.index,file:x.cachePath,bytes:fs.statSync(x.cachePath).size,sha256:fileHash(x.cachePath)}));
const cachedBytes=cacheFiles.reduce((n,x)=>n+x.bytes,0);if(cachedBytes!==assembly.bytes)throw new Error('Assembled clear byte count differs from ordered encrypted cache total');
fs.writeFileSync(path.join(out,'source_hashes.json'),JSON.stringify({time:new Date().toISOString(),binaries,cachedBytes,cacheFiles},null,2)+'\n');
const delivered=path.join(out,'restored_video.mp4');
if(!fs.existsSync(delivered))fs.copyFileSync(result.output,delivered,fs.constants.COPYFILE_EXCL);
if(fileHash(delivered)!==result.sha256)throw new Error('Delivered MP4 copy differs');
const records=read(path.join(latest.run,'verification_commands.json'));
const decodeText=p=>{const b=fs.readFileSync(p);return b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):b.toString('utf8').replace(/^\uFEFF/,'');};
for(const [script,label] of [['capture_full_video.mjs','capture'],['capture_video_head.mjs','head_capture'],['capture_video_head.mjs','head_capture_retry'],['assemble_full_video.mjs','assembly'],['clean_full_ts.mjs','clean_ts'],['verify_full_video.mjs','verify_full'],['restore_playback_state.mjs','restore_state'],['extract_segment_order.mjs','extract_order']]){
 const stdout=path.join(out,label+'.stdout.txt'),stderr=path.join(out,label+'.stderr.txt'),exit=path.join(out,label+'.exit.txt');
 if(!fs.existsSync(stdout)||!fs.existsSync(stderr)||!fs.existsSync(exit))throw new Error('Missing command ledger files for '+label);
 records.push({label,executable:'F:/Program Files/nodejs/node.exe',args:[path.join(media,script)],stdout:decodeText(stdout),stderr:decodeText(stderr),exitStatus:Number(decodeText(exit))});
}
fs.writeFileSync(path.join(out,'execution_records.json'),JSON.stringify(records,null,2)+'\n');
const report=path.join(root,'report_full_video.md');
const body=`# 完整视频还原与分片顺序验证

已还原当前播放器加载的《Fingerprint 指纹：屏幕和可检测点》，视频时长 30:33.100。这条视频已在本轮开始前由用户界面切换，与上一轮 13:24.150 的 10 秒预览不是同一条。执行对象始终是 H:/orca/rea/site/evplayer2 及 F:/EVPlayer2/EVPlayer2.exe（PID 56664）。

## 成品

- MP4：${delivered}
- 大小：${result.bytes} 字节，约 ${(result.bytes/1024/1024).toFixed(2)} MiB。
- SHA256：${result.sha256}
- 视频：H.264，${result.video.width}×${result.video.height}，${result.video.frames} 帧，${result.video.duration} 秒。
- 音频：AAC，44100 Hz，双声道；保留原始音视频流，无重编码。
- MP4 容器时长 ${result.durationSeconds} 秒；与播放器标称时长差约 ${result.durationDeltaMs.toFixed(3)} ms。

## 分片顺序的替代获取方式

不需要先播放一遍来猜测顺序。已直接读取现有 M3u8Ctx 的分片映射，并读取每个 TsCtx+0x08 中的 uint32 原始序号。映射有 148 项，其中描述自身的一项序号为 0xFFFFFFFF；其余 147 项排序后恰为 0..146，无重复、无缺失。

树形映射按文件名检索，UUID 的字典序不能当作播放顺序。序号表与完整读取记录独立交叉验证，147/147 个缓存文件全部存在、全部按 0..146 读取。最后又使用独立的只读脚本重新取得同一顺序表，没有触发播放或安装 Hook。

- JSON：${path.join(out,'segment_order.json')}
- CSV：${path.join(out,'segment_order.csv')}
- 只读脚本：${path.join(media,'extract_segment_order.mjs')}
- 方法及其他选项：${path.join(root,'report_segment_order.md')}

本次最新只读快照使用 io=${order.io}、M3u8Ctx=${order.context}。地址只对本次进程、这条视频有效；切换视频或重启后需重新定位，不能盲用旧堆地址。

## 完整性证据

1. 对现有 +0x388A0 解密读取输出连续采样，以播放器公开的 3 倍速从片头读取至片尾。主体取得 ${capture.rawBytes} 字节，${capture.chunks} 次有序回传；主机序号和写入偏移连续，无丢失。
2. 首轮 seek 后预读导致约 8 秒片头未被采样。补取片头后，以主体开头的 64 KiB 指纹查找唯一重叠，连续 ${assembly.exactOverlapBytes} 字节相同；接回 ${assembly.prefixBytes} 字节，保留主体原件。
3. 拼接后含填充的数据大小为 ${assembly.bytes} 字节，恰等于顺序表内 147 个原缓存文件的总字节数 ${cachedBytes}。这项字节计数与零缺失分片、视频帧数共同支持本轮完整性结论。
4. 在 ${clean.paddingLocations} 个分片尾部位置发现共 ${clean.paddingBytes} 个 0x23（#）填充字节。仅在连续 188 字节 TS 包之间移除经验证的至多 16 字节填充；没有改写 TS 包内数据。清理后 ${clean.outputBytes} 字节、${clean.packets} 包。
5. TS 全量检查：同步错误 ${result.tsStats.syncErrors}、transport error ${result.tsStats.transportErrors}、残留加扰包 ${result.tsStats.scrambledPackets}、连续计数错误 ${result.tsStats.continuityErrors}。
6. FFmpeg -xerror 对整条视频和音频完全解码，退出 0，stderr 为空。FFprobe、无损封装、首/中/尾抽帧、首尾各 6 秒 FFplay 静音试播，9 个命令全部退出 0。抽出的三个画面均已目视确认。

首帧：${result.frames[0].file}

中间：${result.frames[1].file}

片尾：${result.frames[2].file}

## 原播放器和原文件状态

采样 Hook +0x388A0 和 ReadFile 均卸载，逐一验证原 16 字节恢复。EXE 和渲染 DLL 的 SHA256 与前轮清单一致。缓存只读，147 个源文件的大小和本轮结束哈希保存在 source_hashes.json；不能把这次结束哈希误当成本轮开始前的全量哈希对照。

播放器到片尾后进入 stopped，原先 restore 中的 seek/speed 不会真正恢复播放状态。已重新通过公开 playFile 打开原有 QString 源，补齐片头后，另外执行状态恢复：进度从本轮最初 ${capture.prepared.saved.currentMs} ms 恢复至 ${restore.after.currentMs} ms，倍速 ${restore.after.speed}，paused=${restore.after.paused}、stopped=${restore.after.stopped}，源视频身份相同。原 PID 未被重启或终止。

## 错误与修正

- 静态反汇编首次假设所有入口都有 .pdata 边界，+0x3AAC0 的叶函数缺边界导致 missing argument，退出 1；改为有界解析叶函数/尾跳转后退出 0。
- 初版顺序构建把描述自身的映射项当成 TS，path.join 收到 undefined，退出 1；识别并排除 0xFFFFFFFF 自项后得到 147 个连续序号。
- 首轮补片头在 stopped 状态无法读取；其恢复阶段又因中途重新打开使旧 getter 链为空而失败，保留失败 capture_result。重新打开后再次采样完成。
- 第一次从 Frida 调用 playFile 时，默认 NativeFunction 异常截获返回 system error（异常上下文码 0x4001000A），退出 1；改用 exceptions:'propagate' 让原程序处理其本地异常后，playFile 返回 1，进程继续响应。
- 拼接初版把分片间填充当成 TS 同步损坏，退出 1；检查字面内容确定是 # 填充，记录重同步区间，并在独立清理步骤移除。最终无损封装及全片解码没有 stderr。

上述失败没有被覆盖成成功；各阶段 JSON、stdout/stderr 和退出状态保留在 full_video 目录及 VERIFICATION。

## 既有四个角色

${Object.entries(checkpoint.roles).map(([k,v])=>'- '+k+': '+v).join('\n')}

本轮扩展这些角色的证据记录，不替换既有角色。历史对照未重跑：BASELINE 的 HOOKS_ENABLED=false，0 个 Hook；MODIFIED 的 HOOKS_ENABLED=true，15 个 Hook，174 次应用 IsDebuggerPresent 调用，15/15 入口恢复；ROLLBACK 在独立副本将该字段恢复 false，哈希等于 pristine。三组调试自检的 IsDebuggerPresent/CheckRemoteDebuggerPresent 输出均为 0/0，窗口 affinity 均为 1。
`;
fs.writeFileSync(report,body);
const marker='=== FULL VIDEO RESTORATION '+result.sha256+' ===',ledgerFile=checkpoint.roles.VERIFICATION;
if(!fs.readFileSync(ledgerFile,'utf8').includes(marker)){
 let text='\n'+marker+'\nTARGET: '+root+'\nReport: '+report+'\nChanged field from prior transaction: HOOKS_ENABLED false -> true; same role bytes reused this turn.\nNew requested results: full recovery; alternate source for segment order.\n';
 for(const r of records)text+='\nCOMMAND '+JSON.stringify({label:r.label,executable:r.executable,args:r.args})+'\nEXIT '+r.exitStatus+'\nSTDOUT (literal):\n'+r.stdout+'\nSTDERR (literal):\n'+r.stderr+'\n';
 text+='\nObserved states / assembly / TS cleaning\n'+JSON.stringify({captureComplete:capture.complete,captureReason:capture.reason,bodyAudit:capture.audit,headAudit:head.audit,assembly,clean,restore,result},null,2)+'\nSOURCE BINARY HASHES\n'+JSON.stringify(binaries,null,2)+'\nHISTORICAL BASELINE/MODIFIED/ROLLBACK (not rerun)\n'+JSON.stringify(historical,null,2)+'\n';
 text+='\nAdditional corrected tool errors (separate commands):\n1. Frida inspect: Error: missing argument; exit 1. Corrected leaf range handling: exit 0.\n2. TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined; exit 1. Excluded descriptor self entry: exit 0.\n3. NativeFunction playFile: Error: system error, address 0x7ff90f63408a, context rdi=0x4001000a; exit 1. Retried with exceptions=propagate: playFileResult=1, exit 0.\n4. assemble_full_video.mjs: Error: TS sync error in head; exit 1. Bounded resynchronization + independent validated # padding removal: exit 0.\n';
 fs.appendFileSync(ledgerFile,text);
}
const roles={};
for(const [role,file] of Object.entries(checkpoint.roles)){const bytes=fs.readFileSync(file),hash=sha(bytes);if(role!=='VERIFICATION'&&hash!==roleBefore[role].sha256)throw new Error('Existing role changed unexpectedly: '+role);roles[role]={path:file,bytes:bytes.length,sha256:hash};}
fs.writeFileSync(path.join(root,'hooks/role_hashes.json'),JSON.stringify(roles,null,2)+'\n');
const delivery={time:new Date().toISOString(),activeObject:root,complete:true,output:delivered,bytes:result.bytes,sha256:result.sha256,video:result.video,durationSeconds:result.durationSeconds,segmentCount:order.count,segmentOrderJson:path.join(out,'segment_order.json'),segmentOrderCsv:path.join(out,'segment_order.csv'),report,orderReport:path.join(root,'report_segment_order.md'),restoredPlaybackState:restore.after,roles};
fs.writeFileSync(path.join(out,'delivery.json'),JSON.stringify(delivery,null,2)+'\n');
checkpoint.status='full_video_recovered_and_verified';checkpoint.last_confirmed_result='Recovered current 1833.100s H264/AAC video; 147/147 original indices read from M3u8Ctx/TsCtx memory and matched to cache reads; body plus exact-overlap head equals total cache bytes, removed # padding, remuxed without reencoding, decoded every stream with exit 0 and no stderr, start/end playback passed; restored 1.5x paused at 347407ms.';
checkpoint.next_executable_action='Use delivered restored_video.mp4 and segment_order.json for review. A different video requires its current M3u8Ctx context to be rebound.';
checkpoint.input_paths=[delivered,path.join(out,'delivery.json'),path.join(out,'segment_order.json'),path.join(media,'extract_segment_order.mjs'),report];
checkpoint.acceptance_event='147 contiguous sequence indices, exact complete-byte accounting, 36662 frames and 1833.100s video, complete error-free decode and two successful playback checks; original binary hashes and Hook restoration audited; four role paths reopened.';
checkpoint.report=report;checkpoint.reports=[...new Set([...(checkpoint.reports??[]),report,path.join(root,'report_segment_order.md')])];checkpoint.remaining_unknowns=['Independent reusable offline decryption key/algorithm is not derived; this successful recovery uses the current player session.','Other cached videos have not been mapped or exported.'];
fs.writeFileSync(path.join(root,'hooks/checkpoint.json'),JSON.stringify(checkpoint,null,2)+'\n');
for(const p of [delivered,report,delivery.orderReport,delivery.segmentOrderJson,delivery.segmentOrderCsv,path.join(out,'delivery.json'),path.join(out,'source_hashes.json'),path.join(out,'execution_records.json'),...Object.values(checkpoint.roles)]){const b=fs.readFileSync(p);if(p.endsWith('.json'))JSON.parse(b);}
for(const r of Object.values(roles))if(fileHash(r.path)!==r.sha256)throw new Error('Role changed after reopen');
console.log(JSON.stringify({...delivery,originalBinariesMatch:true,allClaimedPathsReopened:true}));
