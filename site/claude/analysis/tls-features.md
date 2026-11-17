# 网络、头线序与 TLS 证据边界

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

主 API 调用链是 SDK → Sv → Hde/Zl → dqr → globalThis.fetch，fetchOptions 是 Bun 形态（proxy、unix、tls、timeout、keepalive）。主包 dependencies={} 并不等于没有 SDK 或没有兼容逻辑；嵌入 SDK 已抽出，网络模块还有 require("undici").setGlobalDispatcher / EnvHttpProxyAgent 的代理分支。单看 grep 到 undici 也不能认定主 API 是 Node undici。`SDK-HEADERS` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:buildHeaders` · m=177931 · b=283694961 · call-chain<br>`REQUEST-WRAPPER` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:Sv` · m=322654 · b=283839684 · call-chain<br>`HTTP-FETCH` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:dqr` · m=164860 · b=280422558 · call-chain<br>`HTTP-FETCH-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Wl` · m=110788 · b=280038349 · call-chain<br>`HTTP-UNDICI-PROXY` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:iS` · m=112932 · b=280040493 · call-chain<br>`HTTP-UNDICI-AGENT` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Zo` · m=108288 · b=280035849 · call-chain


| 配置 | 代码实际行为 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| body idle timeout / keepalive | API_FORCE_IDLE_TIMEOUT 与 body watchdog 条件决定 timeout:false；全局配置可 keepalive:false | `HTTP-FETCH-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Wl` · m=110788 · b=280038349 · call-chain |
| Unix socket | forAnthropicAPI 且 ANTHROPIC_UNIX_SOCKET 非空 → unix 字段 | `HTTP-FETCH-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Wl` · m=110788 · b=280038349 · call-chain |
| proxy / no_proxy | 显式代理、认证 Proxy-Authorization、fallbackProxy 及 noProxy 判断，可能改变外部可见网络形态 | `HTTP-FETCH-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Wl` · m=110788 · b=280038349 · call-chain |
| TLS CA / mTLS | xP 合并 sx() 与按 URL 选择的 CA；CLAUDE_CODE_CLIENT_CERT/KEY/KEY_PASSPHRASE 读入 cert/key/passphrase | `TLS-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:xP` · m=101558 · b=280029119 · call-chain<br>`TLS-MTLS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Bo` · m=98533 · b=280026094 · call-chain |
| cipher / curve | 已定位主 fetchOptions 中未见显式 cipher/curve 列表。不能从“这层没传”推导底层没有默认选择或其它 override。 | `HTTP-FETCH-OPTIONS` — S1 · `/$bunfs/root/chunk-3kfrp6r4.js:Wl` · m=110788 · b=280038349 · call-chain |

原生部分出现以下加密库线索（binary_offset 可复核），与 Bun 的 BoringSSL 实现一致。OpenSSL 字符串也存在于兼容接口/错误文本，不能仅靠该词断定另有 Node OpenSSL TLS 栈。

| 字符串 | 计数 | 前几个绝对偏移 | 证据界限 |
| --- | --- | --- | --- |
| BoringSSL | 21 | 115467831, 115565150, 119187157, 119360391 | S1 原生前缀 literal；存在字符串不等于采到 ClientHello |
| boringssl | 176 | 121640298, 121643663, 121717868, 121717933 | S1 原生前缀 literal；存在字符串不等于采到 ClientHello |
| OpenSSL | 8 | 113107269, 113108274, 113225645, 119554786 | S1 原生前缀 literal；存在字符串不等于采到 ClientHello |
| node/v26.12.1 | 1 | 113195328 | S1 原生前缀 literal；存在字符串不等于采到 ClientHello |
| node/v26.3.0 | 0 |  | S1 原生前缀 literal；存在字符串不等于采到 ClientHello |

尝试直接取对应 Bun 上游 revision 的源码失败，记录在 bun-source-provenance.json（ECONNRESET）。因此未把公开 Bun semver 的源码或独立工具行为冒充该 Claude 定制 revision 的完整实现证据。

独立 Bun 工具完成本地纯 HTTP/1.1 回显，保留原始线序于 offline-results-bun-*.json。它说明测试配置下的实际行为，不能回答官方客户端通常协商 h2 还是 h1，也不能推出 JA3/JA4。生产代理、TLS session、ALPN 和 HTTP/2 头编码均需实际同构建运行时证据。

Subway 的 JA3 44f88fca027f27bab4bb08d4af15f23e、17 ciphers、“Node.js 24.x”注释及只声明 http/1.1 来自用户给定源码基线。本轮结论为“待运行时确认”：该模板的来源注释不能继续当作已验证的 Bun 1.4.4 对等证据，但也没有采集结果证明必须换成某个新 hash。没有生成或推荐虚构 JA3/JA4。

可选后续步骤是在明确解除“不执行二进制”的边界后，仅连接自有 TLS 回显端点，记录精确 binary hash、OS、Bun revision、代理/ALPN、ClientHello 原始字节及计算方法，才可比较模板。当前不触发这一步。

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。
