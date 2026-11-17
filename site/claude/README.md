# Claude Code 静态分析工作区

本目录用于在授权的本地环境中分析官方 `@anthropic-ai/claude-code` CLI
及其 `@anthropic-ai/sdk` 依赖，建立可复核的出站请求规格。分析以静态
解包、源码检索、调用链记录和离线构造验证为主；抓包结果只能作为对应版本
和对应运行环境的交叉证据。

## 目标

需要还原的对象有：

1. CLI 版本、产品标识和 `User-Agent` 构造；
2. 完整 HTTP 头，包括 `X-Stainless-*` 的探测逻辑、取值域、联动约束、
   大小写和可观察的顺序；
3. `anthropic-beta` 的全集、构造逻辑和按场景携带矩阵；
4. 请求体中的身份、计费、元数据和 system prompt 字段及其生成算法；
5. `undici`/`fetch` 网络层配置，以及静态证据能支持到的 TLS 特征；
6. OAuth client、scope、PKCE/token 流程，以及 API key 与 OAuth 的请求差异。

最终交付物位于 `analysis/`：

- `claude-real-fingerprint.md`：真实指纹规格主表；
- `fingerprint-domain-rules.md`：字段取值域、跨字段约束和合法组合规则；
- `beta-matrix.md`：`anthropic-beta` 场景携带矩阵；
- `billing-fields.md`：身份、计费和元数据字段算法；
- `oauth-auth.md`：OAuth/鉴权流程；
- `tls-features.md`：网络层与可静态确认的 TLS 信息；
- `subway-diff.md`：与 Subway 现有实现的逐字段差异。

每个事实都必须记录 `文件:函数/导出符号`、行号或字节偏移、取值逻辑、
证据级别和适用版本。单一抓包值不能替代取值域规则。

## 目录约定

```text
site/claude/
├── README.md
├── .gitignore
└── analysis/
    ├── analysis-manifest.json
    ├── report_overview.md
    ├── claude-real-fingerprint.md
    ├── fingerprint-domain-rules.md
    ├── beta-matrix.md
    ├── billing-fields.md
    ├── oauth-auth.md
    ├── tls-features.md
    ├── subway-diff.md
    ├── scan-static.mjs
    ├── verify-scaffold.mjs
    └── transaction/
```

待分析的 npm 包应放在本地的 `analysis/unpacked/npm/` 下，目录名建议为
`claude-code/` 和 `sdk/`。不要把下载的包、解包树、账户凭据、真实 token
或未经脱敏的抓包提交到仓库。

目录应直接包含包的 `package.json` 和源码；若 `npm pack` 解出的外层目录为
`package/`，请将扫描根指向该层。扫描器不会执行 CLI 或 SDK。

```sh
node site/claude/analysis/scan-static.mjs
node site/claude/analysis/verify-scaffold.mjs
node site/claude/analysis/transaction/verify-transaction.mjs
```

对比多个版本时分别指定目录和输出，保留每份原始扫描结果：

```sh
node site/claude/analysis/scan-static.mjs --cli-root CLI_VERSION_ROOT --sdk-root SDK_VERSION_ROOT --output site/claude/analysis/raw/VERSION-evidence.json
```

`CLI_VERSION_ROOT`、`SDK_VERSION_ROOT` 和 `VERSION` 是待替换参数。扫描不区分
检索词大小写，记录原始匹配文本；源文件哈希、行号和字节偏移始终对应原文件。
扫描结果用于定位证据，仍需沿函数调用链填写报告。

## 建议流程

1. 记录 npm 包的精确版本、来源、SHA-256 和解包方式。
2. 静态扫描 CLI、SDK 及内置 `undici`/fetch 依赖，生成带偏移和哈希的证据。
3. 沿入口、请求构造器、beta 合并器、认证层和传输层顺调用链。
4. 对至少两个包版本重复扫描，标出随版本变化的字段和算法。
5. 使用合成 token、项目和请求参数进行离线构造验证；验证必须证明没有
   发出网络请求。
6. 有条件时再用同版本、同平台的脱敏抓包交叉验证头、顺序和 TLS。

`analysis/verify-scaffold.mjs` 只检查工作区结构和模板契约，不声称已经完成
Claude 包分析。
