# 字段取值域与合法组合规则

状态：模板，待静态证据和多版本样本填充。
目的：把客户端实际生成逻辑转换成可审计的字段域和跨字段规则，避免把
不同平台、运行时或包版本的字段拼成现实中不存在的组合。

## 字段域表

| 字段 | 原始来源 | 归一化/探测逻辑 | 合法取值域 | 默认/fallback | 联动约束 | 版本范围 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `X-Stainless-OS` | [待填] | [待填] | [待填] | [待填] | 与 Arch、runtime 约束 | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Arch` | [待填] | [待填] | [待填] | [待填] | 与 OS 约束 | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Runtime` | [待填] | [待填] | [待填] | [待填] | 与 Runtime-Version 约束 | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Runtime-Version` | [待填] | [待填] | [待填] | [待填] | 跟随实际 Node/runtime | [待填] | [待填] | [待填] | [待填] |
| `X-Stainless-Package-Version` | [待填] | [待填] | [待填] | [待填] | 与 SDK 和 CLI 版本关系 | [待填] | [待填] | [待填] | [待填] |
| CLI version | [待填] | [待填] | [待填] | [待填] | 与 package/UA/body 关系 | [待填] | [待填] | [待填] | [待填] |
| `User-Agent` platform token | [待填] | [待填] | [待填] | [待填] | 与 OS/Arch 联动 | [待填] | [待填] | [待填] | [待填] |
| `anthropic-beta` tokens | [待填] | [待填] | [待填] | [待填] | 与 endpoint、能力、auth 联动 | [待填] | [待填] | [待填] | [待填] |
| auth mode | [待填] | [待填] | API key/OAuth/其他 | [待填] | 影响 headers、beta、body | [待填] | [待填] | [待填] | [待填] |
| metadata fields | [待填] | [待填] | [待填] | [待填] | 与安装、会话、计费状态联动 | [待填] | [待填] | [待填] | [待填] |
| billing identifier | [待填] | [待填] | [待填] | [待填] | 与账号/模型/请求类型联动 | [待填] | [待填] | [待填] | [待填] |

## 组合规则

每条规则必须能回溯到源文件和调用链。使用以下格式：

```text
RULE-ID:
  when: FIELD_A in {...} and FIELD_B matches ...
  then: FIELD_C must be ... / combination is impossible
  source: relative/file.js:function-or-export
  location: line or byte offset
  version: package version or range
  evidence: literal | call-chain | offline-reproduction | runtime-capture | inference
```

待填规则槽：

- `OS ↔ Arch`：哪些组合由归一化函数直接产生，哪些只存在于 schema 或
  其他依赖，哪些明确不可能；
- `Runtime ↔ Runtime-Version`：运行时名称和版本是否来自同一探测入口；
- `SDK package version ↔ CLI version`：版本是否锁定、范围匹配或可独立变化；
- `CLI version ↔ User-Agent`：是否直接拼接，是否存在渠道后缀；
- `beta ↔ endpoint/request capability`：每个 beta 的触发条件；
- `auth mode ↔ headers/body/beta`：API key、OAuth、代理或第三方 endpoint；
- `metadata ↔ billing/session`：字段是否随机、持久化、按账号或按请求生成。

## 判断准则

- 枚举值来自代码分支、常量表或同版本运行时观察，不能来自字段名称猜测；
- “未发现”只表示在给定样本和扫描范围内未发现；
- `schema` 支持某字段不等于 CLI 一定发送该字段；
- 运行时版本来自分析机时，必须与官方 Electron/Node 运行时分开记录；
- 版本差异要保留旧规则、新规则和变化首次出现的样本。
