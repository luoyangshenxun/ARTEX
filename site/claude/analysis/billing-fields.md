# 计费块与 metadata 算法

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

## fingerprint 与字符串格式

先取 messages 中第一条 type=user 且 !isMeta 的消息；content 为字符串直接取，数组取第一块 type=text 的 text，否则空串。不继续寻找第二条 user 的正文。`BILLING-INPUT` — S1 · `/$bunfs/root/chunk-gpympest.js:j` · m=1780 · b=286835583 · call-chain

按 JavaScript UTF-16 零起始下标 [4,7,20] 各取一个码元，空值以字符 "0" 代替，拼为 sample3。计算 sha256(UTF8("59cf53e54c78" + sample3 + CLI_VERSION)).hex.slice(0,3)。既不采三个完整 Unicode 字符，也不采 1 起始的第 4/7/20 位。孤立代理码元在 UTF-8 编码时成为替代字符，跨 Go/JS 实现应按 JS 码元语义对拍。`BILLING-SALT` — S1 · `/$bunfs/root/chunk-gpympest.js:F` · m=1763 · b=286835566 · literal<br>`BILLING-INDEX` — S1 · `/$bunfs/root/chunk-gpympest.js:T$s` · m=2012 · b=286835815 · call-chain

下表在独立 Bun 1.4.4 下执行 S1 原函数 T$s，并执行完整 sJs 构造器；依赖由显式 firstParty fixture 提供。另执行了 Cqe、XNr、SDK auth / BetaMessages.create / countTokens / buildHeaders，截获四种 auth×stream 请求，并把 SDK 结果发送到本地 HTTP 回显。没有执行 CLI bootstrap 或完整 Eos 生成器。3hex 只有 4096 种，不能当设备 ID 或签名。

| 合成输入 | 选中码元（JSON 转义） | CLI | fp | 构造出的完整最小字符串 |
| --- | --- | --- | --- | --- |
| "Hello, Claude Code!" | ["o","C","0"] | 2.1.325 | b5b | x-anthropic-billing-header: cc_version=2.1.325.b5b; cc_entrypoint=cli; cch=00000; |
| "" | ["0","0","0"] | 2.1.325 | ff3 | x-anthropic-billing-header: cc_version=2.1.325.ff3; cc_entrypoint=cli; cch=00000; |
| "abcd😀ghijklmnopqrstu中" | ["\ud83d","h","u"] | 2.1.325 | cac | x-anthropic-billing-header: cc_version=2.1.325.cac; cc_entrypoint=cli; cch=00000; |

格式以 `x-anthropic-billing-header: cc_version=...; cc_entrypoint=...;` 开始，后续字段按表中顺序附加，每项前空格、末尾分号；它在 system 文本中，不能误当同名 HTTP 请求头。ATTRIBUTION_HEADER opt-out 可令整个块为空；特定强制选项可忽略 opt-out。

| 键（按构造顺序） | 生成与合法条件 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| cc_version | <build VERSION>.<3hex fingerprint>；必需 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_entrypoint | request override ?? CLAUDE_CODE_ENTRYPOINT ?? unknown；不是只允许 cli | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cch | firstParty && Ni() 或 vertex 时构造为字面值 00000；本轮未证实最终 wire 值 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_workload | Ol() 上下文 workload 非空 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_is_subagent | tC(context) && !context.isMainSession → true | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_prev_req | firstParty && Ni()；req_ + 1–36 个 [A-Za-z0-9_-] | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_prompt_id | firstParty && Ni()；UUID 8-4-4-4-12 十六进制 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_turn_origin | firstParty && Ni()；[a-z][a-z_]{0,31} | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_prompt_index / cc_turn_index | 成对有效才发；整数，prompt>=0、turn>=1，均 <=1e7；firstParty && Ni() | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_gateway | gateway/provider auth 分支，排除可信 Anthropic host 等条件；取 1 或 env | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_project / cc_project_src | taggedId 正则 ^(?:claude_proj\|chan)_(?:staging_\|local_)?01[1-9A-HJ-NP-Za-km-z]{22}$；source 为 harness/user/project/local/flag/managed/admin_default，且 SI() | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_prev_msg | responseBeforeCompaction.messageId；msg_ + 1–64 个 [A-Za-z0-9_]；firstParty && Ni() | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_prev_prompt_index / cc_prev_turn_index | 上一压缩消息的索引对，校验同当前索引 | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |
| cc_dispatch_entrypoint | gSn() 有值且 firstParty && Ni() | `BILLING` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:sJs` · m=943842 · b=282363982 · call-chain |

“字段全集”限定该 sJs 构造阶段。S1 解码 JS 对 cch= 的命中只有这一处；未找到其它 JS 替换算法，不能据此排除 native hook 或其它未执行阶段改写。现有证据支持 cch=00000 的构造，不支持把任意 checksum 算法称为官方最终算法。

system 数组先放 billing，再放固定前导，再放动态 system 文本；C$s 把 billing 的 cacheScope 设为 null，xos 只为非 null cache scope 的块构造 cache_control，因此 billing 块没有 cache_control。录制、side-query、缓存边界均有分支。`SYSTEM-ORDER` — S1 · `/$bunfs/root/chunk-gpympest.js:Pla` · m=3348 · b=286837151 · call-chain<br>`SYSTEM-CACHE` — S1 · `/$bunfs/root/chunk-gpympest.js:C$s` · m=4032 · b=286837835 · call-chain<br>`SYSTEM-WIRE-CACHE` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:xos` · m=3236008 · b=291938630 · call-chain

## metadata.user_id

2.1.77 的普通包直接拼接 legacy 格式，2.1.78 普通包改为 JSON；这是两个相邻实际下载样本的代码变化点。258/280/325 的原生样本均沿用 JSON，没有“按 OAuth/API key 在新旧格式间切换”的代码。`METADATA-HISTORY-2.1.77` — V2.1.77-main · `package/cli.js:Ft` · m=10427864 · file-byte=10487424 · call-chain<br>`METADATA-HISTORY-2.1.78` — V2.1.78-main · `package/cli.js:at` · m=10455522 · file-byte=10515137 · call-chain<br>`CROSS-METADATA-S4b` — S4b · `/$bunfs/root/chunk-darxmw8c.js:metadata JSON` · m=4629940 · b=165387880 · call-chain<br>`CROSS-METADATA-S4a` — S4a · `/$bunfs/root/chunk-dt8bvbsd.js:metadata JSON` · m=996980 · b=178291248 · call-chain<br>`METADATA` — S1 · `/$bunfs/root/chunk-gpympest.js:Cqe` · m=5670 · b=286839473 · call-chain

| 字段 | 来源 / 生成 / 作用域 | 来源（文件:函数）与证据级别 |
| --- | --- | --- |
| device_id | hD 复用全局配置中合法小写 64hex userID；否则复用进程缓存/有效传入身份或 crypto.randomBytes(32).toString(hex)，通过 Me 写回配置。不是 MAC/硬件特征派生。 | `DEVICE-ID` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:hD` · m=138931 · b=281559071 · call-chain<br>`DEVICE-SAVE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:Me` · m=97037 · b=281517177 · call-chain |
| 持久化位置 | 默认 ~/.claude.json，可由 CLAUDE_CONFIG_DIR 改根；存在合法 legacy 配置时可用 ~/.claude/.config.json；存储 backend 与 diskless 路径另有分支。未读取本机任何账号配置。 | `DEVICE-CONFIG-PATH` — S1 · `/$bunfs/root/chunk-428zme0n.js:aYr` · m=55251 · b=278369772 · call-chain<br>`DEVICE-CONFIG-LEGACY` — S1 · `/$bunfs/root/chunk-428zme0n.js:z_` · m=54422 · b=278368943 · call-chain |
| account_uuid | remote 模式可由 CLAUDE_CODE_ACCOUNT_UUID；否则 dT()?.accountUuid ?? hn()?.accountUuid ?? ""，来自活动授权账号资料。 | `METADATA` — S1 · `/$bunfs/root/chunk-gpympest.js:Cqe` · m=5670 · b=286839473 · call-chain |
| session_id | G() 返回委派/上下文 session ID 或当前进程会话 ID；不是每次 HTTP 新 UUID。恢复/子会话上下文可改变。 | `SESSION-ID` — S1 · `/$bunfs/root/chunk-m8nhymg4.js:G` · m=94201 · b=278118704 · call-chain |
| parent_session_id / tk | parent session 存在时附加；特定 remote 上下文可附 tk。原实现用 undefined 使缺省键不序列化。 | `METADATA` — S1 · `/$bunfs/root/chunk-gpympest.js:Cqe` · m=5670 · b=286839473 · call-chain |
| extra metadata | CLAUDE_CODE_EXTRA_METADATA 必须 JSON object；过滤为 string/number/bool，并排除 ti/os/sb/he/uf/ap/tk 等保留键；核心键在展开后写入，不可被 extra 覆盖。 | `METADATA` — S1 · `/$bunfs/root/chunk-gpympest.js:Cqe` · m=5670 · b=286839473 · call-chain<br>`METADATA-FILTER` — S1 · `/$bunfs/root/chunk-gpympest.js:B` · m=2746 · b=286836549 · call-chain |
| 大小控制 | user_id 是 JSON 字符串；JSON.stringify 结果的 JS .length（UTF-16 码元数）超 512 时先丢弃额外元数据，再丢可选辅助字段；不是 UTF-8 字节阈值，也不硬截断核心 ID。 | `METADATA` — S1 · `/$bunfs/root/chunk-gpympest.js:Cqe` · m=5670 · b=286839473 · call-chain<br>`JSON-STRINGIFY` — S1 · `/$bunfs/root/chunk-bdfv2ky4.js:_` · m=6822 · b=278242152 · call-chain |

设备 ID 与账号 ID 不能互相替代，同一设备可切账号，同一账号可开多个会话；x-client-request-id 另外按请求生成。上述作用域用于解释官方行为，不把 profile 的字段逐个随机化。

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。
