# Antigravity macOS 客户端指纹分析 · 第二轮

更新：2026-11-17。当前规格以 **M1：macOS App/Hub 2.32.1（darwin/arm64）**为主，M2：2.32.0 保留为版本配对基线。官方客户端没有执行。完整调用链、证据与条件见 [第二轮报告](../v2/antigravity-static-analysis-v2.md)；[机器 profile](../v2/antigravity-hub-profiles.json) 也包含本轮新取得的 Windows Hub。

当前静态重建的核心 UA：

```text
antigravity/hub/2.32.1 (aidev_client; os_type=darwin; arch=arm64; cl=1021296516)
```

这是核心 UA；认证/上下文还可能添加 auth_method、purpose、host_path、proxy_client、datacollection_opt_in=false。未抓包，不把它标为固定的完整登录后 UA。

| 样本 | app_version | build_dir_id | 产品 CL | native SHA-256 |
|---|---|---|---|---|
| M2 | 2.32.0 | 6141816156848128 | 1020486441 | 5084a59982e1ff3b6dc4cf2ca35680c72c23435450080c2921cd8996c8440aae |
| M1 | 2.32.1 | 6001966350991360 | 1021296516 | f5377993d29bc1036ed9ddbfb2aec55bb37b8aaaf811df4a8c3ed5763dde2db0 |
| W1 | 2.32.1 | 6001966350991360 | 1021296516 | 65cdb8d132fc61056625081be7d07d4d22f57eba485de7edf0d24d98e77c891f |

CL-M2/CL-M1/CL-W1 为 E3。M1 CL 数据偏移 63329536、Go 字符串头 202760576；M2 对应 63328584/202760576。Windows 与 Mac 同构建 CL 相同。manifest 没有 CL；目前需校验样本并提取二进制，不能从版本号或 build 目录号计算。

M1 ZIP：216300499 字节，SHA-256 `20dbf3f96f50aaaa83a2a9abcddb81ddb90ec073ea0e2776737126cf1cdb463a`；native：205328064 字节。M2 DMG：241278833 字节，SHA-256 `7ec0f204cf306506ecd77abbb7ba2a6e722471dbf908a86433dcb8efa6ed98f7`。完整官方 URL、SHA-512 与平台见 [samples.json](../v2/samples.json)。

本轮对第一轮的补充与修正：

| 项目 | M1 实际证据 / 结论 | 级别与定位 |
|---|---|---|
| 产品与进程 | Electron Hub 启动原生 Go language_server，subclient_type=hub | LAUNCH-M1 E3，UA-M1 E2 FILE 35569744 |
| OS/arch | 编译目标字符串 darwin/arm64，非 metadata platform 映射结果 | OS-M1 E2 FILE 12206464 |
| platform | schema 的 DARWIN_ARM64=2；load/onboard 构造未赋值，实际零值且省略 | SCHEMA-M1-onboarding E3 FILE 57941933；META-LOAD-M1 E2 FILE 35667664 |
| load metadata | 默认 wire 只有 ideType: ANTIGRAVITY；无 ideVersion/ideName/platform | META-LOAD-M1 E2，写入 FILE 35668480/35668484 |
| onboard metadata | 同样只发 ideType；pluginType 为零值省略，不是 GEMINI | META-ONBOARD-M1 E2，写入 FILE 35671896/35671900 |
| models | project；location/entitlement 依获取结果填写；不加 metadata | MODELS-M1 E2 FILE 35593088 |
| 命名与编码 | HTTP 为 JSON / protojson lowerCamelCase；内部 protobuf 不等于二进制 wire | POST-JSON E2 FILE 35751072；GENERATE-JSON E2 FILE 35542000 |
| 生成 RPC | 已追到 StreamGenerateContent → CCPA 分支 streamGenerateContent?alt=sse；个人另可选 AICode | GENERATE-CALLER E2 FILE 35527728；GENERATE-SSE E2 FILE 35542240 |
| body userAgent | provider 名称默认 antigravity，非整条 HTTP UA | GENERATE-ROUTE E2 FILE 35540896 |
| userPromptId | 先用于 requestId，随后从 wrapper 清空；不应无条件补上 | GENERATE-ROUTE E2 FILE 35540952 |
| enabledCreditTypes | 输入启用 AI credits 时为 GOOGLE_ONE_AI（enum 1），否则省略 | GENERATE-BUILD E2 FILE 35539176；SCHEMA-M1-credits E3 FILE 56399144 |
| systemInstruction | 提取 1133 字节 identity 条件模板；最终 harness/实验渲染未全还原 | IDENTITY-TEMPLATE E3 FILE 56618566；IDENTITY-ASSEMBLY E2 FILE 29552000 |
| thoughtSignature | per-message/per-call 字节保存；旧字符串 base64 解码后回注 Part | THOUGHT-SEND E2 FILE 35531680；THOUGHT-RECEIVE E2 FILE 35722736 |
| X-Goog-Api-Client | 已追 Go CCPA common path 不设 gl-node 头；不外推到所有其它路径 | HEADERS E2 FILE 35572000；native-constants.json E3 |
| 项目/原因头 | 账号模式、host、非空 context/project 条件决定；不是固定全集 | HEADERS-HUB E2 FILE 35448496；HEADERS-QUOTA E2 FILE 35378720 |
| 端点 | bootstrap daily；个人 daily，业务/GCP ToS prod，覆盖配置有优先级 | ENDPOINTS E2 FILE 35449744；LAUNCH-M1 E3 |
| 个人 OAuth | 六 scope（含 aicode）、PKCE S256、consent、offline | OAUTH-SOURCE-M1 E3；OAUTH-AUTHURL E2 FILE 39602288 |
| 回调 | localhost 动态端口 /auth/callback，双栈监听；不是固定 8085 | OAUTH-CALLBACK E2 FILE 39593936；OAUTH-LOOPBACK E2 FILE 39591696 |

证据 ID 的完整文件/符号/偏移/哈希见 [catalog](../v2/evidence-catalog.json)。本轮五级标签在该文件显式定义；第一轮三类文字描述不冒称既有五级标准。没有运行时 E1。

与 Subway 生产 f314f5d7 摘录的差异：

| Subway 源码实值（用户提交，未独立读取生产仓库） | macOS Hub 对照与处理 |
|---|---|
| UA antigravity/hub/&lt;ver&gt; windows/amd64，配置空→env→2.23.0；无 CL | 如果选择 Mac 身份，应采用本报告 darwin/arm64 核心与配对 CL，并处理动态评论；若保留 Windows，采用 W1 profile |
| 隐私接口 gl-node/22.21.1、固定 daily Host | 不移植到 Go common path；隐私 action 的独立例外本轮尚未证明 |
| load: ideType、ideVersion、ideName | 保留 camelCase/ideType；该官方构造分支省略后两项 |
| onboard: platform=PLATFORM_UNSPECIFIED、pluginType=GEMINI；无 version/name | 省略 platform 和默认 pluginType；保持无 version/name |
| models 只有 project | 基础路径保持，按 entitlement 条件补业务字段 |
| requestId=agent-uuid；userAgent=antigravity；无 userPromptId/credits | userAgent 保持，requestId 改为分支式斜杠格式；userPromptId 保持省略，credits 按输入开关 |
| 固定 Manager identity + 剥离 Claude 身份句 | 官方有实验/自治状态模板；缺少 Subway 完整原文，不判逐字一致，不主张固定文本适用于所有模型 |
| prod-first、daily fallback、5min TTL | 改账号模式/配置选路，不全局反转优先级 |
| 五 scope（无 aicode）、S256、localhost:8085/callback | 个人官方为六 scope 和动态 /auth/callback；新增 scope 要交互授权，refresh 不能自行扩展 |

更完整的源码位置与逐项结论见 [Subway diff](../subway-fingerprint-diff.md)。指纹差异未被证明导致 TOS 403，本轮不处理封禁恢复或账号轮换。

第一轮报告原始字节保存在 transaction/BASELINE_FILE.md，SHA-256 `8e30933cc10c763aae28fa07eec7e1749248d819dd2d669f8c1b43a3001bd182`；用于本轮补丁/回滚校验，不作为当前规格。验证记录见 [VERIFICATION.txt](VERIFICATION.txt)。
