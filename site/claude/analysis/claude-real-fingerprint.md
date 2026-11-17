# 官方请求构造规格

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

## 版本与 UA

CLI 版本取编译时 VERSION，S1 为 2.1.325；SDK 自己的版本常量独立。主包只有安装 Node 脚本，安装后原生二进制驻留，不能把安装时 Node 版本当运行时。`UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain<br>`VERSION-S1` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:SDK package version` · m=1048 · b=283347235 · literal<br>`INSTALL-S5-getPlatformKey` — S5 · `package/install.cjs:getPlatformKey` · m=3710 · file-byte=3718 · call-chain

`claude-cli/<build-version> (external, <request-entrypoint>[, agent-sdk/<env>][, client-app/<env>][, workload/<context>])`。括号 token 顺序固定如式，external 是字面量。`UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain

| token | 条件 / 联动 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| cli / sdk-cli | 启动参数 e 同时用于 setInteractive(!e)；无 entrypoint 时 e? sdk-cli:cli；已有 cli 且 e 真也变 sdk-cli；sdk-cli 另有请求级 override 可变 cli。 | `ENTRY-INTERACTIVE` — S1 · `/$bunfs/root/chunk-gg7nabmz.js:l$a` · m=10420 · b=278591217 · call-chain<br>`ENTRY-NORMALIZE` — S1 · `/$bunfs/root/chunk-gg7nabmz.js:N` · m=12688 · b=278593485 · call-chain<br>`ENTRY-SDK-REQUEST-OVERRIDE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sPa` · m=946241 · b=282366381 · call-chain |
| local-agent | CLAUDE_CODE_ENTRYPOINT=local-agent；旧 local_agent 会归一化 | `ENTRY-NORMALIZE` — S1 · `/$bunfs/root/chunk-gg7nabmz.js:N` · m=12688 · b=278593485 · call-chain |
| claude-desktop-3p | host 设置的 entrypoint；允许单次读取 CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS 覆盖，但限制正则、保留名、remote* 和 local_projects。 | `ENTRY-OVERRIDE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:iPa` · m=946366 · b=282366506 · call-chain |
| agent-sdk/<v> | CLAUDE_AGENT_SDK_VERSION 非空；不由 CLI 版本算出，不能硬性要求等于 CLI 的某个派生版本 | `UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain |
| client-app/<x> | CLAUDE_AGENT_SDK_CLIENT_APP 非空，同时可能进 x-client-app 头 | `UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain |
| workload/<x> | 异步上下文 Ol() 的 workload，如 cron；与 billing.cc_workload 同源，不是独立随机后缀 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| 其它 entrypoint | 注册表 Eqo 包含 sdk-ts/sdk-py/mcp/desktop/remote 等；普通 env 路径可保留其它值，注册表不是所有路径统一强制白名单 | `ENTRY-ENUM` — S1 · `/$bunfs/root/chunk-gg7nabmz.js:Eqo` · m=572 · b=278581369 · call-chain |

通常 UA 与 cc_entrypoint 都用 O6() override，然后环境 entrypoint。UA 的 ownEntrypoint=true 可跳过 override；启动前缺省也不同（UA cli，billing unknown）。system 前导直接依赖交互状态、append prompt、provider；beta 还依赖 source / model / flags，不能从 UA 文本单独推断。可随绑定的真实上下文走，但必须连同 entrypoint、workload、system 与请求来源一起验证。`UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain<br>`BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain<br>`SYSTEM-PREFIX` — S1 · `/$bunfs/root/chunk-gpympest.js:XNr` · m=3184 · b=286836987 · call-chain<br>`BETA-AGENTIC` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:z7n` · m=535914 · b=281956054 · call-chain

## HTTP 头全集与合并

| 头 | 取值逻辑 / 取值域 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| Accept | application/json，流式也如此；不能凭 SSE 改为 text/event-stream | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| User-Agent | CLI FW 覆盖 SDK Anthropic/JS 默认 UA | `UA` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:FW` · m=654637 · b=282074777 · call-chain |
| X-Stainless-Lang | js | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| X-Stainless-Package-Version | 内嵌 SDK b0，本版 0.128.0 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| X-Stainless-OS / Arch | process 归一化，取值域见规则表 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| X-Stainless-Runtime / Runtime-Version | node / process.version；Bun 兼容层 | `ST-PROPS` — S1 · `/$bunfs/root/chunk-0rxs30cc.js:ae` · m=1381 · b=283347568 · call-chain |
| X-Stainless-Retry-Count | 每次 SDK 请求尝试计数，String(retryCount)，不是所有重试都恒 0 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| X-Stainless-Timeout | timeout 毫秒截断 /1000；常用 600000→600；配置可变，truthy 才带 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| anthropic-dangerous-direct-browser-access | CLI client 允许 browser，因此 SDK 加 true | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| anthropic-version | 2023-06-01 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| Content-Type | JSON 序列化 body 通常 application/json；由 bodyHeaders 层决定 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| Authorization / X-Api-Key | Bearer OAuth 与 API key auth 分支；合成离线请求分别验证，不使用真实 token | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain |
| anthropic-user-profile-id / anthropic-workspace-id | SDK create/countTokens 的 user_profile_id/workspace_id 非空时从 body 移到头；不表示普通 CLI 必带 | `SDK-BETA-ENDPOINTS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Ei` · m=119473 · b=283636503 · call-chain |
| x-app | 通常 cli；背景形态 Xt() 可为 cli-bg | `CLI-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Vd` · m=295192 · b=283812222 · call-chain |
| X-Claude-Code-Session-Id | G() 的会话 ID，与 metadata.session_id 同源 | `CLI-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Vd` · m=295192 · b=283812222 · call-chain |
| anthropic-beta | 来自有序 beta 对象数组 header 序列化，SDK 端点可追加固定 beta | `BETA-SERIALIZE` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:v2` · m=157446 · b=280415144 · call-chain |
| x-stainless-helper-method | SDK stream() helper 带 stream；直接 create({stream:true}) 不据此保证 helper 头 | `SDK-STREAM-HELPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:MessageStream.createMessage` · m=151600 · b=283668630 · call-chain |
| x-stainless-helper | 通用 helper 名合并去重的特殊头，是否出现取决于调用 helper | `SDK-HELPER-MERGE` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:s_` · m=46265 · b=283563295 · call-chain |
| x-client-request-id | first-party wrapper 条件成立且已有头不存在时生成请求 UUID；不覆盖已有值 | `REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain |
| x-claude-remote-container-id / x-claude-remote-session-id | 对应远程环境变量存在时加 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| x-claude-remote-session-origin / x-claude-remote-chat-conversation-uuid | 远程来源 / 会话上下文 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| x-client-app | CLAUDE_AGENT_SDK_CLIENT_APP；UA 也含 client-app/<值> | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| x-claude-code-agent-id / x-claude-code-parent-agent-id | agent context 的 ID，经过 PWo 处理 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| x-claude-code-request-class / x-claude-1p-request-class / x-claude-code-agent-type | 分类器与受信请求上下文条件字段 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| x-claude-code-auxiliary-type / x-claude-code-prompt-id | 辅助请求类型 / 有效 prompt UUID 的条件字段 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |
| anthropic-client-platform / anthropic-client-version | desktop_app 与宿主版本；uun 的 Q7r() 有值且无既有对应 custom header 时补齐 | `HTTP-CUSTOM-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:uun` · m=315497 · b=283832527 · call-chain |
| x-cowork-enrollment | Tmi() 提供值时由 uun 附加 | `HTTP-CUSTOM-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:uun` · m=315497 · b=283832527 · call-chain |
| x-claude-code-wiggly-dove | 受功能门控制的请求上下文结构化头；tg 生成上下文、$d 过滤保留字段后加入；不是固定指纹常量 | `HTTP-REQUEST-CONTEXT` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:$d` · m=290964 · b=283807994 · call-chain |
| x-is-refusal-fallback / x-cc-fallback-latched-by | Sv 在拒绝恢复 / fallback latch 条件成立时附加 true / latch 来源 | `REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain |
| anthropic-usage-limit | Sv: messages URL && Ss() && uEt() 时带 slow | `REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain |
| x-cc-atis | Sv: provider/host 条件与 eQs() 有值时附加 | `REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain |
| x-claude-code-sandy-plover | Sv: messages 且工具头功能开启时记录工具使用信息，构造失败有降级 | `REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain |
| x-ssr-client-ip / x-ssr-client-ip-sig / ant-ipcountry | 特定远程 sender-address 上下文；从受信数据源取值，失败则清理，不是根据本机 OS 算出 | `HTTP-SENDER-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:sg` · m=291856 · b=283808886 · call-chain |
| Host / Connection / Accept-Encoding / Content-Length | 传输层生成，压缩、协议、代理、body 会改变；不是 SDK 固定头 | `HTTP-FETCH` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:dqr` · m=164860 · b=280422558 · call-chain |
| 任意 ANTHROPIC_CUSTOM_HEADERS 与 options.headers | 用户/host 扩展使头名集合开放；本表覆盖主请求的固有构造层，不能穷举自定义头 | `CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain |

SDK 构造顺序为 Accept、User-Agent、Retry-Count、Timeout、平台属性、browser-access、anthropic-version，然后合并 auth → defaultHeaders → bodyHeaders → options.headers。后层覆盖前层，null 表示删除，x-stainless-helper 有独立的逗号去重逻辑。HTTP Headers 不是“JS 对象插入顺序原样上线”的承诺。`SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain<br>`SDK-MERGE` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:T` · m=46432 · b=283563462 · call-chain<br>`SDK-ENTRIES` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:r_` · m=45773 · b=283562803 · call-chain<br>`SDK-HELPER-MERGE` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:s_` · m=46265 · b=283563295 · call-chain

独立 Bun 1.4.4 (38afee6c84fcf48c0edb2466aa4b27d287a59c30) 在 Windows x64、本地 HTTP/1.1 回显中，插入 Z-Last / X-App / A-First / User-Agent 后，Headers 迭代和线序均为 A-First / User-Agent / X-App / Z-Last，保留这些头的原始大小写。实际抽出 SDK 链路合并后另做一次回显：Accept/Authorization/Content-Type/User-Agent 保持该大小写，x-stainless-* 与 session 头成为小写；完整原文保存在 wireProbe.sdk_raw。不能推导官方内嵌 Bun 的 TLS/h2 或 Go 的最终线序；Go map 无显式排序也不能单独证明线上随机，HTTP 栈可能排序。证据级别 offline-reproduction，原始线序见 offline-results-bun-*.json。

请求体 JSON 在 Sv 的 gzip 条件 ie 成立时，还经过 vTe/g3r：追加换行及随机 0–256 个空格/制表符；这不改变 JSON 语义，会影响原始字节长度，不能只比较解析后的 body。它不是所有普通 JSON 请求的无条件处理。gzip 及代理分支在 wrapper/fetchOptions 中。`REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain<br>`BODY-TRAILER` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:vTe` · m=842632 · b=282262772 · call-chain<br>`BODY-TRAILER-LIMIT` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:VXs` · m=842624 · b=282262764 · literal<br>`BODY-TRAILER-BUFFER` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:g3r` · m=842712 · b=282262852 · call-chain

## system 固定前导


| 条件 | 精确文本 | 来源 |
| --- | --- | --- |
| Vertex 或普通交互 CLI | You are Claude Code, Anthropic's official CLI for Claude. | `SYSTEM-PREFIX` — S1 · `/$bunfs/root/chunk-gpympest.js:XNr` · m=3184 · b=286836987 · call-chain |
| 非交互且有 append system prompt | You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK. | `SYSTEM-PREFIX` — S1 · `/$bunfs/root/chunk-gpympest.js:XNr` · m=3184 · b=286836987 · call-chain |
| 非交互且无 append system prompt | You are a Claude agent, built on Anthropic's Claude Agent SDK. | `SYSTEM-PREFIX` — S1 · `/$bunfs/root/chunk-gpympest.js:XNr` · m=3184 · b=286836987 · call-chain |
| 录制/回放路径 | 存在已记录的前导时使用记录值 | `SYSTEM-PREFIX` — S1 · `/$bunfs/root/chunk-gpympest.js:XNr` · m=3184 · b=286836987 · call-chain |

上述分支没有“Oauth 才有固定前导”的统一判断。billing 先于前导；后续项目、工具、环境 prompt 随上下文构造。billing 不带 cache_control，其它 system 分块按全局/组织缓存边界决定。`SYSTEM-ORDER` — S1 · `/$bunfs/root/chunk-gpympest.js:Pla` · m=3348 · b=286837151 · call-chain<br>`SYSTEM-CACHE` — S1 · `/$bunfs/root/chunk-gpympest.js:C$s` · m=4032 · b=286837835 · call-chain<br>`SYSTEM-WIRE-CACHE` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:xos` · m=3236008 · b=291938630 · call-chain

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。
