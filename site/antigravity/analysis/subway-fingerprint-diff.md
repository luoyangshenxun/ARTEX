# Subway 与本地 Antigravity 样本对照

日期：2026-11-16。

**对照基线来自用户消息，不是本次读取的 Subway 源码或生产配置。** 本地对象是 IDE 2.7.0；用户基线描述的是 `antigravity/hub/2.23.0`。只有相同调用路径才可以判定一致或缺失；跨产品版本不直接标“过期”。

| 项目 | 用户提供的 Subway 值 | 本地可验证事实 | 差异判定 |
| --- | --- | --- | --- |
| 基础 UA | `antigravity/hub/2.23.0 windows/amd64` | IDE 构造 `antigravity/2.7.0 windows/amd64` | **不同路径**；不能把 IDE 字符串直接当作 hub 的替换值 |
| UA 库后缀 | 用户未列出 | IDE 认证库追加 `google-api-nodejs-client/10.3.0` | 若 Subway 没有该后缀，与此 IDE 分支不同；hub 是否需要仍待确认 |
| hub 版本 | `2.23.0` | 本样本未包含后台二进制；App 2.32.0 不是本地对象 | **待确认**，不能判为过期 |
| changelist | 用户称完全没有 | 包中存在 `languageServerCL=1018779249`；在已定位直接请求中未见发送 | **出站差异待确认**；不能据配置值要求补某个头 |
| version/CL 校准 | 用户称没有 | 只取得同包配置映射，未发现 hub 配对算法 | **待确认** |
| `X-Goog-Api-Client` 格式 | `gl-node/22.21.1` | IDE 所用库格式为 `gl-node/{运行时 Node 版本}` | **模板一致**；实际值是否一致取决于对应官方运行时 |
| `X-*` 数量 | 用户称只有上述头 | 该 IDE 分支也未显式设置设备/session 头 | 目前不能据数量判定“缺失” |
| metadata 的 IDE 类型 | 用户称 `ANTIGRAVITY` | 本地外部版为 `ANTIGRAVITY=9` | **语义一致**，序列化形式需检查 |
| metadata 字段命名 | 用户给出 camelCase 名称，实际发送未知 | 本地直接请求经 `kEn` 转为 `ide_type`、`ide_version`、`ide_name` | **待查实际 wire body**；不能把 JS 字段名当作已发送格式 |
| metadata 的版本 | 用户未给实际值 | 此 IDE 分支从 `ideVersion=2.7.0` 读取 | **待确认** |
| `platform`／`plugin_type` | 用户未给实际值 | schema 支持，但本地 getter 未设置 | 不能因 schema 存在就要求补齐 |
| `fetchAvailableModels` body | 未提供 | 该调用仅设置 `project`；没有 metadata 块 | **待确认** |
| 主域／daily 域 | 提及两个域名 | IDE 按内部版、开发模式、GCP ToS 和 tier 状态选路 | **待查 Subway 选路分支** |
| OAuth client_id | `1071006060591-...` | 常规 ID 前缀匹配，完整值见主报告；另有 GCP ToS 模式 ID | **部分匹配**；不能据前缀判定完整一致或仍有效 |
| scopes、redirect_uri、PKCE | 未提供完整值 | 五项 scope、localhost 回调；所定位登录分支未设置 PKCE 参数 | **待确认** |
| systemInstruction | 用户提及身份前导文本，原文不完整 | 后台生成实现不在样本中 | **待确认** |
| thoughtSignature | 未提供实现 | 本地 protobuf 有 thought_signature 等字段；云端处理路径未取得 | **待确认** |
| 403／封禁原因 | 用户推测指纹不齐导致 | 未运行真实请求、未取得服务端判定证据 | **因果未证实** |

本次能直接供改造评审使用的结果是：分清 IDE 与 hub；对比认证库追加后的完整 UA；追踪运行时生成的 `X-Goog-Api-Client`；检查请求体的 snake_case 转换；按 action 分别核对 metadata；记录实际 endpoint 选择条件。

本次没有修改 Subway，没有连接 `alice-sg-26`，也没有执行消息中截断的 SQL。线上设置、账号 proxy、Gemini CLI 活跃用量和“是否转移号池”等事项未由本地静态样本回答。

在缺少同版本后台样本和 Subway 实际发送数据时，没有可验证的 UA／CL 自动补丁。
