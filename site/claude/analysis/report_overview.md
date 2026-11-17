# Claude Code 静态分析 · v2

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

已导入 34 个有 integrity / SHA-256 记录的官方样本，其中 27 个原生平台样本抽出模块图。S1/S2/S3 覆盖 macOS arm64、Windows x64、Linux arm64；258–326 的 macOS 版本按间隔取样，并补齐五个相邻升级边界。

最高优先级结论：Linux/arm64 是官方发布形态。2.1.325 的 SDK 常量为 0.128.0，内嵌 Bun 1.4.4 (6634fc3b5)，原生 Node 兼容常量为 v26.12.1，SDK 在 Bun 下走 node 分支。Subway 的 0.94.0 / v24.3.0 不符合这些精确样本；“团队没采到 Linux”本身不能证明平台不合法。

Bun 版本必须带 revision。独立 npm Bun 1.4.4 工具自报 v26.3.0，与 Claude 同为 1.4.4 的内嵌构建不同。version-map 的 runtime_version_reported 是“兼容常量 + SDK 调用链”的推断，用户团队采集只作 USER-SUPPLIED 交叉线索。


| 交付 | 内容 | 验收边界 |
| --- | --- | --- |
| [claude-real-fingerprint.md](claude-real-fingerprint.md) | 版本、完整头构造、顺序、UA、系统前导 | 静态 + SDK 切片 / 独立 Bun loopback |
| [fingerprint-domain-rules.md](fingerprint-domain-rules.md) | OS/Arch 枚举、合法联动、27 条版本记录、5 个精确边界 | version-map / fingerprint-rules JSON |
| [beta-matrix.md](beta-matrix.md) | 48 条 CLI 注册项、128 格条件场景、8 格 count_tokens、有序变更规则 | 动态 flag/模型事实/会话状态必须另行输入 |
| [billing-fields.md](billing-fields.md) | 完整字段、UTF-16 算法、3 例、metadata、77→78 切换 | cch 最终线上值未采样 |
| [oauth-auth.md](oauth-auth.md) | OAuth、setup-token、scope、刷新 | 有效期是请求与服务端回包逻辑，未换取真实 token |
| [tls-features.md](tls-features.md) | Bun fetch / BoringSSL 静态线索、代理、TLS 配置 | 官方 JA3/JA4、h2 和实际 Go 线序未测 |
| [subway-diff.md](subway-diff.md) | 用户提供 f314f5d7 基准逐项处置 | 未声称访问生产库或 Subway 源码 |

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。

证据定位示例：`ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain。SDK 独立包目录假设已删除；undici 字符串仍存在于代理兼容分支，不能把“无 npm dependencies”扩大成“任何代码中都没有 undici”。

本次 registry 元数据中，主包 2.1.326 的八个 optionalDependencies 已全部指向 2.1.326；对应 darwin-arm64 包成功下载校验。用户早先“326 主包仍指向 325”的观察不能代表本次取样时点。`NPM-MANIFEST-S7` — S7 · `package/package.json:optionalDependencies` · m=0 · file-byte=0 · literal。

取样与复算入口见 [README](../README.md)。所有正文事实的来源以证据索引和样本哈希为准。可选完整客户端 TLS 抓取未开展；实际部署 flag 状态和生产服务端拒绝分支无法由静态包唯一确定。
