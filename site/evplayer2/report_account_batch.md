# 当前账号视频批量导出

日期：2026-11-12。项目 H:/orca/rea/site/evplayer2，播放器 PID 67068。当前登录会话的课程树包含 10 个课程、334 条目录项，其中 331 个视频和 3 个其他条目。完整清单：media/batch/account_manifest.json。

已验证的顺序来源是 EVS 解密后的完整 M3U8。首个样本有 37 个分片，37 项 EXTINF 总和为 461 秒，与独立读取的 TsCtx 序号逐项一致。在播放位置 637ms 时已取得全部顺序并暂停，不需要完整播放。

批量流程：通过正常课程入口初始化授权与播放清单，暂停播放器，等待有效签名 URL；下载或只读复用已有缓存；在播放器解密上下文副本上直接解密各个分片；按 M3U8 顺序拼接；FFmpeg 不重新编码封装 MP4。

每个分片检查 MPEG-TS 包同步、传输错误和加扰标志。拼接后检查连续计数；MP4 检查时长、音视频流和首尾两秒解码。首个完整样本为 37 个分片、255484 个 TS 包、连续性错误 0，MP4 时长 461 秒、45776541 字节。四条验证命令均退出 0，stderr 为空。这些检查不等同于对每个完整视频执行过全程解码。

首个文件：media/account_mp4/6.过检测自动化框架研究制作/01.CDP自动化过检测框架自制说明.mp4。具体命令、literal stdout/stderr、退出状态和哈希：media/batch/work/01_001/verification.json。

脚本 media/batch/batch_download.mjs 已在后台启动。实时进度：media/batch/batch_progress.json 和 media/batch/导出进度.txt。进程信息：media/batch/batch_runner.json。日志：media/batch/batch.stdout.jsonl、batch.stderr.txt、batch_events.jsonl。输出按课程保存在 media/account_mp4。启动不代表全部完成，最终完成数与失败数以进度文件为准。

断点重跑会核对已经完成 MP4 的哈希并跳过，复用已解密分片。每项都有顺序、分片哈希、TS 校验和封装验证记录。签名尚未就绪时等待；遇到下载或授权错误保留失败记录，不修改授权判断。密钥和签名查询值不写入报告。

当前机制依赖已授权播放器会话，独立离线解密器尚未导出。原安装文件未修改；已有缓存只读复用，播放器仍可能按正常流程写入自己的缓存。新产生的分片副本与输出位于本项目。此前还原的 1833.100 秒 MP4 仍在 media/full_video/restored_video.mp4。

沿用四个固定角色：hooks/hook_checks.js、hooks/hook_checks.patch、hooks/VERIFICATION.txt、hooks/ROLLBACK.sh。历史 BASELINE 为关闭 hook、0 个入口；MODIFIED 为 15 个入口，卸载后 15/15 恢复；ROLLBACK 为独立副本恢复 pristine 哈希、0 个入口。三组均退出 0，调试器结果为 0，窗口 affinity 为 1。这些是此前观测，本轮没有重新执行。临时批量入口另有最终卸载审计，运行过程中不能提前声称已卸载。

后台记录器会在批量结束后生成 media/batch/batch_summary.json，将验证记录追加到原验证文件，并更新 checkpoint 和四个角色的哈希。


## 最终运行记录 2026-11-11T17:55:20.892Z

状态：finished_with_failures。完成 330/331，失败 1。最终临时入口恢复审计：true。完整结果：media/batch/batch_summary.json。原程序哈希核对：true。最终角色路径已重新读取并更新哈希清单。


## 最终运行记录 2026-11-12T08:41:59.070Z

状态：complete。完成 331/331，失败 0。最终临时入口恢复审计：true。完整结果：media/batch/batch_summary.json。原程序哈希核对：true。最终角色路径已重新读取并更新哈希清单。
