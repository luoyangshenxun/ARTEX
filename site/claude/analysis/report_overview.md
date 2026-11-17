# Claude Code 静态分析总览

状态：工作区已创建，尚未导入官方 npm 样本。
日期：2026-11-17。
目标：为官方 Claude Code 的出站请求建立按版本、平台和场景可复核的真实指纹规格。

## 证据边界

本工作区区分五类证据：

| 级别 | 含义 | 可支持的结论 |
| --- | --- | --- |
| literal | 源文件中的字面量、正则或导出值 | 存在性、固定常量和精确拼接片段 |
| call-chain | 从入口沿调用链还原的分支和参数 | 字段生成逻辑、fallback 和联动 |
| offline-reproduction | 拦截 HTTP 适配器后的本地构造结果 | 头、body、beta 合并结果；不证明线上接受 |
| runtime-capture | 同版本、同平台、脱敏运行时请求 | 线路、实际顺序、运行时补充字段和 TLS 观察 |
| inference | 由证据推导但没有直接运行时确认 | 必须单独标注，不得写成已确认事实 |

任何主表行都必须有来源文件、函数或导出符号、定位信息、取值逻辑、版本
范围和证据级别。字段取值域必须记录枚举来源、归一化、默认值、fallback
和与其他字段的联动。

## 分析顺序

1. 从 `package.json`、lockfile、npm 包元数据和入口文件确定精确版本。
2. 对 CLI、SDK 和 transport 依赖做递归文本扫描，保留 UTF-8 字节偏移、
   行号、源文件 SHA-256 和上下文。
3. 先还原 SDK 的 Stainless header builder，再回到 CLI 追踪调用参数。
4. 分别追踪 beta、body metadata/billing/system、OAuth 和 transport。
5. 对两个以上版本重复同一证据抽取，标出算法变化和仅数值变化。
6. 用合成输入做离线复现；抓包只验证同版本同平台的实际线路。

## 输出关系

`claude-real-fingerprint.md` 记录规格表，`fingerprint-domain-rules.md` 将规格
转换为字段域和联动规则，`beta-matrix.md` 与 `billing-fields.md` 记录场景
和算法，`oauth-auth.md`、`tls-features.md` 记录边界较强的专题，最后由
`subway-diff.md` 给出逐项对照。未能从当前仓库定位 Subway 实现时，差异列
必须保留为待补来源，不能凭名称推测。

## 当前缺口

- 官方 `@anthropic-ai/claude-code` 样本版本和 SHA-256；
- 官方 `@anthropic-ai/sdk` 样本版本和 SHA-256；
- 包内实际的 `undici`/fetch 依赖版本与配置；
- Subway 当前实现、配置或脱敏请求样本；
- 同版本运行时请求和可用的 TLS/JA3/JA4 观测。
