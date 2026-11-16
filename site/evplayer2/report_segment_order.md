# 分片顺序的两种已验证来源

更新日期：2026-11-12。项目：H:/orca/rea/site/evplayer2。无需通过完整播放收集分片顺序，目前已分别验证内存序号和解密后的播放清单。

## 一、读取现成的内存序号

此前 PID 56664 的 1833.100 秒视频中，M3u8Ctx+0x2A8 保存 TsCtx 映射。Windows std::map 节点 +0x20 是文件名字串，+0x40 是 TsCtx 指针；TsCtx+0x08 的 uint32 是分片序号。映射按文件名排列，因此遍历顺序不是播放顺序，需要按这个字段排序。

该样本映射有 148 项，排除序号 0xFFFFFFFF 的 EVS 自身条目后，得到连续的 0..146 共 147 个 TS。147 项与独立采集的实际缓存读取顺序逐项相同。证据：media/full_video/segment_order.json、segment_order.csv、readonly_order_snapshot.json。此处 PID 和地址属于此前进程，不得在新进程中直接复用。

## 二、从 EVS 实际解密输出取得 M3U8

当前 PID 67068。样本是“01.CDP自动化过检测框架自制说明.mp4”。在 PlayerLibRender56_vs.dll+0x3ec80 观测实际解密输出，仅接收 TsCtx 序号为 0xFFFFFFFF 的 EVS 清单上下文，未读取分片密钥到报告中。

两次输出共 2592 字节，拼接结果以 #EXTM3U 开头，包含 #EXT-X-ENDLIST、37 个分片和 37 个 EXTINF。时长总和为 461 秒，等于播放器 duration 461000ms。37 个文件名与独立读取 TsCtx+8 得到的连续序号逐项相同。播放器在 637ms 时已取得完整清单并暂停。临时观测器卸载后 5/5 个入口恢复。

先前解密的授权描述是含 host、req、dkey 等字段的 JSON，它本身不是顺序表；顺序来自后续 EVS 解密出的 M3U8。导出的清单只保留必要 HLS 标签与分片文件名，不保存密钥或签名查询值。

证据：media/batch/decrypted_playlist.m3u8、decrypted_playlist_order.json、playlist_order_verification.json、direct_segment_order.json。

对应的 37 个加密分片已通过授权上下文的副本直接解密，TS 连续性错误为 0，最终 MP4 为 461 秒、45776541 字节。路径：media/account_mp4/6.过检测自动化框架研究制作/01.CDP自动化过检测框架自制说明.mp4。详细验证：media/batch/work/01_001/verification.json。

## 边界与批量使用

打开视频并完成授权、清单初始化后即可取得顺序，不必播完整段。单独解密散落的 TS 只能以 PTS/DTS 等辅助推断；出现时间戳重置或 discontinuity 时，不能把 PTS 排序当作原始顺序的充分证据。缓存 UUID 和文件目录顺序不表示播放顺序。

当前批量脚本使用解密后的 M3U8，并与独立 TsCtx 序号交叉检查，再下载、解密和封装 MP4。它依赖已授权的播放器会话，独立离线解密器尚未导出。进度见 media/batch/batch_progress.json，批量说明见 report_account_batch.md。

本文件原有历史段落存在字符编码损坏，本次根据原 JSON 证据重新整理为 UTF-8；修复前副本保存在 media/batch/report_segment_order.before_utf8_repair.md。
