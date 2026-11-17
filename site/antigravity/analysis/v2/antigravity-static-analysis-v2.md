# Antigravity 静态分析 · 第二轮

记录：2026-11-17。项目分支：`english-ui`。分析范围是官方样本、请求构造与 Subway 源码摘录对照；未执行官方客户端，未登录账号，未调用生成服务。

Windows Hub **存在且已取得**，与 macOS Hub 均包含原生 Go `language_server`。W1 与 M1 的 2.32.1 产品 CL 均为 **1021296516**，M2 的 2.32.0 为 **1020486441**。因此 A 路径的样本前置条件已经满足，不需要因“Windows Hub 不存在”默认切到 B。[LAUNCH-W1、LAUNCH-M1、CL-W1、CL-M1、CL-M2]

主要修正是：Hub 的 CCPA 分支发送 **protojson / lowerCamelCase**；load/onboard 的实际 metadata 构造只产生 `ideType: ANTIGRAVITY`，不能把枚举表中的 `WINDOWS_AMD64` 或 `DARWIN_ARM64` 自动补进请求。`userPromptId` 在计算 requestId 后被清空；`enabledCreditTypes` 受输入开关控制。端点随账号认证状态改变，不能全局把 prod/daily 顺序反转。[POST-JSON、META-LOAD-W1、META-ONBOARD-W1、GENERATE-ROUTE、GENERATE-BUILD、ENDPOINTS]

## 证据与适用边界

所有方括号 ID 在 [evidence-catalog.json](evidence-catalog.json) 中展开为**样本、文件、函数/符号、十进制文件偏移、长度、SHA-256 与级别**。偏移是零起始文件字节偏移，不是 RVA。ASAR 内 JS 的偏移相对于解出的 JS 文件。[evidence-excerpts.log](evidence-excerpts.log) 保留选定指令窗口；脚本可从忽略的本地样本重新生成。

第一轮使用三类文字描述，并没有一套可核对的五级编号。本轮显式归一化为：E1 精确样本运行时抓包；E2 指令、调用链与赋值/序列化分支；E3 包内源码、描述符、常量或 manifest；E4 跨样本或标准推论；E5 未解决。**本轮没有 E1。**“所有请求的完整头与固定顺序”“某账号实际走 CCPA 还是 AICode”仍是 E5，不能从静态结果伪造。

Subway 对照基线采用用户在 v2 提交的生产 `f314f5d7` 源码摘录，不再采用第一轮口述值。该生产仓库不在当前目录，未独立读取生产源码；位置按用户提供保留。官方样本证据与这个外部基线分开标识。

## 样本、下载源与完整性

完整 URL、安装包/native 的字节数和哈希见 [samples.json](samples.json)。以下哈希均为安装包 SHA-256：

| 代号 | 产品 / 版本 / 构建目录号 | SHA-256 |
|---|---|---|
| W1 | Windows x64 Hub 2.32.1 / `6001966350991360` | `f216ee69d6a6d0c69f7fca01e3ccef9f0f1d78f861fa24891a6db185d6fa5ee1` |
| M1 | macOS arm64 Hub 2.32.1 / `6001966350991360` | `20dbf3f96f50aaaa83a2a9abcddb81ddb90ec073ea0e2776737126cf1cdb463a` |
| M2 | macOS arm64 Hub 2.32.0 / `6141816156848128` | `7ec0f204cf306506ecd77abbb7ba2a6e722471dbf908a86433dcb8efa6ed98f7` |
| C1 | Windows x64 agy CLI 1.5.9 / `4515810895593472` | `8803c289cac04d6e53f2211592d9981c2d5760bc0d9b4a7f222ef6ecc7abb38a` |

W1 来自官方下载页的实际链接，后缀是 **`windows-x64/Antigravity-x64.exe`**。NSIS 包内含 `$PLUGINSDIR/app-64.7z`，解出 Electron 资源和 `resources/bin/language_server.exe`（PE amd64）。M1 解出 Mach-O arm64 的同名原生服务。W1/M1 五份相关 protobuf 描述符（credits、prediction_service、model_configs、onboarding、cloudcode）的 SHA-256 完全一致；这是结构同源的证据，不等于逐分支运行结果已相同。[samples.json、SCHEMA-W1-*、SCHEMA-M1-*；E3/E4]

更新源为包内 `app-update.yml` 的 generic provider：

```text
https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/
request header: x-app-version: 2.32.0
```

| 实测 channel | HTTP / 内容 |
|---|---|
| `latest-x64-win.yml` | 200 / 2.32.1，Windows x64 EXE 的 URL、大小、SHA-512 |
| `latest-arm64-win.yml` | 200 / 2.32.1，Windows arm64 分发 |
| `latest-arm64-mac.yml`、`latest-x64-mac.yml` | 200 / 2.32.1，Mac ZIP |
| `latest.yml`、`latest-x64.yml`、`latest-arm64.yml` | 404 / 空 body |

证据：[channel-attempts.json](channel-attempts.json)、各同名 yml 与响应头；2026-11-17 观测，E3。W1/M1 的安装包 SHA-512 与各 manifest 匹配，C1 与第一轮保留的 CLI manifest 匹配。下载页和 manifest 可能更新，报告只确认本次快照，不把 2.32.1 宣称为今后永久最新版。安装包、解包文件、工具二进制与批量反汇编保持在 Git 忽略目录。

## P0-1：Windows Hub 规格

W1 静态重建的**核心 UA**：

```text
antigravity/hub/2.32.1 (aidev_client; os_type=windows; arch=amd64; cl=1021296516)
```

M1 对应：

```text
antigravity/hub/2.32.1 (aidev_client; os_type=darwin; arch=arm64; cl=1021296516)
```

构造链是 Electron `dist/lsDefaults.js` → `--override_ide_name antigravity`、`--subclient_type hub`、`--override_ide_version`、`--override_user_agent_name antigravity` → Go `codeassistclient.userAgent`。平台来自编译目标的 OS/arch 字符串，`metadata_provider.Initialize.func1` 中可见 Windows 的 `windows/amd64` 与 Mac 的 `darwin/arm64`，无需从 metadata 枚举反推。[LAUNCH-W1、LAUNCH-M1 E3；UA-W1 FILE 42212640、OS-W1 FILE 14637536、UA-M1 FILE 35569744、OS-M1 FILE 12206464 E2]

`fallback_changelist_string` 经转换后进入 `cl=%d`。运行状态还可能加入 `auth_method`、`datacollection_opt_in=false`、`purpose`、`host_path`、`proxy_client`。因此上面的核心值不能标成“完整登录后抓包 UA”；尤其 `auth_method` 应取 provider 的实际状态，不能用 `ResolveAuthMode` 的名字想当然替代。[UA-W1、UA-M1 E2]

`ClientMetadata.Platform` 的 schema 确实定义 `WINDOWS_AMD64=5`、`DARWIN_ARM64=2`。但 W1/M1 的 load/onboard 构造均未写 Platform 字段，零值为 `PLATFORM_UNSPECIFIED=0`，默认 protojson 省略它。**UA 的平台实值与 metadata 是否携带平台是两个问题。**[SCHEMA-W1-onboarding FILE 65116107、SCHEMA-M1-onboarding FILE 57941933 E3；META-* E2]

## P0-2：version ↔ changelist

| 样本 | app_version | build_dir_id | 产品 CL | 常量字符串数据偏移 / Go 字符串头偏移 |
|---|---|---|---|---|
| M2 | 2.32.0 | 6141816156848128 | 1020486441 | 63328584 / 202760576 |
| M1 | 2.32.1 | 6001966350991360 | 1021296516 | 63329536 / 202760576 |
| W1 | 2.32.1 | 6001966350991360 | 1021296516 | 70504496 / 210307584 |
| C1（另一产品） | 1.5.9 | 4515810895593472 | 1021519450 | 80139904 / 226359728 |

证据：CL-M2、CL-M1、CL-W1、CL-C1，E3；版本/构建号见官方下载 URL 与样本 provenance。

同一 2.32.1 构建的 W1/M1 产品 CL 相同。两个 Hub 版本的 CL 已发生变化；build_dir_id 反而由较大变为较小，因此不能把目录号当作按版本递增的 CL。已观测的 manifest 只提供版本、资源 URL、大小、SHA-512，**没有 CL**。两个版本不足以建立计算公式；目前可靠流程是读取 manifest → 校验下载 → 静态提取对应二进制的产品 CL → 发布经验证的 `(version, build, platform, cl)` 映射。[CL-* E3；推论 E4]

M2/M1 的 Go toolchain CL `1012564305` 不是产品 CL。不得扫描到任意“changelist”数字便替代上述 Go 全局字符串。[CL-M2、CL-M1、第一轮构建信息；E3]

## P0-3：生成请求 wire 与调用分支

### 实际调用链

M1 的 `getStreamingTextCompletion`（FILE 35527728）在 FILE 35528676 调用 `BuildGenerateContentRequest`，在 FILE 35529312 调用 `StreamGenerateContent`。后者按认证模式选择 gateway、个人、企业等路径；个人路径还受 `useAICodePredictionFlow` 控制。`USE_AICODE` 的有效布尔值可覆盖开关，否则读取特性状态和冷却状态；存在缺少 scope 后回退的分支。[GENERATE-CALLER、GENERATE-ROUTE、GENERATE-AICODE E2；调用点见 M1-generation-callers.json]

在 **CCPA continuation** 中，实际请求是：

```text
POST <SELECTED_ENDPOINT>/v1internal:streamGenerateContent?alt=sse
Content-Type: application/json
```

`streamGenerateContentFromCCPA` FILE 35542240 可见 `alt`、`sse` 与 action 的组装，随后 `marshalCCPARequest` → net/http。Go 内部使用 protobuf 对象，不代表 HTTP body 是 protobuf 二进制。[GENERATE-SSE、GENERATE-JSON E2]

`streamGenerateChat`、`internalAtomicAgenticChat` 在描述符/注册内容中存在，仅凭注册不能认定它们替代上述主调用链。也未把 Subway 非流式 `generateContent` 证明为官方 Hub 同一路径。[SCHEMA-M1-cloudcode E3；GENERATE-CALLER E2；未覆盖调用路径 E5]

### 外层字段规格

| 字段 | 静态确定行为 | Subway 对照 |
|---|---|---|
| wire 命名 | protojson 默认 lowerCamelCase：`requestId`、`userAgent` 等 | 保持 camelCase，勿改 snake_case |
| `project` / `model` / `request` | 由账号项目、模型与 builder 输入构造 | 保留结构，动态值不可写死 |
| `userAgent` | provider.GetUserAgentName 默认 `antigravity`，不是整条 HTTP UA | `"antigravity"` 保持 |
| `requestType` | 根据内部来源/子类型映射，不是只有 agent/web_search | 实现映射或明确只支持已验证 agent 分支 |
| `requestId` | `computeRequestID` 重新计算，使用 `/` 分隔 | `agent-<uuid>` 不匹配该构造器 |
| `userPromptId` | 可参与 requestId 计算；随后在外层请求对象上清空 | **保持该 wire 分支省略**，不能盲补 |
| `enabledCreditTypes` | EnableAiCredits 输入为真时构造 enum 1 `GOOGLE_ONE_AI`；否则省略 | 条件实现，不能所有请求强制补 |
| `systemInstruction` | builder 接收上层组装 prompt；HTTP serializer 没有统一 identity 注入器 | 不能把 Manager 的固定文本认定为官方逐字值 |

证据：SCHEMA-M1-prediction_service FILE 57591413、SCHEMA-M1-credits FILE 56399144 E3；GENERATE-BUILD FILE 35535552、GENERATE-ROUTE FILE 35540272、GENERATE-JSON FILE 35542000 E2。W1 dispatcher 也单独定位于 FILE 42177504；详细条件以 M1 追踪为主，未逐条审计的跨平台细节记 E4。

`marshalCCPARequest` 不启用 UseProtoNames；在内层模型/配置枚举值为 5 或 6 的分支启用 UseEnumNumbers。默认示例的 credits 为 `["GOOGLE_ONE_AI"]`，枚举数字模式为 `[1]`。这里保留判定值与调用点，不给未解析的内层枚举擅自冠以某个模型名称。[GENERATE-JSON E2]

`requestType` 基础映射：`chat, context_check, plan, command, agent, eval, checkpoint, generate_commit_message, agent_monitoring, custom_agent`。子类型非空时覆盖为 `autocomplete, command_generate, command_edit, tab, command_plan, command_terminal, tab_jump, agent_code_tracker`。完整数字键、数据偏移和 map 初始化调用点在 [request-type-maps.json](request-type-maps.json)；M1 `map.init.0` FILE 35371648、`map.init.1` FILE 35372400，E2/E3。这两张映射没有 `web_search`，尚不能外推“所有特殊搜索路径都禁止该值”。

`computeRequestID`（FILE 35539680）的三种格式为：

```text
有 USER_PROMPT_ID 且有 SESSION_ID:
<REQUEST_TYPE>/<SESSION_ID>/<TIMESTAMP_MS>/<USER_PROMPT_ID>/<REASON_ENUM>
有 USER_PROMPT_ID、无 SESSION_ID:
<REQUEST_TYPE>/<TIMESTAMP_MS>/<USER_PROMPT_ID>/<REASON_ENUM>
无 USER_PROMPT_ID:
<REQUEST_TYPE>/<UUID_V4>
```

空 request type 回退 `unknown`；时间由 `time.Now` 转为毫秒；随机分支调用 UUID NewRandom。上述是输入相关格式，不是用于复用别人的请求 ID。[GENERATE-ID、GENERATE-ROUTE E2]

### identity 模板与签名往返

已提取 M1 内嵌 `antigravity_identity` 模板的完整 **1133 字节**，在 [evidence-catalog.json](evidence-catalog.json) 的 IDENTITY-TEMPLATE.text，文件偏移 **56618566**，Go 字符串头偏移 125535288。`generic-system-prompt` 实验切换两种身份开头：通用 AI assistant 与 “AI coding assistant … Advanced Agentic Coding”；`IsAutonomous` 切换 working for / pair programming 等句子及是否加入自主工作指令。[IDENTITY-TEMPLATE E3]

`IdentitySection.GetName` 返回 `identity`，`ShouldInclude` 对这个 section 返回 true，上层 `CascadeConversationalMixin.GetSystemPrompt` 负责组装。[IDENTITY-SECTION FILE 29558400、IDENTITY-CONDITION FILE 29558416、IDENTITY-ASSEMBLY FILE 29552000 E2] 这证明存在官方身份段及条件模板；本轮未锁定每个 harness/model/实验组合的最终渲染全文及 XML 包裹，不能宣称固定 `<identity>…</identity>` 已逐字还原。二进制里单独搜索到的 `<identity>` 还包含无关文档占位符，不能作为请求注入证据。Subway/Manager 的完整文本未提供，字节级同异仍为 E5。

签名已经追到 per-message 与 per-call 对象：

| 环节 | 证据与行为 |
|---|---|
| 响应读取 | `getStreamingTextCompletion-range1` FILE 35722736，从 aiplatform master `Part.ThoughtSignature` 字节切片读出，写入 ChatToolCall.ThinkingSignature |
| 存储布局 | M1 `ChatToolCall` 类型 FILE 148821880：Id@8、Name@24、ThoughtSignature 字符串@88、ThinkingSignature 字节切片@104 |
| 工具调用重建 | `processToolCalls` FILE 35531680，先复制 ThinkingSignature；旧 ThoughtSignature 字符串走 base64 解码，写回 Part.ThoughtSignature@48 |
| 普通消息重建 | `BuildGenerateContentRequest` 使用 ChatMessagePrompt.ThinkingSignature@216，必要时解码 Signature@200；无效 base64 有错误路径 |

证据：THOUGHT-RECEIVE、THOUGHT-SEND、GENERATE-BUILD，E2；类型布局来自 Go runtime type 表，E3。wire 中 protobuf bytes 表示为 base64 字符串。应保留原 assistant parts、工具 call ID/name/arguments/signature 的关联，不合成签名，不把签名从另一个调用搬过来。没有证据支持“只按 tool ID 建一个全局缓存就等价”。跨 turn/并行调用的真实往返验证未执行（E5）。

## P0-4：load / onboard / models 实际 body

在追踪的正常构造路径上，默认 protojson 的 metadata 为：

```json
{"metadata":{"ideType":"ANTIGRAVITY"}}
```

这不是仅按 schema 拼出的建议。M1 load 在 FILE 35668480 写 IdeType=9，FILE 35668484 写 PluginType=0；onboard 在 FILE 35671896/35671900 写相同值。W1 对应 FILE 42331172/42331179 与 42335173/42335180。构造到交给 request 的路径上没有 IdeVersion、IdeName、Platform 赋值。[META-LOAD-M1、META-ONBOARD-M1、META-LOAD-W1、META-ONBOARD-W1 E2]

| action | 实际设置/条件 | Subway v2 基线的处理 |
|---|---|---|
| loadCodeAssist | 上述 metadata；非空项目输入可带 `cloudaicompanionProject` | **保持** camelCase/ideType；**移除**该分支额外 ideVersion/ideName |
| onboardUser | 上述 metadata；tierId 来自调用参数；非空项目可携带 | **省略**显式 PLATFORM_UNSPECIFIED；pluginType 从 GEMINI 改为零值省略；**保持**不带 ideVersion/ideName |
| fetchAvailableModels | `project`；取得 entitlement 时有条件填写 `location`、`entitlement`；无 metadata | **保持**基础 `{project}`，另实现条件字段；不要添加 metadata |

默认 enum 0 是 `PLUGIN_UNSPECIFIED`，不是 GEMINI（2）；默认序列化不输出 0。UA/启动参数中的 `ide_version=2.32.1` 不能推导请求 metadata 一定带 ideVersion。[SCHEMA-M1-onboarding、POST-JSON E3/E2；MODELS-M1 FILE 35593088、MODELS-W1 FILE 42240160 E2]

## P1-1：请求头与端点

| 头 | 本轮确认的发送条件 | 对 Subway 的处理 |
|---|---|---|
| Content-Type | 追踪 CCPA POST 设置 application/json | 保持 |
| Authorization | OAuth2 transport 的 Bearer 认证；实际 token 不采集 | 保持机制，动态注入 |
| User-Agent | Go UA 构造器及 provider 上下文 | 替换旧核心格式，处理条件评论 |
| X-Goog-Request-Reason | `setHeaders` 只在上下文字符串非空时设置 | 条件实现，不编造值 |
| X-Goog-User-Project | Hub provider 按 auth mode、目标 host、非空项目 gate；之后 context quota override 可覆盖 | 条件实现，不所有请求固定加 |
| X-Goog-Api-Client | 所追踪 Go common CCPA setHeaders 未设置；四个 native 样本中也未找到该字面量 | **移除**固定 `gl-node/22.21.1`，不据此声称所有其它路径永不发送 |
| Accept / Host | 未建立所有 action 共用的固定 Accept；Host 应随 URL | 不从 IDE/隐私接口照搬到所有 Hub 请求；隐私专用分支待单独验证 |
| 其它设备/session/X-* 与顺序 | 没有本轮抓包，不把 string 命中或 map 写入顺序当网络头全集/顺序 | 留待 E1；不添加猜测设备值 |

证据：HEADERS FILE 35572000、HEADERS-HUB FILE 35448496、HEADERS-QUOTA FILE 35378720，E2；负向字面量扫描见 native-constants.json，E3；OAuth2 transport 常规语义 E4。`SetHTTPHeaders` 在 business paygo 返回；business licensed enterprise 对 cloudcode-pa host 的分支也返回；其余条件下才可设置项目头，不能简化为“有 project 就总加”。

`AntigravityHubAuthProvider.UpdateEndpointURL` 的确定分支为：

1. `CLOUD_CODE_URL`、开发模式或自定义 URL 等覆盖条件可阻止自动更新。
2. 明确业务标志或 tokenInfo.IsGcpTos 为真时选 **prod**。
3. 有个人 token 且 IsGcpTos 为假时选 **daily**。
4. 没有 tokenInfo 时仍有 load-response/tier 条件分支；其内部谓词未全部语义化，不能只按展示套餐名推导。

证据：ENDPOINTS FILE 35449744，其中 prod 赋值 FILE 35450084、daily FILE 35450124，E2；LAUNCH-* 的默认 endpoint 是 daily，E3。Subway 的“prod 优先、daily 备用、5 分钟 TTL”未在这条官方逻辑中建立，建议改为账号模式/配置选路，**不建议全局反转成 daily-first 重试表**。隐私接口固定 daily 是否有独立官方特例，本轮未追到（E5）。

## P1-2：个人 OAuth

个人 client_id：

```text
1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com
```

个人 scope 为六项：

```text
https://www.googleapis.com/auth/cloud-platform
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/cclog
https://www.googleapis.com/auth/experimentsandconfigs
https://www.googleapis.com/auth/aicode
```

业务 client_id 为 `884354919052-36trc1jjb3tguiac32ov6cod268c5blh.apps.googleusercontent.com`，源中固定五项、不含 aicode；还有独立 WIF 配置，不能当个人凭证轮换池。[OAUTH-SOURCE-W1、OAUTH-SOURCE-M1 E3；OAUTH-CONFIG FILE 39637344 E2]

个人 browser 流程使用 `response_type=code`、PKCE **S256**、`state`、`access_type=offline`、`prompt=consent`。回调为 `http://localhost:<PORT>/auth/callback`，先监听 IPv4 `127.0.0.1:0` 动态端口，再尝试 IPv6 同端口，另有 localhost fallback；不是固定 8085。[OAUTH-CALLBACK FILE 39593936、OAUTH-LOOPBACK FILE 39591696、OAUTH-AUTHURL FILE 39602288 E2] 本地服务器处置与服务器允许的 redirect 要一起实现，不能只改 OAuth URL 中一段路径。

Subway 的五项授权若没有实际授予 aicode，**不能通过 refresh 自行扩展到第六项**，需要用户交互授权取得额外 scope，并核验实际授予结果。这不意味着必须撤销所有旧 token，也不证明 scope 缺失是 403 的原因。依据 RFC 6749 §6：refresh 请求 scope 不得超出原始授予范围（官方文本第 2597–2602 行；本地保存来源摘录）。标准推论 E4，不是本轮对生产 token 的检查。

client_secret 只记录 SHA-256。四个样本中找到相同的三条 35 字节 secret 常量哈希，见 native-constants.json；本轮不发布明文，也未声称其中某条已通过线上验证或与特定 client 的映射已全部复核。

## P1-3：运行时交叉验证

未执行。当前工作环境为 Windows 静态分析目录，没有用于本项的可控 macOS 运行环境/自有测试账号授权。报告保留 E5：完整登录后 UA、传输层附加头与顺序、实时 endpoint/AICode 选择、实验控制的最终 systemInstruction、真实 thoughtSignature 往返。

可供后续自有账号验证的三个最小观测场景是登录/加载账号、无工具普通生成、一次工具调用再续写。每次需记录样本哈希、实际 URL、脱敏头/body、请求与响应关联；不要把这份计划误记为已抓到数据。scope/签名/动态头的空值不得以占位符直接发往服务端。

## P2-1：Gemini CLI 与 agy 去留

C1 是 Go PE CLI 可执行文件，包含 jetski CLI backend 和 codeassistclient。`NewServerBackend` FILE 54828608 调用 `CLIAuthProvider.SetTokenStorage` / `GetEndpointURL`，默认 UA name getter 返回 `antigravity`，有 override 分支；产品 CL 为 1021519450。[CLI-BACKEND、CLI-UA FILE 41239264、CL-C1 E2/E3] 这是进程内复用代码的证据，不能说已证明会启动一个单独 `language_server.exe` 子进程。完整 CLI 登录后 UA、subclient、模型支持集合与授权兼容仍未完成逐分支恢复，未给其伪造可部署 profile。

C1 的 `agy 1.5.9` **不是** Google `gemini-cli` 的新版本。2026-11-17 只读查询官方 `google-gemini/gemini-cli` latest stable release 得到 **v0.68.0**，发布时间 **2026-11-10 21:17:07 UTC**（保留 gemini-cli-latest-release.json，E3）；Subway 的 `GeminiCLI/0.1.5` 应作为另一个客户端路径评估，不能靠换成 agy UA、client_id 或 scope 完成迁移。

建议：保留 geminicli 名称时，按官方 Gemini CLI 当前协议另做兼容升级；若改用 agy，建立独立 adapter 与授权流程，待验证后再决定替代。仅凭 C1 的静态结果，没有足够依据直接下线 geminicli，也没有证明该路径现在线上有用量。此次不查线上 SQL，不重建号池。

## 机器可读交付与决策

[antigravity-hub-profiles.json](antigravity-hub-profiles.json) 同时提供 **Windows/amd64 与 macOS/arm64 两份** profile，包含用户要求的字段、三元组、请求条件和 evidence_refs。`metadata_platform=0` 表示构造器零值且 **emitted=false**；`ide_name/ide_version` 表示启动覆盖参数，不能直接塞进 load/onboard metadata。

`ua` 明确标为核心 UA；动态头为 null 并有 header_policy，null 表示“按条件求值或省略”，不是发送空头。`ready_as_unconditional_constants=false` 是有意保留的边界：稳定版本/CL/平台/格式可进入配置，动态授权、实验、额度和路由必须由实现处理。本轮 profile 是带条件的静态规格，不能作为“全量真实抓包”导入。

Windows Hub 已可得，技术上可继续 A；B 也有同构的静态依据。是否重建账号池仍由 Subway 方决定，不能由指纹差异推导账号恢复概率或 TOS 403 的因果。需要先核对实现语义与合规使用路径，再决定投入；本轮没有执行任何规避服务端判定或账号轮换操作。

两份第一轮报告已更新：[Subway diff](../subway-fingerprint-diff.md)、[macOS fingerprint](../macos/antigravity-macos-fingerprint.md)。本轮验证、回滚与补丁结果见 macos/VERIFICATION.txt 与 v2/verification-results.json。
