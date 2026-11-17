# Subway 对照清单

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

Subway 列是用户提供的生产 SHA f314f5d7（2026-11-17 同步）源码定位和值，标记 USER-SUPPLIED。根路径为 orca/workspaces/alice-issue/alice/subway/backend/internal/。基准及团队聚合采集值见 [user-supplied-baseline.json](user-supplied-baseline.json)。本工作区未读取该仓库或生产 DB，也未运行/修改 Subway。处置只有“保持 / 改为 X / 待运行时确认”。

团队采集表同样是用户输入，不独立赋予 runtime-capture 等级；它支持 MacOS/Windows 的部分版本对照，但无 Linux 样本不等于官方 Linux 不合法。静态 S3 已证实官方发布 Linux arm64。Subway 当前 2.1.326+0.94.0+Linux/arm64+node v24.3.0 不符合本轮官方325/326构建元组，错误是版本联动，不能笼统归因于Linux平台不存在。

| 项目 | Subway 当前值 / 来源（USER-SUPPLIED） | 官方差异 / 理由 | 处置 | 官方来源（文件:函数）与证据级别 |
| --- | --- | --- | --- | --- |
| UA / 版本 | constants.go:90；version_sync_service；2.1.326 / 内置258 | 编译时版本；326 已有对应平台包。保持 external,cli 仅适用于该上下文，版本必须绑定构建元组。 | 改为 按精确构建元组同步版本及 UA | `UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain |
| Package-Version | constants.go:126；写死0.94.0 | S1/S2/S3/S6 为0.128.0；285–287 为0.127.0；258/280 为0.112.1。 | 改为 version-map.json 的 sdk_version | `VERSION-S1` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:SDK package version` · m=1048 · b=283347235 · literal |
| OS / Arch | constants.go:127-128；Linux / arm64 | 官方 S3 存在 Linux/arm64；不能因团队无样本拒绝。固定值会损失平台多样性。 | 改为 与同一官方平台构建配对的 OS/Arch | `ST-CROSS-S3` — S3 · `/$bunfs/root/chunk-c1e43we7.js:SDK platform branch` · m=996 · b=304914016 · call-chain |
| Runtime / Version | constants.go:129-130；node / v24.3.0 | node 分支成立；325/326 原生兼容常量 v26.12.1，需附静态推断等级。 | 改为 node + 精确构建的 process.version 来源映射 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| Lang | constants.go:125；js | SDK 原文 js。 | 保持 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| Retry / Timeout | constants.go:131-132；0 /600 | 首次通常0，重试计数变化；timeout来自请求配置，常用600秒。 | 改为 实际请求尝试计数与超时秒值 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| X-App / browser access | constants.go:133-134；cli /true | 正常CLI一致；背景模式可cli-bg。 | 改为 根据上下文选择 cli/cli-bg；browser access true | `CLI-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Vd` · m=295192 · b=283812222 · call-chain |
| Accept | gateway_upstream_request.go:956-985；application/json | 流式仍 application/json。 | 保持 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| stream helper | 同上；流式加stream | 真正的 SDK stream helper 加该头；不能仅按 body.stream 推断所有调用路径。 | 改为 根据调用 helper 路径携带 stream | `SDK-STREAM-HELPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:MessageStream.createMessage` · m=151600 · b=283668630 · call-chain |
| request UUID | 同上；每请求新UUID | 官方 wrapper 条件生成、已有值不覆盖；请求与session分离。 | 改为 遵守条件生成及已有头保留 | `REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain |
| 会话头 | 基线表未列 | Vd 固有 X-Claude-Code-Session-Id，G() 与 metadata.session_id 同源。 | 改为 按会话上下文携带 X-Claude-Code-Session-Id | `CLI-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Vd` · m=295192 · b=283812222 · call-chain |
| 其它固有/条件头 | gateway_upstream_request.go；基线未详列 | anthropic-version、Content-Type、远程/agent/request-class/prompt 等头见规格表。 | 改为 按完整构造层与上下文校验 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| 头大小写 | resolveWireCasing，如x-app | 独立Bun HTTP1保留插入大小写；SDK多层Headers合并会影响最终键。官方精确构建未抓取。 | 待运行时确认 | `SDK-MERGE` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:T` · m=46432 · b=283563462 · call-chain |
| 头序 | Go map 无显式排序 | map 数据结构不足以证明 Go 最终线序。Bun 工具实测有排序，不能外推官方h2。 | 待运行时确认 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| OAuth全量9betas | constants.go FullClaudeCodeMimicryBetas() | 不是本版固定全集；mid-conversation-output-config 字面量缺失，extended cache/effort/binding均有条件。逐格diff见矩阵JSON。 | 改为 有序条件规则与会话状态求值 | `BETA-WIRE-ASSEMBLY` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:Jqe` · m=3129400 · b=291832022 · call-chain |
| NoTools / WithTools | constants.go:52-70；均前3项 | 有无tools不唯一决定beta；模型/交互/flags更关键。 | 改为 beta-conditional-matrix.json 及条件输入 | `BETA-BASE-RULES` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:B1` · m=533897 · b=281954037 · call-chain |
| CountTokens / Haiku / APIKey | constants.go:52-70 | count只保留vSn再由SDK追加计数token；Haiku非agentic可不带claude-code；OAuth依auth解析。 | 改为 官方过滤与追加顺序 | `BETA-COUNT-CALLER` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:E$t` · m=1192600 · b=289895222 · call-chain |
| billing fp | gateway_billing_block.go:90-105；gateway_billing_header.go；采样4/7/20 | 必须零起始UTF-16码元，salt+3units+版本→SHA256前三hex；三例已对拍。 | 改为 billing-fields.md 的码元算法与三组样例 | `BILLING-INDEX` — S1 · `/$bunfs/root/chunk-gpympest.js:T$s` · m=2012 · b=286835815 · call-chain |
| billing字段/块位置 | 上述billing实现；仅version+entrypoint | 官方有cch和多项条件字段；system最前、无cache_control；cch最终wire值尚未测。 | 改为 完整sJs构造字段与system缓存规则 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| metadata格式 | metadata_userid.go:74；FormatMetadataUserID；gateway_claude_oauth_body.go:326 | 77→78已切JSON；258及后续取样均JSON；并有parent与额外元数据过滤。 | 改为 按2.1.78边界及当前JSON规则处理 | `METADATA-HISTORY-2.1.78` — V2.1.78-main · `package/cli.js:at` · m=10455522 · file-byte=10515137 · call-chain |
| 账号级ClientID | identity_service.go:511；每账号crypto/rand32B | 官方device_id随机32B hex，但通常按设备配置持久化，不按账号每次派生。 | 改为 区分设备、账号、会话作用域 | `DEVICE-ID` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:hD` · m=138931 · b=281559071 · call-chain |
| profile覆盖顺序 | ApplyFingerprint后applyClaudeCodeMimicHeaders覆盖全部 | 会破坏绑定profile的版本、SDK、OS、runtime整体关系；本轮只给分析差异，未修改Subway。 | 改为 保留同一构建元组与上下文的自洽关系 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| TLS / JA3 / ALPN | tlsfingerprint/dialer.go:55-62,338-363；Node24模板，JA3 44f88fca…；仅h1；profiles表空 | 原生Bun/BoringSSL线索足够重审来源，但无官方ClientHello测量，不能给新hash。 | 待运行时确认 | `HTTP-FETCH-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Wl` · m=110788 · b=280038349 · call-chain |
| OAuth client_id | pkg/oauth/oauth.go:19-31；9d1c250a-e61b-44d9-88ed-5944d1962f5e | 默认官方常量一致。 | 保持 | `OAUTH-ENDPOINTS` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:o` · m=1347 · b=278185225 · literal |
| OAuth endpoints / redirect | 同上；claude.com/cai、platform token/manual callback | 常量一致；另有Console authorize与本地localhost redirect分支。 | 改为 保留现值并覆盖Console与本地redirect分支 | `OAUTH-AUTHORIZE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:d2o` · m=344409 · b=281764549 · call-chain |
| OAuth scopes | 同上；浏览器6/API5/setup仅inference | 官方默认完整授权8项，默认刷新6项；setup仅inference仍成立。 | 改为 区分完整授权8项、刷新6项、setup1项及override | `OAUTH-SCOPES` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:Pqo` · m=1038 · b=278184916 · call-chain |
| setup-token expiry / refresh | ExchangeSetupTokenCode 主路径 | 申请365天；实际响应决定expiresAt；外部token无refreshToken不可假设自动刷新。 | 改为 按请求expires_in与服务端响应及凭据能力处理 | `SETUP-TOKEN-OPTIONS` — S1 · `/$bunfs/root/chunk-xqhnat87.js:ConsoleOAuthFlow` · m=18070 · b=314235729 · call-chain |
| 日期隐写归一化 | pkg/anthropicfp/dateline.go；撇号/日期分隔符 | 未观察官方同版本线级日期变体/签名用途；此处不能用静态文本相近证明归一化无影响。 | 待运行时确认 | `SYSTEM-ORDER` — S1 · `/$bunfs/root/chunk-gpympest.js:Pla` · m=3348 · b=286837151 · call-chain |

以上“改为”是官方构造的对照规格，不表示已部署或已验证服务端接收。特别是 cch 最终值、TLS 与头线序仍保留运行时界限。
