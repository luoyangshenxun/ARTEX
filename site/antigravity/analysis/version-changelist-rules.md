# Antigravity：版本与 changelist 配对证据

日期：2026-11-16。样本：本地 `Antigravity-IDE-2.7.0-windows-x64.exe`。

## 已观察映射

| 版本域 | 已观察值 | 来源 | 可以证明什么 |
| --- | --- | --- | --- |
| IDE 产品 | `2.7.0` | `product.json.ideVersion` | 本地产品版本、IDE UA 和 metadata 取值来源 |
| VS Code 基线 | `1.107.0` | `product.json.version`、`package.json.version` | 编辑器基础版本 |
| 扩展 | `1.11.0` | `extensions/agy/package.json.version` | 打包扩展版本 |
| 语言服务 CL | `1018779249` | `product.json.languageServerCL` | 与本 IDE 包共同发行的配置记录；About 对话框读取 |
| 产品提交 | `71bedb45923debaf49871bdcb7c7d3a47918e247` | `product.json.commit` | IDE 更新请求所带的提交标识 |
| CLI 最低兼容版本 | `1.1.11` | `Va.MIN_AGY_VERSION` | 扩展的兼容阈值，不是安装时必选版本 |
| CLI 更新响应版本 | `1.5.9` | 分析当天取回的官方平台 manifest | 当时该 endpoint 返回的 CLI 版本 |
| hub UA 版本 | `HUB_VERSION` | 本样本后台二进制缺失 | 待确认 |
| App 目标版本 | 用户给定 `2.32.0` | 任务描述 | 不构成本地样本的版本证据 |

## 可以复用的读取规则

1. 对固定安装包计算 SHA-256，再读取同包 `product.json`；保存 `ideVersion`、`languageServerCL`、`commit`、`date` 和包哈希，形成一条不可混用的样本记录。
2. IDE 请求 UA 从 `ideVersion` 读取；当前已定位 getter 没有把 `languageServerCL` 拼入 UA。
3. 当前 ClientMetadata 的构造只设置 `ideName`、`ideType`、`ideVersion`；其 schema 不包含 changelist。
4. `languageServerCL` 在当前主进程 bundle 中定位到的读取用途是 About 信息展示；这不证明后台不会另行携带自身 CL。
5. CLI 下载版本由平台 manifest 与现有安装状态决定；最低版本阈值和扩展自身版本都不能替代下载后的真实版本。
6. hub 的 UA、CL 配对应当绑定到同一个后台构建。当前没有数据支持由 semver 计算 CL，也没有找到必须保持某种算术关系的算法。

已知样本记录：

```json
{
  "product": "Antigravity IDE",
  "platform": "windows-x64",
  "installerSha256": "307c7a41b050ffe742fd4dd1045050df1464de219271f74b5f6c269e9e00c822",
  "ideVersion": "2.7.0",
  "languageServerCL": "1018779249",
  "commit": "71bedb45923debaf49871bdcb7c7d3a47918e247",
  "date": "2026-11-11T04:46:27.114Z",
  "hubVersion": null,
  "hubChangelist": null,
  "hubChangelistRequestLocation": null,
  "pairingAlgorithm": null
}
```

四个 null 对应尚缺证据，不能填入 IDE 版本、CLI 版本或推测 CL。

## 复核位置

`focused-evidence.json`：E01、E02、E03、E10、E15–E18、E28。

`request-schemas.json`：`ClientMetadata`。

`cli-manifest-windows-amd64.json`：官方平台 manifest 原始响应。

未验证 `#3968` 内容或账号封禁原因，因此没有“配对正确即可避免封号”的结论。
