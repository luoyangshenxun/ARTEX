# Antigravity 官方版本来源：从本地客户端定位

日期：2026-11-16。此文区分源码中已定位的地址与实际读到的响应。

## 1. CLI 平台 manifest：已定位并读取

证据：`extensions/agy/vscode/extension.js`，E15–E17。

生产默认 base：

```text
https://antigravity-cli-auto-updater-974169037036.us-central1.run.app
```

扩展首先请求：

```text
GET BASE/manifests/PLATFORM_ARCH.json
```

映射：`win32 → windows`，`x64 → amd64`，因此本 Windows x64 目标对应：

```text
https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/windows_amd64.json
```

源码中还能看到 HTTP 错误后的回退路径：

```text
GET BASE/latest
GET BASE/VERSION/manifest.json
GET BASE/releases/latest/manifest.json
```

`BASE/latest` 响应中的版本会用于下一条 manifest 请求。网络异常与 HTTP 状态错误在实现中分开处理，不能理解为所有错误都会无条件走完整回退序列。

配置优先级：

1. `AGY_RELEASE_BASE_URL` 环境变量。
2. `antigravity.releaseBaseUrl` 配置。
3. 按 channel 选默认地址；dogfood base 为 `https://storage.googleapis.com/antigravity-public/antigravity-cli`。

本次只读取生产平台 manifest，响应保存为 `cli-manifest-windows-amd64.json`：

```json
{
  "version": "1.5.9",
  "url": "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.9-4515810895593472/windows-x64/cli_windows_x64.exe",
  "sha512": "539a9415a686d9ec45f5c59fe7d32c485c6fa9abaea50208ae8ede4ed3622b9fb2bfd6680c87dc52344981172a96ddacb261ff4231276b5572fb5b62a9b0221e"
}
```

读取退出状态为 0。没有下载或执行这份 CLI 二进制，因此 SHA-512 是服务器提供的声明，尚未对下载文件复核；URL 中的数字构建后缀也没有证据可直接解释为 changelist。

该来源回答的是 CLI 发行版更新；它不能单独给出 App 2.32.0 的 hub UA 和 changelist。

## 2. IDE 更新检查：已定位，未调用

证据：`out/main.js` 的 `Zqe` 与 Windows `buildUpdateFeedUrl`，E13、E14。

外部稳定版的源码模板：

```text
https://antigravity-ide-auto-updater-974169037036.us-central1.run.app/api/update/PLATFORM/QUALITY/COMMIT/HOST_SHA256
```

平台构造：

- 通用 Windows：`win32-ARCH`。
- archive 类型追加 `-archive`。
- 其余 `product.target=user` 追加 `-user`。

本包 `target=user`，普通用户安装路径对应 `win32-x64-user`；`quality=stable`，commit 从 `product.json.commit` 读取。最后一段是主机名的 SHA-256，计算失败走 `no_hostname`。后台更新检查可加 `?bg=true`。

`product.json.updateUrl` 的原文是 `https://example.com`。实际 URL 由上面函数构造，不能仅据该产品字段判定客户端没有更新机制。

本次未向这个 feed 发送主机信息，也未读取其返回结构，不能承诺它包含 hub 版本或 CL。

## 3. 其他候选来源

| 候选 | 本次状态 | 能否作为 hub 自动同步源 |
| --- | --- | --- |
| 官方 changelog | 未取得可核验页面内容 | 待确认；App 展示版本不等于 hub 版本 |
| Antigravity-Manager 的 `hub_version.rs` | 当前项目没有此文件，本次未取得外部仓库内容 | 待确认；不能用仓库名代替源码证据 |
| 第三方 changelog 聚合站 | 未采样、未评估 | 未确认 |
| 本地 `product.json` | 已读取固定样本 | 可记录同包 IDE/CL 配置，不是在线新版本发现源 |
| 本地后台二进制／sidecar | 未在安装包中发现后台二进制 | 取得同版本样本后可记录版本与哈希，仍需证明出站使用位置 |

## 4. 自动同步需要保留的关系

已经可以明确的数据关系是 `CLI manifest → CLI version + artifact URL + sha512`，以及 `IDE 包哈希 → ideVersion + languageServerCL + commit`。

尚缺的是 `指定 App 发行版 → 对应 hub 构建 → hub UA version + changelist + 请求中携带位置`。在这条链完整前，不应把 CLI 或 IDE 的版本直接写入 hub UA。
