import fs from 'node:fs';
const root='site/antigravity/analysis/';
const mac=`# Antigravity macOS 客户端指纹分析 · 第二轮

更新：2026-11-17。当前规格以 **M1：macOS App/Hub 2.32.1（darwin/arm64）**为主，M2：2.32.0 保留为版本配对基线。官方客户端没有执行。完整调用链、证据与条件见 [第二轮报告](../v2/antigravity-static-analysis-v2.md)；[机器 profile](../v2/antigravity-hub-profiles.json) 也包含本轮新取得的 Windows Hub。

当前静态重建的核心 UA：

\`\`\`text
antigravity/hub/2.32.1 (aidev_client; os_type=darwin; arch=arm64; cl=1021296516)
\`\`\`

这是核心 UA；认证/上下文还可能添加 auth_method、purpose、host_path、proxy_client、datacollection_opt_in=false。未抓包，不把它标为固定的完整登录后 UA。

| 样本 | app_version | build_dir_id | 产品 CL | native SHA-256 |
|---|---|---|---|---|
| M2 | 2.32.0 | 6141816156848128 | 1020486441 | 5084a59982e1ff3b6dc4cf2ca35680c72c23435450080c2921cd8996c8440aae |
| M1 | 2.32.1 | 6001966350991360 | 1021296516 | f5377993d29bc1036ed9ddbfb2aec55bb37b8aaaf811df4a8c3ed5763dde2db0 |
| W1 | 2.32.1 | 6001966350991360 | 1021296516 | 65cdb8d132fc61056625081be7d07d4d22f57eba485de7edf0d24d98e77c891f |

CL-M2/CL-M1/CL-W1 为 E3。M1 CL 数据偏移 63329536、Go 字符串头 202760576；M2 对应 63328584/202760576。Windows 与 Mac 同构建 CL 相同。manifest 没有 CL；目前需校验样本并提取二进制，不能从版本号或 build 目录号计算。

M1 ZIP：216300499 字节，SHA-256 \`20dbf3f96f50aaaa83a2a9abcddb81ddb90ec073ea0e2776737126cf1cdb463a\`；native：205328064 字节。M2 DMG：241278833 字节，SHA-256 \`7ec0f204cf306506ecd77abbb7ba2a6e722471dbf908a86433dcb8efa6ed98f7\`。完整官方 URL、SHA-512 与平台见 [samples.json](../v2/samples.json)。

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

第一轮报告原始字节保存在 transaction/BASELINE_FILE.md，SHA-256 \`8e30933cc10c763aae28fa07eec7e1749248d819dd2d669f8c1b43a3001bd182\`；用于本轮补丁/回滚校验，不作为当前规格。验证记录见 [VERIFICATION.txt](VERIFICATION.txt)。
`;
const diff=`# Subway 与官方 Antigravity Hub 对照 · v2

更新：2026-11-17。Subway 基线为用户提交的生产 **f314f5d7 源码摘录**，源码根为 \`orca/workspaces/alice-issue/alice/subway/backend/internal/pkg/antigravity/\`。本次没有独立读取该生产目录或查询线上设置；“配置当前为空”等运营值也按用户记录标识。此表替换第一轮口述对照。

官方比较对象为 **W1 Windows Hub 2.32.1** 与 **M1 macOS Hub 2.32.1**。Windows IDE 2.7.0 是独立历史样本，不拿其 Node 请求格式覆盖 Hub。详细证据 ID 均可在 [v2 catalog](v2/evidence-catalog.json) 查到样本、文件、函数、偏移与级别；没有运行时抓包 E1。

| 项目 / Subway 源码位置 | Subway 源码实值（用户摘录） | 官方 Hub 证据 / 建议 | 判定 |
|---|---|---|---|
| UA / oauth.go:37,124–128 | antigravity/hub/&lt;ver&gt; windows/amd64；后台值记录为空→env→内置 2.23.0 | W1 核心为 antigravity/hub/2.32.1 (aidev_client; os_type=windows; arch=amd64; cl=1021296516)，另有动态评论；UA-W1 E2 FILE 42212640 | 格式不匹配；样本版本不同，不能仅换数字 |
| changelist | 无 | W1/M1 产品 CL 1021296516；CL-W1/CL-M1 E3；M2 1020486441 | 缺失，必须按精确样本配对 |
| 自动版本源 | 当前没有本轮已验证的同步实现 | latest-x64-win.yml / latest-arm64-mac.yml 等 channel 可用；manifest 不含 CL | 版本可同步，CL 需离线提取 |
| 基础头 / client.go:48–50 | Content-Type json、Bearer、User-Agent | 保持类型与认证机制；更新 UA 的构造分支；HEADERS E2 FILE 35572000 | 部分保持 |
| 隐私额外头 / client.go:877–930 | Accept: */*、gl-node/22.21.1、固定 daily Host | Go common CCPA 未设置 gl-node；不能套到所有 action；隐私专用分支未还原 | common path 删除 Node 指纹；隐私例外待验证 |
| 条件项目/原因头 | 未见于摘录基础头 | X-Goog-User-Project 依 provider/host/project/context；Request-Reason 非空才设；HEADERS-HUB E2 FILE 35448496 | 条件实现；不伪造设备/session头 |
| load / client.go:81–84,471–473 | metadata: ideType ANTIGRAVITY、ideVersion ver、ideName antigravity，项目可选；camelCase | W1/M1 metadata 只设置 IdeType=9、PluginType=0；默认 wire 只有 ideType；META-LOAD-W1 E2 FILE 42330304 | 保持 camelCase/ideType，省略 version/name |
| onboard / client.go:195–198,549–551 | ideType ANTIGRAVITY、platform PLATFORM_UNSPECIFIED、pluginType GEMINI，无 version/name | 默认 platform=0、plugin=0 省略；GEMINI=2 非该构造值；META-ONBOARD-W1 E2 FILE 42334880 | 省略 platform/plugin；保持不带 version/name |
| metadata 平台枚举 | load 无 platform；onboard 显式 UNSPECIFIED | WINDOWS_AMD64=5、DARWIN_ARM64=2 是 schema；load/onboard 未赋值；SCHEMA-W1-onboarding E3 FILE 65116107 | 不按 UA 平台盲补枚举 |
| models / client.go:674 | {project} | 基础保持；有 entitlement 时还有 location/entitlement，无 metadata；MODELS-M1 E2 FILE 35593088 | 基础一致，补条件分支 |
| 生成 RPC / client.go:35–39 | streamGenerateContent?alt=sse 或非流式 generateContent | 已追到 CCPA 流式同一 action；个人还可选 AICode，business/gateway 分支另有处理；GENERATE-ROUTE E2 FILE 35540272 | CCPA 流式一致；不证明非流式官方等价 |
| 编码 / gemini_types.go:6–13 | JSON lowerCamelCase wrapper | protojson lowerCamelCase，schema 内 snake_case 非 wire；GENERATE-JSON E2 FILE 35542000 | 保持命名 |
| wrapper userAgent | antigravity | provider 默认 antigravity；GENERATE-ROUTE E2 FILE 35540896 | 保持 |
| requestType / request_transformer.go:97–187 | agent / web_search | 来源/子类型映射见 request-type-maps.json；agent 已确认，所追两表不含 web_search | agent 有依据；搜索特殊路径未证实 |
| requestId | agent-&lt;uuid&gt; | 按 prompt/session/time/reason 或 requestType/UUID 构造斜杠格式；GENERATE-ID E2 FILE 35539680 | 改为对应输入分支 |
| userPromptId | 无 | 参与 ID 计算后被清空；GENERATE-ROUTE E2 FILE 35540952 | 该 wire 分支保持省略 |
| enabledCreditTypes | 无 | EnableAiCredits 真才加 GOOGLE_ONE_AI=1；GENERATE-BUILD E2 FILE 35539176；SCHEMA-M1-credits E3 | 条件支持，不强制补 |
| systemInstruction / request_transformer.go | 注入 Manager 来源 identity、剥离 Claude 身份句 | 官方有 1133 字节条件模板，受 generic-system-prompt / IsAutonomous 控制；IDENTITY-TEMPLATE E3 FILE 56618566 | 完整 Subway 文本未提供，逐字 diff 待定；不能认定固定注入等价 |
| thoughtSignature | 摘录未给具体实现 | 接收保存 per-call bytes，重发复制或解码旧 base64；THOUGHT-SEND E2 FILE 35531680；THOUGHT-RECEIVE E2 FILE 35722736 | 按对象关联保存；当前 Subway 是否缺失未知 |
| 路由 / oauth.go:148–151、client.go:822 | prod 优先，daily 备用，5min TTL；隐私固定 daily | Hub bootstrap daily，个人 daily，业务/GCP ToS prod，有 env/dev/custom 覆盖；ENDPOINTS E2 FILE 35449744 | 改认证/配置选路，不整体反转 |
| OAuth / oauth.go:28,40–47 | client_id 1071006060591-tmhs…，五 scope 无 aicode；secret 内置/env 覆盖 | 个人完整 ID 见 profile，六 scope；业务/WIF 为不同模式，不是轮换池；OAUTH-SOURCE-* E3 | 个人授权补 aicode，核验实际授予范围 |
| OAuth callback / oauth.go:403–404 | localhost:8085/callback、PKCE S256 | 官方动态端口 /auth/callback、S256、consent、offline；OAUTH-CALLBACK E2 FILE 39593936 | S256 保持；回调监听与注册策略一并对齐 |
| secret | 内置可覆盖 | 本轮仅记录 SHA-256，未验证有效性或吊销状态；OAUTH-CONFIG E2 FILE 39637344 | 不公开明文，不推断可轮换 |
| geminicli / pkg/geminicli/constants.go:41,50 | GeminiCLI/0.1.5 (Windows; AMD64)，client_id 681255809395-… | agy 1.5.9 属另一客户端，不是 Gemini CLI 升级；官方 Gemini CLI 2026-11-17 查询稳定版 v0.68.0 | 独立升级评估；不可只换 agy UA |
| TOS 403 | 用户记录唯一号 11-13 后不可用 | 本轮无账号请求、无服务端因果证据 | 不声称改指纹能恢复或避免封禁 |

完整核心 UA、OAuth scope/回调、版本/CL 表、生成字段与条件头已整合到 [机器 profile](v2/antigravity-hub-profiles.json)。文件中的 null 由 policy 解释，不能直接作为 HTTP 头发送；ready_as_unconditional_constants=false，动态状态需要调用方实现。本轮主报告见 [antigravity-static-analysis-v2.md](v2/antigravity-static-analysis-v2.md)，Mac 摘要见 [macos fingerprint](macos/antigravity-macos-fingerprint.md)。

Windows Hub 样本已取得，A 方案前置缺口已补；是否继续 A、改 B 或重建号池仍由 Subway 负责方决定。本次只改变 ARTEX 分析交付，没有改生产 Subway 或执行线上 SQL。
`;
fs.writeFileSync(root+'macos/antigravity-macos-fingerprint.md',mac);
fs.writeFileSync(root+'subway-fingerprint-diff.md',diff);
console.log(JSON.stringify({macos_bytes:Buffer.byteLength(mac),diff_bytes:Buffer.byteLength(diff)}));
