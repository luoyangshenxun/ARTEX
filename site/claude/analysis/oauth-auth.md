# OAuth / 鉴权流程

状态：模板，待导入 CLI 和 SDK 样本。
范围：client_id、scope、授权/回调、PKCE/state、token 保存与刷新，以及
API key 和 OAuth 在请求层的差异。

## 配置与常量

| 项目 | API key | OAuth | 取值域/分支 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- | --- |
| client_id | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| scopes | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| authorize endpoint | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| token endpoint | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| redirect/callback | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| PKCE method | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| state/nonce | 不适用或 [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| token storage | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |
| refresh behavior | [待填] | [待填] | [待填] | [待填] | [待填] | [待填] |

## 请求差异

| 请求阶段 | API key 模式 | OAuth 模式 | beta/body 变化 | 来源/定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- |
| initial request | [待填] | [待填] | [待填] | [待填] | [待填] |
| token refresh | [待填] | [待填] | [待填] | [待填] | [待填] |
| 401/403 retry | [待填] | [待填] | [待填] | [待填] | [待填] |
| logout/revoke | [待填] | [待填] | [待填] | [待填] | [待填] |

## 调用链记录

```text
CLI entry
  -> credential discovery
  -> credential validation/refresh
  -> request auth injection
  -> retry/error branch
  -> logout/revoke (if any)
```

每个箭头补充实际文件、函数、参数和版本范围。SDK 自带的认证能力不能
直接当作 CLI 实际使用能力，必须沿 CLI 调用链确认。
