# 字段取值域与合法组合规则

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

规则供官方客户端默认探测路径的自洽校验使用。SDK 的可编码取值域、官方发布的平台集合、实际采集到的样本集合是三种不同证据。ANTHROPIC_CUSTOM_HEADERS / options.headers 可覆盖核心识别头，因此任意配置下的可发送值不是有限枚举；显式覆盖需另记 identification_headers_overridden=true，校验器返回 unknown。下面“合法组合”指无此覆盖的官方构建，不据此断言所有可配置官方客户端都绝不可能发出其它值。校验器见 [validate-profile.mjs](validate-profile.mjs)，规则数据见 [fingerprint-rules.json](fingerprint-rules.json)。

Runtime 判定顺序为 Deno.build → EdgeRuntime → process 的 [object process] → unknown；属性构造中还会尝试浏览器 UA。不存在独立 Bun 判定，Bun 暴露 process 因此报 node。Runtime-Version 在该分支直接读取 process.version，既不读宿主外部 Node 安装，也不把 Bun.version 写进去。`ST-DETECT` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:se` · m=1138 · b=283347325 · call-chain<br>`ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain<br>`ST-MEMO` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:CGr` · m=3760 · b=283349947 · call-chain


| 输入域 | 输出域 / 顺序 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| OS（先转小写） | 包含 ios→iOS；包含 android→Android；darwin→MacOS；win32→Windows；freebsd→FreeBSD；openbsd→OpenBSD；linux→Linux；其它非空→Other:<lowercase>；空→Unknown | `ST-OS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:L` · m=3469 · b=283349656 · call-chain |
| Arch | x32→x32；x86_64/x64→x64；arm→arm；aarch64/arm64→arm64；其它非空→other:<input>；空→unknown。ia32 实际成为 other:ia32。 | `ST-ARCH` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:H` · m=3287 · b=283349474 · call-chain |
| Deno | Runtime=deno；OS/Arch 取 Deno.build；version 为 Deno.version 字符串或 .deno，缺省 unknown | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| Edge | OS=Unknown；Arch=other:<EdgeRuntime>；Runtime=edge；Version=process?.version ?? unknown | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| Node / Bun process | OS/Arch 来自 process.platform/arch；Runtime=node；Version=process.version ?? unknown；属性经 CGr 缓存 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain<br>`ST-MEMO` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:CGr` · m=3760 · b=283349947 · call-chain |
| 无已知运行时 / 浏览器 | 浏览器 UA 可得 browser:<名称> 与解析版本；否则 OS=Unknown, Arch=unknown, Runtime=unknown, Runtime-Version=unknown | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| 官方平台包 | MacOS arm64/x64、Windows arm64/x64、Linux arm64/x64（glibc/musl）。源码另有 Android 键，但此主包未发布对应 optionalDependency。 | `NPM-MANIFEST-S5` — S5 · `package/package.json:optionalDependencies` · m=0 · file-byte=0 · literal<br>`INSTALL-S5-getPlatformKey` — S5 · `package/install.cjs:getPlatformKey` · m=3710 · file-byte=3718 · call-chain |
| Rosetta | 安装脚本在 darwin+x64 且 sysctl.proc_translated=1 时选择 arm64；运行时上报二进制自身 process.arch，不能从安装用 Node 推断。 | `INSTALL-S5-getPlatformKey` — S5 · `package/install.cjs:getPlatformKey` · m=3710 · file-byte=3718 · call-chain |

例如 OS 输入 unknown 会成为 Other:unknown；Node 缺失 platform 先回退字符串 unknown，因此与空输入的 Unknown 不同。具体离线枚举在 offline-results-bun-*.json 中。

## 版本映射与精确升级点

完整机器表：[version-map.json](version-map.json)。只收录校验过的精确样本，不把间隔内每版标为已验证；不同平台同一 CLI 仍分别留行。下面 runtime 列均为原生常量推断。每行的 VERSION 证据包含 Bun/node 字符串的二进制偏移。

| CLI | 平台 / 样本 | SDK | Bun / revision | Node 兼容常量 | 证据 |
| --- | --- | --- | --- | --- | --- |
| 2.1.258 | darwin-arm64 / S4b | 0.112.1 | 1.4.1 / e6b1ba42d | v26.3.0 | `VERSION-S4b` |
| 2.1.268 | darwin-arm64 / V2.1.268-darwin-arm64 | 0.112.1 | 1.4.1 / 83c373b27 | v26.3.0 | `VERSION-V2.1.268-darwin-arm64` |
| 2.1.269 | darwin-arm64 / V2.1.269-darwin-arm64 | 0.112.1 | 1.4.3 / 047f2e8e6 | v26.3.0 | `VERSION-V2.1.269-darwin-arm64` |
| 2.1.270 | darwin-arm64 / V2.1.270-darwin-arm64 | 0.112.1 | 1.4.3 / 047f2e8e6 | v26.3.0 | `VERSION-V2.1.270-darwin-arm64` |
| 2.1.273 | darwin-arm64 / V2.1.273-darwin-arm64 | 0.112.1 | 1.4.3 / 8c28b3167 | v26.3.0 | `VERSION-V2.1.273-darwin-arm64` |
| 2.1.278 | darwin-arm64 / V2.1.278-darwin-arm64 | 0.112.1 | 1.4.3 / 8c28b3167 | v26.3.0 | `VERSION-V2.1.278-darwin-arm64` |
| 2.1.280 | darwin-arm64 / S4a | 0.112.1 | 1.4.3 / f08e57bec | v26.3.0 | `VERSION-S4a` |
| 2.1.284 | darwin-arm64 / V2.1.284-darwin-arm64 | 0.112.1 | 1.4.3 / eecfd55de | v26.3.0 | `VERSION-V2.1.284-darwin-arm64` |
| 2.1.285 | darwin-arm64 / V2.1.285-darwin-arm64 | 0.127.0 | 1.4.3 / eecfd55de | v26.3.0 | `VERSION-V2.1.285-darwin-arm64` |
| 2.1.286 | darwin-arm64 / V2.1.286-darwin-arm64 | 0.127.0 | 1.4.3 / eecfd55de | v26.3.0 | `VERSION-V2.1.286-darwin-arm64` |
| 2.1.287 | darwin-arm64 / V2.1.287-darwin-arm64 | 0.127.0 | 1.4.3 / eecfd55de | v26.3.0 | `VERSION-V2.1.287-darwin-arm64` |
| 2.1.288 | darwin-arm64 / V2.1.288-darwin-arm64 | 0.128.0 | 1.4.3 / eecfd55de | v26.3.0 | `VERSION-V2.1.288-darwin-arm64` |
| 2.1.296 | darwin-arm64 / V2.1.296-darwin-arm64 | 0.128.0 | 1.4.3 / eecfd55de | v26.3.0 | `VERSION-V2.1.296-darwin-arm64` |
| 2.1.301 | darwin-arm64 / V2.1.301-darwin-arm64 | 0.128.0 | 1.4.3 / 9ecafc196 | v26.3.0 | `VERSION-V2.1.301-darwin-arm64` |
| 2.1.302 | darwin-arm64 / V2.1.302-darwin-arm64 | 0.128.0 | 1.4.4 / 0049fd75e | v26.3.0 | `VERSION-V2.1.302-darwin-arm64` |
| 2.1.303 | darwin-arm64 / V2.1.303-darwin-arm64 | 0.128.0 | 1.4.4 / 0049fd75e | v26.3.0 | `VERSION-V2.1.303-darwin-arm64` |
| 2.1.306 | darwin-arm64 / V2.1.306-darwin-arm64 | 0.128.0 | 1.4.4 / 575938147 | v26.3.0 | `VERSION-V2.1.306-darwin-arm64` |
| 2.1.310 | darwin-arm64 / V2.1.310-darwin-arm64 | 0.128.0 | 1.4.4 / 2c2ae6246 | v26.3.0 | `VERSION-V2.1.310-darwin-arm64` |
| 2.1.311 | darwin-arm64 / V2.1.311-darwin-arm64 | 0.128.0 | 1.4.4 / 0ae49f8b6 | v26.12.1 | `VERSION-V2.1.311-darwin-arm64` |
| 2.1.312 | darwin-arm64 / V2.1.312-darwin-arm64 | 0.128.0 | 1.4.4 / 0ae49f8b6 | v26.12.1 | `VERSION-V2.1.312-darwin-arm64` |
| 2.1.314 | darwin-arm64 / V2.1.314-darwin-arm64 | 0.128.0 | 1.4.4 / adbced227 | v26.12.1 | `VERSION-V2.1.314-darwin-arm64` |
| 2.1.318 | darwin-arm64 / V2.1.318-darwin-arm64 | 0.128.0 | 1.4.4 / 424a542a9 | v26.12.1 | `VERSION-V2.1.318-darwin-arm64` |
| 2.1.325 | darwin-arm64 / S1 | 0.128.0 | 1.4.4 / 6634fc3b5 | v26.12.1 | `VERSION-S1` |
| 2.1.325 | linux-arm64 / S3 | 0.128.0 | 1.4.4 / 6634fc3b5 | v26.12.1 | `VERSION-S3` |
| 2.1.325 | win32-x64 / S2 | 0.128.0 | 1.4.4 / 6634fc3b5 | v26.12.1 | `VERSION-S2` |
| 2.1.326 | darwin-arm64 / S6 | 0.128.0 | 1.4.4 / 6634fc3b5 | v26.12.1 | `VERSION-S6` |
| 2.1.326 | linux-arm64 / V2.1.326-linux-arm64 | 0.128.0 | 1.4.4 / 6634fc3b5 | v26.12.1 | `VERSION-V2.1.326-linux-arm64` |

| 相邻边界 | 字段 | 旧→新 | 范围 |
| --- | --- | --- | --- |
| 2.1.268 → 2.1.269 | bun_version | 1.4.1 → 1.4.3 | darwin-arm64；两个相邻版本原始字节 |
| 2.1.284 → 2.1.285 | sdk_version | 0.112.1 → 0.127.0 | darwin-arm64；两个相邻版本原始字节 |
| 2.1.287 → 2.1.288 | sdk_version | 0.127.0 → 0.128.0 | darwin-arm64；两个相邻版本原始字节 |
| 2.1.301 → 2.1.302 | bun_version | 1.4.3 → 1.4.4 | darwin-arm64；两个相邻版本原始字节 |
| 2.1.310 → 2.1.311 | runtime_version_reported | v26.3.0 → v26.12.1 | darwin-arm64；两个相邻版本原始字节 |

SDK/Bun 升级点不等于每次构建 revision 改变点。所有已取样 revision 都保留；未宣称检查了区间内每一个构建。

Linux/arm64 + 2.1.325 合法：S3 是官方发布的 ELF arm64，可构造的完整静态组合为 CLI=2.1.325 / SDK=0.128.0 / Bun=1.4.4 (6634fc3b5) / Runtime=node / Runtime-Version=v26.12.1 / OS=Linux / Arch=arm64 / Lang=js。Runtime-Version 尚未经 Linux 实际执行验证。`VERSION-S3` — S3 · `/$bunfs/root/chunk-c1e43we7.js:SDK package version` · m=1048 · b=304914068 · literal<br>`ST-CROSS-S3` — S3 · `/$bunfs/root/chunk-c1e43we7.js:SDK platform branch` · m=996 · b=304914016 · call-chain

版本、SDK、Bun revision、process.version 和二进制哈希作为一个构建元组保存；OS/Arch 按平台配对。UA、billing entrypoint 与 workload 按请求上下文生成；metadata 的设备、账号、会话作用域分别保存。beta 必须按模型事实、认证、flag 和会话拒绝状态重新求值，不能按九个常量模板判合法。

## 跨版本已复核的变化


| 类型 | 258 / 280 / 325 对比 | 来源 |
| --- | --- | --- |
| 算法保持 | SDK runtime/OS/Arch 分支语义一致；包版本常量变化。 | `ST-CROSS-S4b`、`ST-CROSS-S4a`、`ST-CROSS-S1` |
| 算法保持 | billing salt、UTF-16 [4,7,20]、SHA-256、取前三 hex 相同。 | `CROSS-BILLING-S4b` — S4b · `/$bunfs/root/chunk-darxmw8c.js:Mct` · m=3714777 · b=164472717 · call-chain<br>`CROSS-BILLING-S4a` — S4a · `/$bunfs/root/chunk-dt8bvbsd.js:_Se` · m=981684 · b=178275952 · call-chain<br>`BILLING-INDEX` — S1 · `/$bunfs/root/chunk-gpympest.js:T$s` · m=2012 · b=286835815 · call-chain |
| 字段增加 | 258 的 billing 到 cc_prompt_id；280 增 cc_turn_origin；325 又包含 prompt/turn index、gateway、project、上一压缩消息及 dispatch 等字段。不是只换版本常量。 | `CROSS-BILLING-FIELDS-S4b` — S4b · `/$bunfs/root/chunk-zskn8f78.js:billing builder` · m=1400 · b=159167302 · call-chain<br>`CROSS-BILLING-FIELDS-S4a` — S4a · `/$bunfs/root/chunk-q2t02exe.js:billing builder` · m=2200 · b=173396183 · call-chain<br>`BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| 历史格式算法变化 | 2.1.77 使用 user_<device>_account_<account>_session_<session>；2.1.78 开始 JSON；258/280/325 均已是 JSON。 | `METADATA-HISTORY-2.1.77` — V2.1.77-main · `package/cli.js:Ft` · m=10427864 · file-byte=10487424 · call-chain<br>`METADATA-HISTORY-2.1.78` — V2.1.78-main · `package/cli.js:at` · m=10455522 · file-byte=10515137 · call-chain<br>`CROSS-METADATA-S4b` — S4b · `/$bunfs/root/chunk-darxmw8c.js:metadata JSON` · m=4629940 · b=165387880 · call-chain<br>`CROSS-METADATA-S4a` — S4a · `/$bunfs/root/chunk-dt8bvbsd.js:metadata JSON` · m=996980 · b=178291248 · call-chain |
| 常量变化 | SDK 0.112.1→0.127.0→0.128.0；Bun 1.4.1→1.4.3→1.4.4；Node 兼容常量 v26.3.0→v26.12.1。 | version-transitions.json 的五个精确相邻边界 |

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。
