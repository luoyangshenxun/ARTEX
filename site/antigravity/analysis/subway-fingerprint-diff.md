# Subway 与官方 Antigravity Hub 对照 · v2

更新：2026-11-17。Subway 基线为用户提交的生产 **f314f5d7 源码摘录**，源码根为 `orca/workspaces/alice-issue/alice/subway/backend/internal/pkg/antigravity/`。本次没有独立读取该生产目录或查询线上设置；“配置当前为空”等运营值也按用户记录标识。此表替换第一轮口述对照。

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
