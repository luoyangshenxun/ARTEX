# anthropic-beta 有序条件矩阵 · 2.1.325

记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。

m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。

六个场景轴不足以唯一确定线上 token 列表。相同 stream/tools/thinking/model-family/auth，可因交互模式、模型能力与别名、组织策略、远程 flag、SDK/env betas、请求来源、缓存 TTL、fallback 与会话历史不同而不同。这里交付完整条件来源、实际代码的有序变更记录，以及固定输入下可复算的 128 格矩阵；不把未知动态输入假装成生产默认。

顺序：$1 遍历 B1 → env betas → ree 的模型/策略/拒绝过滤 → z7n 按来源补 claude-code，再按 G1 增补能力项与 SDK betas → Eos 按实际请求条件逐项追加/移除 → P4r provider 过滤 → v2 取非 null header → SDK endpoint 的 token。源码与每个 mutation 的偏移及分支方向见 [beta-mutations.json](beta-mutations.json)。这是调用链证据，mutation 里的 then/else/test 不可忽略。`BETA-BASE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:$1` · m=534838 · b=281954978 · call-chain<br>`BETA-CACHED` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:ree` · m=535400 · b=281955540 · call-chain<br>`BETA-AGENTIC` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:z7n` · m=535914 · b=281956054 · call-chain<br>`BETA-SERIALIZE` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:v2` · m=157446 · b=280415144 · call-chain<br>`BETA-WIRE-ASSEMBLY` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:Jqe` · m=3129400 · b=291832022 · call-chain

## CLI 注册项全集

此处“全集”指 S1 CLI 的 M/Wc 注册区间，不是 SDK 所有端点的 beta 字符串全集。null 是内部能力标记，不发头。任意 env/SDK 扩展使网络 token 集合开放。

| 符号 / 内部名 | header（原文） | 来源/定位与证据级别 |
| --- | --- | --- |
| _Sn / claude_code | claude-code-20250219 | `BETA-CONSTANT-_Sn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:_Sn` · m=154229 · b=280411927 · literal |
| ilt / oauth_auth | oauth-2025-04-20 | `BETA-CONSTANT-ilt` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:ilt` · m=154273 · b=280411971 · literal |
| dXn / interleaved_thinking | interleaved-thinking-2025-05-14 | `BETA-CONSTANT-dXn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:dXn` · m=154296 · b=280411994 · literal |
| nC / long_context | context-1m-2025-08-07 | `BETA-CONSTANT-nC` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:nC` · m=154360 · b=280412058 · literal |
| DTe / context_management | context-management-2025-06-27 | `BETA-CONSTANT-DTe` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:DTe` · m=154405 · b=280412103 · literal |
| yee / structured_outputs | structured-outputs-2025-12-15 | `BETA-CONSTANT-yee` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:yee` · m=154465 · b=280412163 · literal |
| p6o / web_search | web-search-2025-03-05 | `BETA-CONSTANT-p6o` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:p6o` · m=154525 · b=280412223 · literal |
| ySn / tool_search | advanced-tool-use-2025-11-20 | `BETA-CONSTANT-ySn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:ySn` · m=154569 · b=280412267 · literal |
| MAt / tool_search | tool-search-tool-2025-10-19 | `BETA-CONSTANT-MAt` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:MAt` · m=154621 · b=280412319 · literal |
| LTe / effort | effort-2025-11-24 | `BETA-CONSTANT-LTe` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:LTe` · m=154672 · b=280412370 · literal |
| sqr / task_budgets | task-budgets-2026-03-13 | `BETA-CONSTANT-sqr` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:sqr` · m=154708 · b=280412406 · literal |
| ije / prompt_caching_scope | prompt-caching-scope-2026-01-05 | `BETA-CONSTANT-ije` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:ije` · m=154756 · b=280412454 · literal |
| DAt / prompt_caching_evict | prompt-caching-evict-2026-05-12 | `BETA-CONSTANT-DAt` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:DAt` · m=154820 · b=280412518 · literal |
| hH / cache_keepalive | cache-keepalive-2026-09-03 | `BETA-CONSTANT-hH` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:hH` · m=154884 · b=280412582 · literal |
| SSn / extended_cache_ttl | extended-cache-ttl-2025-04-11 | `BETA-CONSTANT-SSn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:SSn` · m=154937 · b=280412635 · literal |
| S3t / speed | fast-mode-2026-02-01 | `BETA-CONSTANT-S3t` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:S3t` · m=154997 · b=280412695 · literal |
| cXn / redact_thinking | redact-thinking-2026-02-12 | `BETA-CONSTANT-cXn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:cXn` · m=155035 · b=280412733 · literal |
| alt / thinking_resumption | thinking-resumption-2026-07-17 | `BETA-CONSTANT-alt` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:alt` · m=155089 · b=280412787 · literal |
| zW / thinking_token_count | thinking-token-count-2026-05-13 | `BETA-CONSTANT-zW` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:zW` · m=155151 · b=280412849 · literal |
| E2 / afk_mode | afk-mode-2026-01-31 | `BETA-CONSTANT-E2` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:E2` · m=155214 · b=280412912 · literal |
| llt / advisor_tool | advisor-tool-2026-03-01 | `BETA-CONSTANT-llt` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:llt` · m=155253 · b=280412951 · literal |
| b3t / cache_diagnosis | cache-diagnosis-2026-04-07 | `BETA-CONSTANT-b3t` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:b3t` · m=155301 · b=280412999 · literal |
| m6o / context_hint | context-hint-2026-04-09 | `BETA-CONSTANT-m6o` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:m6o` · m=155355 · b=280413053 · literal |
| uXn / mcp_servers | mcp-servers-2025-12-04 | `BETA-CONSTANT-uXn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:uXn` · m=155403 · b=280413101 · literal |
| kx / files_api | files-api-2025-04-14 | `BETA-CONSTANT-kx` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:kx` · m=155449 · b=280413147 · literal |
| OQs / environments | environments-2025-11-01 | `BETA-CONSTANT-OQs` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:OQs` · m=155490 · b=280413188 · literal |
| bSn / ccr_byoc | ccr-byoc-2025-07-29 | `BETA-CONSTANT-bSn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:bSn` · m=155538 · b=280413236 · literal |
| gH / ccr_tool_provenance | tool-provenance-2026-10-26 | `BETA-CONSTANT-gH` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:gH` · m=155578 · b=280413276 · literal |
| IQs / tool_provenance_server_url_latch | x-cc-internal-tool-provenance-server-url | `BETA-CONSTANT-IQs` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:IQs` · m=155635 · b=280413333 · literal |
| PS / mid_conversation_system | null（不发送） | `BETA-CONSTANT-PS` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:PS` · m=155720 · b=280413418 · literal |
| y3 / per_message_effort | per-turn-control-2026-07-01 | `BETA-CONSTANT-y3` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:y3` · m=155794 · b=280413492 · literal |
| DY / per_turn_timing | timing-2026-09-09 | `BETA-CONSTANT-DY` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:DY` · m=155851 · b=280413549 · literal |
| nE / mid_conv_tool_change | mid-conversation-tool-changes-2026-07-01 | `BETA-CONSTANT-nE` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:nE` · m=155895 · b=280413593 · literal |
| fw / inline_tools | inline-tools-2026-09-15 | `BETA-CONSTANT-fw` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:fw` · m=155967 · b=280413665 · literal |
| Uz / server_side_fallback | server-side-fallback-2026-06-01 | `BETA-CONSTANT-Uz` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:Uz` · m=156014 · b=280413712 · literal |
| yP / program_use_case_ids | program-use-case-ids-2026-09-17 | `BETA-CONSTANT-yP` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:yP` · m=156077 · b=280413775 · literal |
| yk / server_side_fallback_category | server-side-fallback-2026-07-01 | `BETA-CONSTANT-yk` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:yk` · m=156140 · b=280413838 · literal |
| S3 / fallback_credit | fallback-credit-2026-06-01 | `BETA-CONSTANT-S3` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:S3` · m=156212 · b=280413910 · literal |
| fXn / mid_conv_cache_promotion_latch | x-cc-internal-mid-conv-cache-promotion | `BETA-CONSTANT-fXn` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:fXn` · m=156265 · b=280413963 · literal |
| MQs / mid_conv_cache_promotion_ok_latch | x-cc-internal-mid-conv-cache-promotion-ok | `BETA-CONSTANT-MQs` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:MQs` · m=156346 · b=280414044 · literal |
| DQs / auto_mode_classifier | auto-mode-classifier-2026-07-16 | `BETA-CONSTANT-DQs` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:DQs` · m=156442 · b=280414140 · literal |
| b3 / claude_code_side_query | claude-code-side-query-2026-09-29 | `BETA-CONSTANT-b3` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:b3` · m=156506 · b=280414204 · literal |
| ib / dangerous_tool_use | dangerous-tool-use-2026-09-03 | `BETA-CONSTANT-ib` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:ib` · m=156573 · b=280414271 · literal |
| HTe / thinking_display_updates | thinking-display-updates-2026-08-18 | `BETA-CONSTANT-HTe` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:HTe` · m=156640 · b=280414338 · literal |
| LQs / thinking_display | null（不发送） | `BETA-CONSTANT-LQs` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:LQs` · m=156712 · b=280414410 · literal |
| w3 / thinking_binding_controls | thinking-binding-controls-2026-08-01 | `BETA-CONSTANT-w3` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:w3` · m=156739 · b=280414437 · literal |
| E3 / message_threads | message-threads-2026-08-12 | `BETA-CONSTANT-E3` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:E3` · m=156812 · b=280414510 · literal |
| _9 / mid_conversation_system_clear_at | mid-conversation-system-clear-at-2026-08-21 | `BETA-CONSTANT-_9` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:_9` · m=156865 · b=280414563 · literal |

## 必核条件

| token | 真实条件 / 限制 | 来源/定位 |
| --- | --- | --- |
| fine-grained-tool-streaming | S1 的 3055 个已解码 JS 模块中该字符串计数为 0；不应列为本版固定必带。env 可注入任意 beta，静态缺失不构成绝对不可能。 | native-scan-summary.json |
| redact-thinking-2026-02-12 | B1: firstPartyOnlyBetas && interleavedThinking && !ge() && !L7n()；ge 是“非交互”。后续 thinking display 选择可移除；不能等同 thinking 开关。 | `BETA-BASE-RULES` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:B1` · m=533897 · b=281954037 · call-chain |
| fast-mode-2026-02-01 | fast 模式实际可用、当前请求选择 fast、会话 latch 与拒绝状态允许后，在请求阶段追加；仅常量存在不表示全量带。 | BETA-WIRE-ASSEMBLY；beta-mutations.json |
| structured-outputs-2025-12-15 | B1 路径依赖 F7n(model) + tengu_tool_pear；输出 schema 经 Gns 写入 output_config.format 时也会追加，拒绝/能力检查可阻止。 | `BETA-STRUCTURED` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:F7n` · m=530450 · b=281950590 · call-chain<br>`BETA-OUTPUT-FORMAT` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:Gns` · m=3068243 · b=291770865 · call-chain |
| inline-tools-2026-09-15 | G1: UVr() && F_e(modelFacts) && A_n()；涉及 foamy_spring flag、mid-conv tool 能力与 inline env/flag。不是有 tools 就带。 | `BETA-CAP-RULES` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:G1` · m=534588 · b=281954728 · call-chain<br>`BETA-TOOL-GATE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:UVr` · m=386710 · b=281806850 · call-chain<br>`BETA-TOOL-CHANGE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:F_e` · m=531108 · b=281951248 · call-chain<br>`BETA-INLINE` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:A_n` · m=386557 · b=281806697 · call-chain |
| server-side-fallback-2026-06-01 / 2026-07-01 | C0n 区分显式 fallbacks 与 default：模型匹配、功能开关、会话接受/拒绝 latch、silent 重试；按 [Uz,yk] 顺序检查追加。 | `BETA-SERVER-FALLBACK` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:C0n` · m=2797171 · b=291499793 · call-chain |
| fallback-credit-2026-06-01 | A0n 的 armed 状态设 latch，未被拒绝且非 silent 才追加；Bedrock 另写 anthropic_beta。 | `BETA-FALLBACK-CREDIT` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:A0n` · m=2797586 · b=291500208 · call-chain |
| extended-cache-ttl-2025-04-11 | 只有当前请求确实使用 1h cache 等 TTL 条件满足时追加，不因 OAuth 自动全量带。 | BETA-WIRE-ASSEMBLY；beta-mutations.json |
| mid-conversation-output-config-2026-07-01 | S1 解码 JS 中字符串计数 0；当前 registry 是 mid-conversation-tool-changes / per-turn-control 等不同 token，不能混写。 | native-scan-summary.json；beta-registry.json |
| thinking-binding-controls-2026-08-01 | body thinking 启用且绑定模式/功能可用时设会话 latch，后续 thinking 关闭仍可能保留；mechanical disable、proxy 和 server 拒绝分支可移除。 | `BETA-STICKY-BINDING` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:Eos` · m=3111600 · b=291814222 · call-chain<br>`BETA-BINDING-GATE` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:nGn` · m=2980549 · b=291683171 · call-chain |

## 可复算场景矩阵

机器文件：[beta-conditional-matrix.json](beta-conditional-matrix.json)。覆盖 2×2×2×4×2=64 个用户要求场景，再乘交互/非交互共 128 格，另有 8 个 count_tokens 格。beta-probe 在 Bun 下直接求值抽出的 B1/G1，主请求扩展按已定位分支构造明确的 fixture，未运行 Eos 完整生成器。

固定输入：firstParty、agentic source、新会话、无拒绝 latch、无 env/SDK 扩展；模型能力均显式设 interleaved/context/thinking-token/effort/binding=true，1m/per-turn/fast/fallback/search/cache1h 等为 false；thinking display=none；结构化输出 flag=false；prompt-cache-scope=true。模型名为 synthetic-<family>，fable 行不声称某个已发布型号拥有这些能力。stream/tools 在这个 fixture 下不改变 beta，因此下面每行同时代表其四种组合；完整 128 格在 JSON，各格保留完整列表和顺序。

| 模型族 | 鉴权 | 交互 | thinking | 完整 token 列表（按序） |
| --- | --- | --- | --- | --- |
| opus | oauth | 否 | 关 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| opus | oauth | 否 | 开 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| opus | oauth | 是 | 关 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| opus | oauth | 是 | 开 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| opus | api_key | 否 | 关 | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| opus | api_key | 否 | 开 | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| opus | api_key | 是 | 关 | claude-code-20250219, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| opus | api_key | 是 | 开 | claude-code-20250219, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| sonnet | oauth | 否 | 关 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| sonnet | oauth | 否 | 开 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| sonnet | oauth | 是 | 关 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| sonnet | oauth | 是 | 开 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| sonnet | api_key | 否 | 关 | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| sonnet | api_key | 否 | 开 | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| sonnet | api_key | 是 | 关 | claude-code-20250219, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| sonnet | api_key | 是 | 开 | claude-code-20250219, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| haiku | oauth | 否 | 关 | oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24 |
| haiku | oauth | 否 | 开 | oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| haiku | oauth | 是 | 关 | oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24 |
| haiku | oauth | 是 | 开 | oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| haiku | api_key | 否 | 关 | interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24 |
| haiku | api_key | 否 | 开 | interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| haiku | api_key | 是 | 关 | interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24 |
| haiku | api_key | 是 | 开 | interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, claude-code-20250219, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| fable | oauth | 否 | 关 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| fable | oauth | 否 | 开 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| fable | oauth | 是 | 关 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| fable | oauth | 是 | 开 | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| fable | api_key | 否 | 关 | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| fable | api_key | 否 | 开 | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |
| fable | api_key | 是 | 关 | claude-code-20250219, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24 |
| fable | api_key | 是 | 开 | claude-code-20250219, interleaved-thinking-2025-05-14, redact-thinking-2026-02-12, context-management-2025-06-27, prompt-caching-scope-2026-01-05, thinking-token-count-2026-05-13, effort-2025-11-24, thinking-binding-controls-2026-08-01 |

没有 tools 也可带 interleaved、context-management 等能力 beta；关闭 thinking 不自动删除 thinking-token-count。Haiku 基础列表省 claude-code，但 agentic source 会在基础项之后补上，所以顺序与其它族不同。`BETA-BASE-RULES` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:B1` · m=533897 · b=281954037 · call-chain<br>`BETA-AGENTIC` — S1 · `/$bunfs/root/chunk-e44qnbvj.js:z7n` · m=535914 · b=281956054 · call-chain

count_tokens 使用 ree(model)，仅保留 vSn 中 claude-code / interleaved / context-management / oauth，保留原相对顺序，然后由 SDK 追加 token-counting-2024-11-01；它不等同 messages 的完整 beta 集合。

| 模型族 | 鉴权 | count_tokens 有序全集 |
| --- | --- | --- |
| opus | oauth | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| opus | api_key | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| sonnet | oauth | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| sonnet | api_key | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| haiku | oauth | oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| haiku | api_key | interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| fable | oauth | claude-code-20250219, oauth-2025-04-20, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |
| fable | api_key | claude-code-20250219, interleaved-thinking-2025-05-14, context-management-2025-06-27, token-counting-2024-11-01 |

`BETA-COUNTTOKENS-FILTER` — S1 · `/$bunfs/root/chunk-29cd2nzs.js:vSn` · m=157667 · b=280415365 · call-chain<br>`BETA-COUNT-CALLER` — S1 · `/$bunfs/root/chunk-wqb2b4v0.js:E$t` · m=1192600 · b=289895222 · call-chain<br>`BETA-COUNT-SDK` — S1 · `/$bunfs/root/chunk-0s5xarq7.js:BetaMessages.countTokens` · m=120908 · b=283637938 · call-chain

## Subway 九项对照

每格 JSON 提供 subway_extra / subway_missing，均相对于上面的明确 fixture，不能推广到所有真实会话。以交互 OAuth Sonnet、thinking 开为例：

| 差异 | 完整 token 列表 |
| --- | --- |
| Subway 多带（本格） | mid-conversation-output-config-2026-07-01, extended-cache-ttl-2025-04-11 |
| Subway 缺（本格） | redact-thinking-2026-02-12, thinking-token-count-2026-05-13 |
| 顺序不同 | context-management 在 prompt-caching-scope/effort 之前；不能把集合相等当头字符串相同 |

API key 的本 fixture 不带 oauth beta；实际判定是 Dt() || nye()&&!F4r()&&Kl()，必须跟随认证解析结果，不能仅由面板的账号标签决定。远程 flag 和 server 回拒可使同一场景后续重试改变 token，运行时完整矩阵需随样本快照记录这些输入。

未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。
