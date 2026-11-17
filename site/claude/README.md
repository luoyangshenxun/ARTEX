# Claude Code 静态分析 · v2

已从官方 Bun 原生包抽取嵌入模块图，分析入口：[报告总览](analysis/report_overview.md)。样本与工具 integrity、SHA-256、源码偏移、证据级别均随报告保存。用户 v2 的执行约定见 [requirements-v2.md](analysis/requirements-v2.md)。

本轮不执行官方 Claude 二进制，不请求 Anthropic 接口。独立 Bun 工具运行纯函数/SDK 切片与本地 HTTP 回显；运行时界限逐项写明。包本体没有独立 SDK node_modules 目录，扫描器已改为读取 Bun module graph；代理兼容逻辑中的 undici 引用仍保留在分析中。

交付：真实指纹规格、字段取值域与联动 JSON、128 格条件 beta 矩阵及 count_tokens、计费算法三例、metadata 格式切换、OAuth/setup-token、Subway 逐项差异。可选官方 TLS 抓取没有开展。

复算命令（需网络的下载步骤独立执行；不会运行 npm lifecycle）：

```powershell
node site/claude/analysis/acquire-samples.mjs --recorded
node site/claude/analysis/extract-bun.mjs
node site/claude/analysis/acquire-tools.mjs
node site/claude/analysis/make-evidence.mjs
node site/claude/analysis/scan-static.mjs --sample S1 --output site/claude/analysis/native-scan-summary.json
& site/claude/analysis/tools/oven_bun-windows-x64-1.4.4/package/bin/bun.exe site/claude/analysis/offline-probe.mjs
& site/claude/analysis/tools/oven_bun-windows-x64-1.4.4/package/bin/bun.exe site/claude/analysis/beta-probe.mjs
node site/claude/analysis/beta-paths.mjs
node site/claude/analysis/build-reports.mjs
node site/claude/analysis/verify-analysis.mjs
node site/claude/analysis/transaction/verify-transaction.mjs
```

acquire-samples 可带精确选择，如 darwin-arm64@2.1.288 / main@2.1.78；所有已分析取样见 sample-provenance.json。主包和平台包只下载/解包，不安装。extract-bun 校验原始二进制哈希，定位尾标、32 字节 offsets 表、52 字节模块记录并逐项校验边界，导出到忽略目录；偏移足以从原文件复算。

--recorded 按已提交 sample-provenance 下载所有附加版本并保留样本代号；无参数默认集合只是主样本。acquire-tools 默认下载本轮四个精确工具包，也可显式传 package@version。Bun 1.4.1/1.4.3 的离线输出已保留；复测时替换工具路径。报告验证兼容没有本地大文件的 checkout：只检查提交证据；有样本时 verify-analysis 另外重读原始字节验证跨度。

installer/*.tgz、analysis/unpacked、tools、raw、captures 均被忽略，禁止提交原生二进制、完整 bundle 或真实凭据。Git 中保留脚本、证据摘录和合成离线结果。

transaction/ 四角色沿用 v1 的可回滚工作区契约样例：pending → scaffolded → pending，验证对象与 Claude 网络行为分开；第二轮验证结果由补充记录扩展。
