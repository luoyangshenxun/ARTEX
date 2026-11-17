# Claude Code 静态分析 · 第二轮执行约定

记录日期：2026-11-17。用户提供的 v2 要求取代 v1 中“独立 SDK / Node / undici 为主传输”的假设；起点为 `english-ui@d1cf49c` 的脚手架。分析对象固定为本目录项目。

## 输入与边界

- S1：darwin-arm64 2.1.325；S2：win32-x64 2.1.325；S3：linux-arm64 2.1.325。
- S4a/S4b：darwin-arm64 2.1.280 / 2.1.258；S5：主包 2.1.325。补查 2.1.326 主包与平台包。
- 每个样本保留 tarball URL、npm integrity、tarball / binary SHA-256、Bun 版本与构建 revision。
- 不执行 Claude 可执行文件，不触达 Anthropic 接口，不使用真实 token。
- 独立 Bun 工具可运行已抽取的纯函数、SDK 请求构造切片及合成 fetch；与官方客户端完整运行分开标证。
- 二进制、完整 bundle、下载工具和原始抓包仅保存在忽略目录。Git 只保留脚本、最小证据和报告。
- Subway 源码定位、生产 SHA `f314f5d7` 及团队流量表来自用户输入；标记 `USER-SUPPLIED`，不能声称已访问生产库或复核该仓库。

## 交付与验收

| 优先级 | 交付 | 验收 |
|---|---|---|
| P0-1 | Stainless 分支、OS/Arch 枚举、Bun/Node 兼容版本、版本映射 | JSON 含 cli_version / sdk_version / bun_version / runtime_version_reported / os_values / arch_values；258–326 间隔 5–10 版本取样并定位升级边界；回答 Linux/arm64 合法性 |
| P0-2 | UA token 条件 | external、cli、sdk-cli、local-agent、claude-desktop-3p、agent-sdk、workload 及 billing/system/beta 联动 |
| P0-3 | beta 规则与有序场景矩阵 | stream × tools × thinking × opus/sonnet/haiku/fable × OAuth/API key；count_tokens；保留 feature flag / 模型能力 / 会话拒绝状态条件，不能把常量存在等同必带 |
| P0-4 | billing 与 metadata | 完整字段、零起始 UTF-16 采样、哈希/截断、3 例、system 位置与缓存、JSON/旧格式切换界限、device/account/session 来源 |
| P1-1 | 请求头全集、顺序和大小写 | SDK 合并逻辑与 Bun loopback 实测；区分 Headers 迭代、HTTP/1.1 线序和 h2 |
| P1-2 | system 前导 | 精确短句与交互/SDK/Vertex 条件 |
| P1-3 | TLS（可选） | 静态来源；本轮不运行 Claude，不把独立 Bun 工具当作官方 ClientHello；JA3/JA4 无证据时明确未测 |
| P2-1 | OAuth/setup-token | client_id、端点、scope、有效期/刷新分支，与 Subway 逐项对照 |

每项结论引用样本、嵌入模块路径、函数、模块内偏移、二进制绝对偏移和证据级别。机器证据见 `evidence-index.json`。Subway diff 每行的处置限定为“保持 / 改为 X / 待运行时确认”。

不存在样本、网络失败或动态 flag 尚未取得时保留明确界限，不以猜测填表。不把“团队未采到 Linux”推导为“官方不可能产生 Linux”。
