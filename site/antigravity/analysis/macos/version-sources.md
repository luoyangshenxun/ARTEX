# Antigravity macOS 版本来源结论

## 结论

自动同步应读取官方 Electron updater 的平台 manifest。对 macOS Apple Silicon，当前样本对应：

```text
manifest:
https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml

request header:
x-app-version: <当前 App 版本>
```

本地保存的响应是 [latest-arm64-mac.yml](./latest-arm64-mac.yml)，抓取时间为 **2026 年 11 月 16 日**，请求版本头为 `2.32.0`，返回版本为 `2.32.1`。

## 来源优先级

| 优先级 | 来源 | 结论 |
|---|---|---|
| P0 | 官方 updater manifest | 用于自动同步版本、构建目录、文件大小和 SHA-512 |
| P1 | 官方 App 下载页 | 用于发现当前下载入口和安装包类型 |
| P2 | 本地 App `Info.plist` / `package.json` | 用于确定已下载样本的实际 App 版本 |
| P3 | 第三方 changelog | 不作为自动同步依据 |

## macOS channel 规则

官方 `dist/updater.js` 的规则是：

```text
process.platform === "win32"
  ? latest-${process.arch}-win
  : latest-${process.arch}
```

Electron updater 在 macOS 上补充 `-mac`，所以 Apple Silicon 最终文件名为：

```text
latest-arm64-mac.yml
```

请求头是：

```text
x-app-version: 2.32.0
```

## 2026-11-16 样本响应

```yaml
version: 2.32.1
files:
  - url: https://storage.googleapis.com/antigravity-public/antigravity-hub/2.32.1-6001966350991360/darwin-arm/Antigravity.zip
    size: 216300499
path: Antigravity.zip
```

响应头记录在 [update-manifest.headers.txt](./update-manifest.headers.txt)。

## 实现建议

同步任务应按目标平台生成 manifest 名称，发送当前 App 版本头，解析并保存：

```text
version
files[].url
files[].size
files[].sha512
path
```

随后从 URL 的构建目录提取 `version-execution_id-platform`，把版本号和执行构建号一起写入 Subway 的版本配置。若 manifest 的 `version` 高于本地版本，应产生候选更新；不要从 UA 中反推版本，也不要把产品 Changelist 当成 App 版本。
