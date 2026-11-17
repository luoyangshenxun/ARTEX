# Claude Code 真实出站指纹规格表

状态：模板，待导入官方 npm 样本后填写。
分析日期：2026-11-17。
范围：`@anthropic-ai/claude-code`、`@anthropic-ai/sdk`、内置网络层。

填写规则：每一行都要给出 `来源文件:函数/导出符号`、行号或字节偏移、
取值逻辑、取值域、跨字段约束、版本范围和证据级别。`[待填]` 不得替换为
单一抓包快照。

## 1. 版本与标识

| 字段 | 规格/算法 | 取值域或版本关系 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- |
| CLI package version | [待填] | package.json、构建产物和运行时版本的关系 | [待填] | [待填] | [待填] |
| SDK package version | [待填] | CLI lockfile/依赖解析结果 | [待填] | [待填] | [待填] |
| CLI product identifier | [待填] | 固定值或按发行渠道变化 | [待填] | [待填] | [待填] |
| User-Agent | [待填] | 模板、平台归一化、依赖后缀和版本联动 | [待填] | [待填] | [待填] |
| CLI version header/body field | [待填] | 与 package version、SDK version 是否绑定 | [待填] | [待填] | [待填] |

## 2. HTTP 请求头全集

| 头名（规范化前） | 线值构造 | 取值域/默认/fallback | 联动约束 | 头序/大小写证据 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `User-Agent` | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-OS` | [待填] | OS 枚举和未知值处理 | 与 Arch、Runtime 关系 | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Arch` | [待填] | Arch 枚举和未知值处理 | 与 OS 的合法组合 | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Runtime` | [待填] | runtime 名称/Node 识别 | 与 Runtime-Version 关系 | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Runtime-Version` | [待填] | `process.version` 或其他探测值 | 跟随运行时，不等于 package version | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Package-Version` | [待填] | SDK package 版本集合 | 与 CLI version 的对应关系 | [待填] | [待填] | [待填] | [待填] |
| `anthropic-version` | [待填] | [待填] | API endpoint/SDK 版本要求 | [待填] | [待填] | [待填] | [待填] |
| `anthropic-beta` | 见 beta 矩阵 | beta token 集合、顺序、去重和场景 | 请求能力、CLI 功能、认证模式 | [待填] | [待填] | [待填] | [待填] |
| `Authorization` / API key header | [待填] | API key 与 OAuth 的分支 | 与认证模式、endpoint 联动 | [待填] | [待填] | [待填] | [待填] |
| `Content-Type` | [待填] | [待填] | body 编码 | [待填] | [待填] | [待填] | [待填] |
| `Accept` / `Accept-Encoding` | [待填] | transport 默认与显式覆盖 | undici/fetch 版本 | [待填] | [待填] | [待填] | [待填] |
| `Content-Length` | [待填] | UTF-8 body 字节数或 transport 生成 | body 序列化方式 | [待填] | [待填] | [待填] | [待填] |
| 其他 CLI/代理头 | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |

### 2.1 `X-Stainless-*` 取值域与联动

不得只写当前机器的 `linux/x64`。需要记录：

- OS 原始值、归一化函数、完整观察到的枚举和未知值分支；
- Arch 原始值、归一化函数和与 OS 的可行/不可行组合；
- runtime 名称与 runtime version 的来源；
- package version 的真源、fallback 和与 CLI version 的关系；
- 头名大小写是构造层规范、`Headers` 规范化，还是 wire 层观察；
- 头序是否仅为本地对象顺序，或有同版本 wire 证据。

## 3. `anthropic-beta` 协商

完整 token 集合、生成调用链和场景矩阵见 `beta-matrix.md`。主表至少要记录：

| 项目 | 结果 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- |
| beta 常量全集 | [待填] | [待填] | [待填] | [待填] |
| CLI 默认 beta | [待填] | [待填] | [待填] | [待填] |
| SDK 默认 beta | [待填] | [待填] | [待填] | [待填] |
| 用户配置合并 | [待填] | [待填] | [待填] | [待填] |
| 顺序与去重 | [待填] | [待填] | [待填] | [待填] |
| 认证模式影响 | [待填] | [待填] | [待填] | [待填] |

## 4. 请求体身份、计费、元数据和 system prompt

| 路径 | 构造算法 | 取值域/默认/fallback | 与头或场景的联动 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- | --- |
| `metadata.*` | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| 计费/用量标识 | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| installation/session identifier | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| system prompt | [待填] | 模块、平台、版本和用户配置拼接规则 | [待填] | [待填] | [待填] | [待填] |
| model/provider fields | [待填] | [待填] | endpoint/beta/auth | [待填] | [待填] | [待填] |
| tool/stream/request flags | [待填] | [待填] | beta 和 endpoint | [待填] | [待填] | [待填] |

算法拆解和待证伪假设见 `billing-fields.md`。

## 5. 网络层与 TLS 指纹

| 项目 | 静态结果 | 运行时结果 | 来源/定位 | 证据级别 |
| --- | --- | --- | --- | --- |
| HTTP client | [待填] | [待填] | [待填] | [待填] |
| `undici` version | [待填] | [待填] | [待填] | [待填] |
| dispatcher/agent | [待填] | [待填] | [待填] | [待填] |
| proxy/env handling | [待填] | [待填] | [待填] | [待填] |
| TLS options | [待填] | [待填] | [待填] | [待填] |
| JA3/JA4 | 仅记录可由证据支持的来源 | [待填] | [待填] | [待填] |

静态 JS 只能证明配置和调用路径，不能单独证明最终 ClientHello 指纹。

## 6. OAuth / 鉴权流程

| 项目 | API key 模式 | OAuth 模式 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- |
| client_id | [待填] | [待填] | [待填] | [待填] | [待填] |
| scopes | [待填] | [待填] | [待填] | [待填] | [待填] |
| redirect/callback | 不适用或待证 | [待填] | [待填] | [待填] | [待填] |
| PKCE/state | 不适用或待证 | [待填] | [待填] | [待填] | [待填] |
| token storage/refresh | 不适用或待证 | [待填] | [待填] | [待填] | [待填] |
| request headers | [待填] | [待填] | [待填] | [待填] | [待填] |
| endpoint/base URL | [待填] | [待填] | [待填] | [待填] | [待填] |

## 7. 结论和版本差异

只有完成以上证据列后，才能给出：

- 真实指纹规格表；
- 字段取值域和合法组合规则；
- beta 携带矩阵；
- 计费字段算法；
- Subway diff；
- 可选 TLS 特征。

所有跨版本变化必须写成“版本范围 + 算法变化/常量变化 + 来源”，不能只写
“新版不同”。
