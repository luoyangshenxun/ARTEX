# OAuth / API key / setup-token

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。


| 项目 | 官方构造值 / 分支 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| client_id | 9d1c250a-e61b-44d9-88ed-5944d1962f5e；自定义 OAuth client 有覆盖分支 | `OAUTH-ENDPOINTS` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:o` · m=1347 · b=278185225 · literal |
| authorize（Claude subscription） | https://claude.com/cai/oauth/authorize | `OAUTH-ENDPOINTS` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:o` · m=1347 · b=278185225 · literal |
| authorize（Console） | https://platform.claude.com/oauth/authorize | `OAUTH-ENDPOINTS` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:o` · m=1347 · b=278185225 · literal |
| token | https://platform.claude.com/v1/oauth/token | `OAUTH-ENDPOINTS` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:o` · m=1347 · b=278185225 · literal |
| redirect | manual: https://platform.claude.com/oauth/code/callback；本地 listener: http://localhost:<port>/callback | `OAUTH-AUTHORIZE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:d2o` · m=344409 · b=281764549 · call-chain |
| authorize 参数 | response_type=code、client_id、redirect_uri、scope 空格连接、PKCE code_challenge_method=S256、state，另有账号/org/login hint | `OAUTH-AUTHORIZE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:d2o` · m=344409 · b=281764549 · call-chain |
| code exchange | grant_type=authorization_code、code、redirect_uri、client_id、code_verifier、state；可带 expires_in；JSON POST timeout=30s | `OAUTH-EXCHANGE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:oYs` · m=345258 · b=281765398 · call-chain |
| API key / OAuth 发请求 | SDK auth 分别 X-Api-Key / Authorization: Bearer；CLI client factory 决定认证来源，beta 里的 oauth 条件另看 Dt/Kl 分支。 | `SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain<br>`CLI-CLIENT-OPTIONS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:jB` · m=303560 · b=283820590 · call-chain<br>`BETA-BASE-RULES` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:B1` · m=533897 · b=281954037 · call-chain |

生产默认注册配置下，完整授权 scope 顺序为：org:create_api_key、user:profile、user:inference、user:sessions:claude_code、user:mcp_servers、user:file_upload、user:plugins、user:privacy_consents:write，共 8 项。Q5t 的默认刷新 scope 是 profile/inference/sessions/mcp_servers/file_upload/plugins 共 6 项。客户端 override、inferenceOnly、alsoScope 可改变授权集合；不能继续把“浏览器 6 / API 5”写成这版通用规则。`OAUTH-SCOPES` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:Pqo` · m=1038 · b=278184916 · call-chain<br>`OAUTH-REFRESH-SCOPES` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:Q5t` · m=952 · b=278184830 · call-chain<br>`OAUTH-ENDPOINTS` — S1 · `/$bunfs/root/chunk-mxjxrrv2.js:o` · m=1347 · b=278185225 · literal<br>`OAUTH-AUTHORIZE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:d2o` · m=344409 · b=281764549 · call-chain

setup-token 进入 ConsoleOAuthFlow 的 setup-token 分支，inferenceOnly=true，因此 scope 仅 user:inference；请求 expires_in 默认 31536000 秒（365 天）。这是客户端申请值，真实 expiresAt 来自响应 expires_in；formatTokens 还接受 refresh_token_expires_in，不能承诺服务端永远签发整年。`SETUP-TOKEN` — S1 · `/$bunfs/root/chunk-3w3d2xtj.js:zqa` · m=2024 · b=312014946 · call-chain<br>`SETUP-TOKEN-OPTIONS` — S1 · `/$bunfs/root/chunk-xqhnat87.js:ConsoleOAuthFlow` · m=18070 · b=314235729 · call-chain<br>`OAUTH-FORMAT-TOKENS` — S1 · `/$bunfs/root/chunk-tek4m4rx.js:Sz.formatTokens` · m=8350 · b=294695605 · call-chain

setup 成功路径验证新 token，随后展示 accessToken/expiresAt；普通 login 的存储分支位于 else。未把 setup-token 的输出访问令牌等同于“本地已经有 refresh token”。本轮不走真实兑换。`SETUP-TOKEN-SUCCESS` — S1 · `/$bunfs/root/chunk-xqhnat87.js:ConsoleOAuthFlow` · m=18700 · b=314236359 · call-chain

已存储 OAuth 凭据有 refreshToken 时，O_e 用 grant_type=refresh_token、client_id、scope 发刷新请求；新 refresh token 缺失时回退旧值，expiresAt 由响应计算；$O 在到期前 300000ms 判过期。无 refreshToken 的配置走 no_refresh_token 分支；CLAUDE_CODE_OAUTH_TOKEN 等外部注入 token 的替换可依赖 host 或重新签发，不能宣称它一定可自动刷新，也不能宣称所有 setup 相关授权永不刷新。`OAUTH-REFRESH` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:O_e` · m=346037 · b=281766177 · call-chain<br>`OAUTH-EXPIRY` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:$O` · m=351194 · b=281771334 · call-chain<br>`OAUTH-NO-REFRESH` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:vl` · m=624010 · b=282044150 · call-chain<br>`OAUTH-ENV-401` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:lT` · m=616420 · b=282036560 · call-chain

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。
