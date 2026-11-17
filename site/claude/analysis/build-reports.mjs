// Assemble reports only from local provenance, extracted evidence and offline results.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {dir} from './source-lib.mjs';
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const write=(name,value)=>fs.writeFileSync(path.join(dir,name),
  typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const ev=read('evidence-index.json').entries,versions=read('version-map.json');
const samples=read('sample-provenance.json'),extraction=read('extraction-index.json');
const registry=read('beta-registry.json').entries,matrix=read('beta-conditional-matrix.json');
const offline=read('offline-results-bun-1.4.4.json');
const scan=read('native-scan-summary.json');
function E(id){
  const e=ev[id];assert(e,id);
  return `\`${id}\` — ${e.sample} · \`${e.module}:${e.function}\` · m=${e.module_offset} · ${e.binary_offset===null?`file-byte=${e.byte_offset}`:`b=${e.binary_offset}`} · ${e.evidence_level}`;
}
const ids=(...items)=>items.map(E).join('<br>');
const cell=v=>String(v??'').replaceAll('|','\\|').replaceAll('\n','<br>');
const table=(headers,rows)=>'\n| '+headers.join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'
  +rows.map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n')+'\n';
const pre=`记录：2026-11-17；主样本 S1 = 官方 darwin-arm64 2.1.325。证据索引：[evidence-index.json](evidence-index.json)。\n\n`
  +`m 是模块内零起始 JS 码元偏移，b 是原始可执行文件绝对字节偏移；编码及跨度 SHA-256 见索引。包内普通源码使用 file-byte。证据级别沿用 literal / call-chain / offline-reproduction / runtime-capture / inference。\n\n`;
const limitations=`未启动任何官方 Claude 二进制，未调用 Anthropic 接口。离线结果来自独立下载并校验的 Bun 工具，只执行抽取的函数切片及合成依赖；本地 HTTP 回显仅访问 127.0.0.1。独立 Bun 的 revision 与官方内嵌构建不同，不能把其线序、process.version 或 TLS 当作官方完整客户端的实测。\n`;

const changes=[];
const darwin=versions.filter(v=>v.platform==='darwin-arm64');
for(let i=1;i<darwin.length;i++){
  const a=darwin[i-1],b=darwin[i];
  for(const field of ['sdk_version','bun_version','runtime_version_reported']){
    if(a[field]===b[field])continue;
    const adjacent=Number(b.cli_version.split('.').at(-1))-Number(a.cli_version.split('.').at(-1))===1;
    assert(adjacent,`Unresolved transition: ${field} ${a.cli_version} -> ${b.cli_version}`);
    changes.push({field,before:{cli_version:a.cli_version,value:a[field],sample:a.sample,evidence:a.evidence},
      after:{cli_version:b.cli_version,value:b[field],sample:b.sample,evidence:b.evidence},
      exact_adjacent_boundary:true,scope:'darwin-arm64 official artifacts only',
      caveat:field==='runtime_version_reported'?'native compatibility constant; not official runtime observation':undefined});
  }
}
write('version-transitions.json',changes);
const officialPairs=[['MacOS','arm64'],['MacOS','x64'],['Windows','x64'],['Windows','arm64'],
  ['Linux','x64'],['Linux','arm64']];
write('fingerprint-rules.json',{
  schema_version:2,scope:'Published native Claude Code builds with default identification headers; custom header overrides and arbitrary embedded SDK applications are outside this domain',
  evidence_status:'static artifact validation; official runtime values marked inferred in version-map.json',
  sample_index:'sample-provenance.json',version_map:'version-map.json',transitions:'version-transitions.json',
  platform:{published_pairs:officialPairs,libc_variants:['glibc','musl'],
    note:'Linux libc variants do not change X-Stainless-OS/Arch. Only S1/S2/S3 same-version native bytes were inspected; other pairs from S5 optionalDependencies.',
    sdk_os_rules:offline.platformDomains.os,sdk_arch_rules:offline.platformDomains.arch,
    evidence:['ST-OS','ST-ARCH','INSTALL-S5-getPlatformKey','NPM-MANIFEST-S5']},
  constraints:[
    {id:'build-tuple',rule:'Keep cli_version, sdk_version, bun_version, bun_revision, runtime_version_reported and binary_sha256 from one version-map row. Unsampled versions => unknown, never interpolate as verified.',evidence:['ST-PROPS']},
    {id:'runtime',rule:'Bun matches SDK process tag; runtime header=node, runtime_version=process.version. No explicit Bun branch. Bun semver alone does not determine process.version.',evidence:['ST-DETECT','ST-PROPS']},
    {id:'platform',rule:'For published native clients choose one published OS/Arch pair. SDK enums for iOS/Android/BSD/Other do not establish a published Claude platform.',evidence:['ST-OS','ST-ARCH','NPM-MANIFEST-S5']},
    {id:'entrypoint',rule:'Normal request UA entrypoint and cc_entrypoint both consume request override, then launch environment; workload comes from same async context. UA ownEntrypoint mode and pre-bootstrap defaults are explicit exceptions.',evidence:['UA','BILLING','ENTRY-OVERRIDE','ENTRY-SDK-REQUEST-OVERRIDE']},
    {id:'identity',rule:'device_id persists, account_uuid belongs to active account, session_id belongs to session; x-client-request-id is per request. These scopes are different.',evidence:['DEVICE-ID','METADATA','SESSION-ID','REQUEST-WRAPPER']},
    {id:'beta',rule:'Evaluate ordered base/capability/request stages with auth, model facts, policy, feature flags, source and conversation latches; six scenario axes alone are insufficient.',evidence:['BETA-BASE-RULES','BETA-AGENTIC','BETA-WIRE-ASSEMBLY']},
    {id:'metadata-format',rule:'Adjacent historical samples 2.1.77 legacy; 2.1.78 JSON. Native 258/280/325 remain JSON. Do not select legacy merely because auth is API key.',evidence:['METADATA-HISTORY-2.1.77','METADATA-HISTORY-2.1.78','METADATA']},
  ],
  linux_arm64_325:{cli_version:'2.1.325',sdk_version:'0.128.0',bun_version:'1.4.4',
    bun_revision:'6634fc3b5',runtime:'node',runtime_version_reported:'v26.12.1',
    os:'Linux',arch:'arm64',lang:'js',sample:'S3',
    status:'published and statically coherent; runtime header value inferred, no Linux execution',
    evidence:['VERSION-S3','ST-CROSS-S3']},
});

write('report_overview.md',`# Claude Code 静态分析 · v2\n\n${pre}`
  +`已导入 ${samples.length} 个有 integrity / SHA-256 记录的官方样本，其中 ${versions.length} 个原生平台样本抽出模块图。S1/S2/S3 覆盖 macOS arm64、Windows x64、Linux arm64；258–326 的 macOS 版本按间隔取样，并补齐五个相邻升级边界。\n\n`
  +`最高优先级结论：Linux/arm64 是官方发布形态。2.1.325 的 SDK 常量为 0.128.0，内嵌 Bun 1.4.4 (6634fc3b5)，原生 Node 兼容常量为 v26.12.1，SDK 在 Bun 下走 node 分支。Subway 的 0.94.0 / v24.3.0 不符合这些精确样本；“团队没采到 Linux”本身不能证明平台不合法。\n\n`
  +`Bun 版本必须带 revision。独立 npm Bun 1.4.4 工具自报 v26.3.0，与 Claude 同为 1.4.4 的内嵌构建不同。version-map 的 runtime_version_reported 是“兼容常量 + SDK 调用链”的推断，用户团队采集只作 USER-SUPPLIED 交叉线索。\n\n`
  +table(['交付','内容','验收边界'],[
    ['[claude-real-fingerprint.md](claude-real-fingerprint.md)','版本、完整头构造、顺序、UA、系统前导','静态 + SDK 切片 / 独立 Bun loopback'],
    ['[fingerprint-domain-rules.md](fingerprint-domain-rules.md)',`OS/Arch 枚举、合法联动、${versions.length} 条版本记录、5 个精确边界`,'version-map / fingerprint-rules JSON'],
    ['[beta-matrix.md](beta-matrix.md)','48 条 CLI 注册项、128 格条件场景、8 格 count_tokens、有序变更规则','动态 flag/模型事实/会话状态必须另行输入'],
    ['[billing-fields.md](billing-fields.md)','完整字段、UTF-16 算法、3 例、metadata、77→78 切换','cch 最终线上值未采样'],
    ['[oauth-auth.md](oauth-auth.md)','OAuth、setup-token、scope、刷新','有效期是请求与服务端回包逻辑，未换取真实 token'],
    ['[tls-features.md](tls-features.md)','Bun fetch / BoringSSL 静态线索、代理、TLS 配置','官方 JA3/JA4、h2 和实际 Go 线序未测'],
    ['[subway-diff.md](subway-diff.md)','用户提供 f314f5d7 基准逐项处置','未声称访问生产库或 Subway 源码'],
  ])+'\n'+limitations
  +`\n证据定位示例：${E('ST-PROPS')}。SDK 独立包目录假设已删除；undici 字符串仍存在于代理兼容分支，不能把“无 npm dependencies”扩大成“任何代码中都没有 undici”。\n\n`
  +`本次 registry 元数据中，主包 2.1.326 的八个 optionalDependencies 已全部指向 2.1.326；对应 darwin-arm64 包成功下载校验。用户早先“326 主包仍指向 325”的观察不能代表本次取样时点。${E('NPM-MANIFEST-S7')}。\n\n`
  +`取样与复算入口见 [README](../README.md)。所有正文事实的来源以证据索引和样本哈希为准。可选完整客户端 TLS 抓取未开展；实际部署 flag 状态和生产服务端拒绝分支无法由静态包唯一确定。\n`);

write('fingerprint-domain-rules.md',`# 字段取值域与合法组合规则\n\n${pre}`
  +`规则供官方客户端默认探测路径的自洽校验使用。SDK 的可编码取值域、官方发布的平台集合、实际采集到的样本集合是三种不同证据。ANTHROPIC_CUSTOM_HEADERS / options.headers 可覆盖核心识别头，因此任意配置下的可发送值不是有限枚举；显式覆盖需另记 identification_headers_overridden=true，校验器返回 unknown。下面“合法组合”指无此覆盖的官方构建，不据此断言所有可配置官方客户端都绝不可能发出其它值。校验器见 [validate-profile.mjs](validate-profile.mjs)，规则数据见 [fingerprint-rules.json](fingerprint-rules.json)。\n\n`
  +`Runtime 判定顺序为 Deno.build → EdgeRuntime → process 的 [object process] → unknown；属性构造中还会尝试浏览器 UA。不存在独立 Bun 判定，Bun 暴露 process 因此报 node。Runtime-Version 在该分支直接读取 process.version，既不读宿主外部 Node 安装，也不把 Bun.version 写进去。${ids('ST-DETECT','ST-PROPS','ST-MEMO')}\n\n`
  +table(['输入域','输出域 / 顺序','来源（文件:函数）与证据级别'],[
    ['OS（先转小写）','包含 ios→iOS；包含 android→Android；darwin→MacOS；win32→Windows；freebsd→FreeBSD；openbsd→OpenBSD；linux→Linux；其它非空→Other:<lowercase>；空→Unknown',E('ST-OS')],
    ['Arch','x32→x32；x86_64/x64→x64；arm→arm；aarch64/arm64→arm64；其它非空→other:<input>；空→unknown。ia32 实际成为 other:ia32。',E('ST-ARCH')],
    ['Deno','Runtime=deno；OS/Arch 取 Deno.build；version 为 Deno.version 字符串或 .deno，缺省 unknown',E('ST-PROPS')],
    ['Edge','OS=Unknown；Arch=other:<EdgeRuntime>；Runtime=edge；Version=process?.version ?? unknown',E('ST-PROPS')],
    ['Node / Bun process','OS/Arch 来自 process.platform/arch；Runtime=node；Version=process.version ?? unknown；属性经 CGr 缓存',ids('ST-PROPS','ST-MEMO')],
    ['无已知运行时 / 浏览器','浏览器 UA 可得 browser:<名称> 与解析版本；否则 OS=Unknown, Arch=unknown, Runtime=unknown, Runtime-Version=unknown',E('ST-PROPS')],
    ['官方平台包','MacOS arm64/x64、Windows arm64/x64、Linux arm64/x64（glibc/musl）。源码另有 Android 键，但此主包未发布对应 optionalDependency。',ids('NPM-MANIFEST-S5','INSTALL-S5-getPlatformKey')],
    ['Rosetta','安装脚本在 darwin+x64 且 sysctl.proc_translated=1 时选择 arm64；运行时上报二进制自身 process.arch，不能从安装用 Node 推断。',E('INSTALL-S5-getPlatformKey')],
  ])+`\n例如 OS 输入 unknown 会成为 Other:unknown；Node 缺失 platform 先回退字符串 unknown，因此与空输入的 Unknown 不同。具体离线枚举在 offline-results-bun-*.json 中。\n\n`
  +`## 版本映射与精确升级点\n\n完整机器表：[version-map.json](version-map.json)。只收录校验过的精确样本，不把间隔内每版标为已验证；不同平台同一 CLI 仍分别留行。下面 runtime 列均为原生常量推断。每行的 VERSION 证据包含 Bun/node 字符串的二进制偏移。\n`
  +table(['CLI','平台 / 样本','SDK','Bun / revision','Node 兼容常量','证据'],versions.map(v=>[
    v.cli_version,`${v.platform} / ${v.sample}`,v.sdk_version,`${v.bun_version} / ${v.bun_revision}`,
    v.runtime_version_reported,`\`${v.evidence}\``,
  ]))
  +table(['相邻边界','字段','旧→新','范围'],changes.map(c=>[
    `${c.before.cli_version} → ${c.after.cli_version}`,c.field,`${c.before.value} → ${c.after.value}`,
    'darwin-arm64；两个相邻版本原始字节',
  ]))
  +`\nSDK/Bun 升级点不等于每次构建 revision 改变点。所有已取样 revision 都保留；未宣称检查了区间内每一个构建。\n\n`
  +`Linux/arm64 + 2.1.325 合法：S3 是官方发布的 ELF arm64，可构造的完整静态组合为 CLI=2.1.325 / SDK=0.128.0 / Bun=1.4.4 (6634fc3b5) / Runtime=node / Runtime-Version=v26.12.1 / OS=Linux / Arch=arm64 / Lang=js。Runtime-Version 尚未经 Linux 实际执行验证。${ids('VERSION-S3','ST-CROSS-S3')}\n\n`
  +`版本、SDK、Bun revision、process.version 和二进制哈希作为一个构建元组保存；OS/Arch 按平台配对。UA、billing entrypoint 与 workload 按请求上下文生成；metadata 的设备、账号、会话作用域分别保存。beta 必须按模型事实、认证、flag 和会话拒绝状态重新求值，不能按九个常量模板判合法。\n\n`
  +`## 跨版本已复核的变化\n\n`
  +table(['类型','258 / 280 / 325 对比','来源'],[
    ['算法保持','SDK runtime/OS/Arch 分支语义一致；包版本常量变化。',versions.filter(v=>['S4b','S4a','S1'].includes(v.sample)).map(v=>`\`ST-CROSS-${v.sample}\``).join('、')],
    ['算法保持','billing salt、UTF-16 [4,7,20]、SHA-256、取前三 hex 相同。',ids('CROSS-BILLING-S4b','CROSS-BILLING-S4a','BILLING-INDEX')],
    ['字段增加','258 的 billing 到 cc_prompt_id；280 增 cc_turn_origin；325 又包含 prompt/turn index、gateway、project、上一压缩消息及 dispatch 等字段。不是只换版本常量。',ids('CROSS-BILLING-FIELDS-S4b','CROSS-BILLING-FIELDS-S4a','BILLING')],
    ['历史格式算法变化','2.1.77 使用 user_<device>_account_<account>_session_<session>；2.1.78 开始 JSON；258/280/325 均已是 JSON。',ids('METADATA-HISTORY-2.1.77','METADATA-HISTORY-2.1.78','CROSS-METADATA-S4b','CROSS-METADATA-S4a')],
    ['常量变化','SDK 0.112.1→0.127.0→0.128.0；Bun 1.4.1→1.4.3→1.4.4；Node 兼容常量 v26.3.0→v26.12.1。', 'version-transitions.json 的五个精确相邻边界'],
  ])+'\n'+limitations);

const headers=[
  ['Accept','application/json，流式也如此；不能凭 SSE 改为 text/event-stream','SDK-HEADERS'],
  ['User-Agent','CLI FW 覆盖 SDK Anthropic/JS 默认 UA','UA'],
  ['X-Stainless-Lang','js','ST-PROPS'],
  ['X-Stainless-Package-Version','内嵌 SDK b0，本版 0.128.0','ST-PROPS'],
  ['X-Stainless-OS / Arch','process 归一化，取值域见规则表','ST-PROPS'],
  ['X-Stainless-Runtime / Runtime-Version','node / process.version；Bun 兼容层','ST-PROPS'],
  ['X-Stainless-Retry-Count','每次 SDK 请求尝试计数，String(retryCount)，不是所有重试都恒 0','SDK-HEADERS'],
  ['X-Stainless-Timeout','timeout 毫秒截断 /1000；常用 600000→600；配置可变，truthy 才带','SDK-HEADERS'],
  ['anthropic-dangerous-direct-browser-access','CLI client 允许 browser，因此 SDK 加 true','SDK-HEADERS'],
  ['anthropic-version','2023-06-01','SDK-HEADERS'],
  ['Content-Type','JSON 序列化 body 通常 application/json；由 bodyHeaders 层决定','SDK-HEADERS'],
  ['Authorization / X-Api-Key','Bearer OAuth 与 API key auth 分支；合成离线请求分别验证，不使用真实 token','SDK-HEADERS'],
  ['anthropic-user-profile-id / anthropic-workspace-id','SDK create/countTokens 的 user_profile_id/workspace_id 非空时从 body 移到头；不表示普通 CLI 必带','SDK-BETA-ENDPOINTS'],
  ['x-app','通常 cli；背景形态 Xt() 可为 cli-bg','CLI-HEADERS'],
  ['X-Claude-Code-Session-Id','G() 的会话 ID，与 metadata.session_id 同源','CLI-HEADERS'],
  ['anthropic-beta','来自有序 beta 对象数组 header 序列化，SDK 端点可追加固定 beta','BETA-SERIALIZE'],
  ['x-stainless-helper-method','SDK stream() helper 带 stream；直接 create({stream:true}) 不据此保证 helper 头','SDK-STREAM-HELPER'],
  ['x-stainless-helper','通用 helper 名合并去重的特殊头，是否出现取决于调用 helper','SDK-HELPER-MERGE'],
  ['x-client-request-id','first-party wrapper 条件成立且已有头不存在时生成请求 UUID；不覆盖已有值','REQUEST-WRAPPER'],
  ['x-claude-remote-container-id / x-claude-remote-session-id','对应远程环境变量存在时加','CLI-CLIENT-OPTIONS'],
  ['x-claude-remote-session-origin / x-claude-remote-chat-conversation-uuid','远程来源 / 会话上下文','CLI-CLIENT-OPTIONS'],
  ['x-client-app','CLAUDE_AGENT_SDK_CLIENT_APP；UA 也含 client-app/<值>','CLI-CLIENT-OPTIONS'],
  ['x-claude-code-agent-id / x-claude-code-parent-agent-id','agent context 的 ID，经过 PWo 处理','CLI-CLIENT-OPTIONS'],
  ['x-claude-code-request-class / x-claude-1p-request-class / x-claude-code-agent-type','分类器与受信请求上下文条件字段','CLI-CLIENT-OPTIONS'],
  ['x-claude-code-auxiliary-type / x-claude-code-prompt-id','辅助请求类型 / 有效 prompt UUID 的条件字段','CLI-CLIENT-OPTIONS'],
  ['anthropic-client-platform / anthropic-client-version','desktop_app 与宿主版本；uun 的 Q7r() 有值且无既有对应 custom header 时补齐','HTTP-CUSTOM-HEADERS'],
  ['x-cowork-enrollment','Tmi() 提供值时由 uun 附加','HTTP-CUSTOM-HEADERS'],
  ['x-claude-code-wiggly-dove','受功能门控制的请求上下文结构化头；tg 生成上下文、$d 过滤保留字段后加入；不是固定指纹常量','HTTP-REQUEST-CONTEXT'],
  ['x-is-refusal-fallback / x-cc-fallback-latched-by','Sv 在拒绝恢复 / fallback latch 条件成立时附加 true / latch 来源','REQUEST-WRAPPER'],
  ['anthropic-usage-limit','Sv: messages URL && Ss() && uEt() 时带 slow','REQUEST-WRAPPER'],
  ['x-cc-atis','Sv: provider/host 条件与 eQs() 有值时附加','REQUEST-WRAPPER'],
  ['x-claude-code-sandy-plover','Sv: messages 且工具头功能开启时记录工具使用信息，构造失败有降级','REQUEST-WRAPPER'],
  ['x-ssr-client-ip / x-ssr-client-ip-sig / ant-ipcountry','特定远程 sender-address 上下文；从受信数据源取值，失败则清理，不是根据本机 OS 算出','HTTP-SENDER-HEADERS'],
  ['Host / Connection / Accept-Encoding / Content-Length','传输层生成，压缩、协议、代理、body 会改变；不是 SDK 固定头','HTTP-FETCH'],
  ['任意 ANTHROPIC_CUSTOM_HEADERS 与 options.headers','用户/host 扩展使头名集合开放；本表覆盖主请求的固有构造层，不能穷举自定义头','CLI-CLIENT-OPTIONS'],
];
write('claude-real-fingerprint.md',`# 官方请求构造规格\n\n${pre}`
  +`## 版本与 UA\n\nCLI 版本取编译时 VERSION，S1 为 2.1.325；SDK 自己的版本常量独立。主包只有安装 Node 脚本，安装后原生二进制驻留，不能把安装时 Node 版本当运行时。${ids('UA','VERSION-S1','INSTALL-S5-getPlatformKey')}\n\n`
  +`\`claude-cli/<build-version> (external, <request-entrypoint>[, agent-sdk/<env>][, client-app/<env>][, workload/<context>])\`。括号 token 顺序固定如式，external 是字面量。${E('UA')}\n`
  +table(['token','条件 / 联动','来源（文件:函数）与证据级别'],[
    ['cli / sdk-cli','启动参数 e 同时用于 setInteractive(!e)；无 entrypoint 时 e? sdk-cli:cli；已有 cli 且 e 真也变 sdk-cli；sdk-cli 另有请求级 override 可变 cli。',ids('ENTRY-INTERACTIVE','ENTRY-NORMALIZE','ENTRY-SDK-REQUEST-OVERRIDE')],
    ['local-agent','CLAUDE_CODE_ENTRYPOINT=local-agent；旧 local_agent 会归一化',''+E('ENTRY-NORMALIZE')],
    ['claude-desktop-3p','host 设置的 entrypoint；允许单次读取 CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS 覆盖，但限制正则、保留名、remote* 和 local_projects。',E('ENTRY-OVERRIDE')],
    ['agent-sdk/<v>','CLAUDE_AGENT_SDK_VERSION 非空；不由 CLI 版本算出，不能硬性要求等于 CLI 的某个派生版本',''+E('UA')],
    ['client-app/<x>','CLAUDE_AGENT_SDK_CLIENT_APP 非空，同时可能进 x-client-app 头',''+E('UA')],
    ['workload/<x>','异步上下文 Ol() 的 workload，如 cron；与 billing.cc_workload 同源，不是独立随机后缀',''+E('BILLING')],
    ['其它 entrypoint','注册表 Eqo 包含 sdk-ts/sdk-py/mcp/desktop/remote 等；普通 env 路径可保留其它值，注册表不是所有路径统一强制白名单',''+E('ENTRY-ENUM')],
  ])
  +`\n通常 UA 与 cc_entrypoint 都用 O6() override，然后环境 entrypoint。UA 的 ownEntrypoint=true 可跳过 override；启动前缺省也不同（UA cli，billing unknown）。system 前导直接依赖交互状态、append prompt、provider；beta 还依赖 source / model / flags，不能从 UA 文本单独推断。可随绑定的真实上下文走，但必须连同 entrypoint、workload、system 与请求来源一起验证。${ids('UA','BILLING','SYSTEM-PREFIX','BETA-AGENTIC')}\n\n`
  +`## HTTP 头全集与合并\n`
  +table(['头','取值逻辑 / 取值域','来源（文件:函数）与证据级别'],headers.map(([name,logic,id])=>[name,logic,E(id)]))
  +`\nSDK 构造顺序为 Accept、User-Agent、Retry-Count、Timeout、平台属性、browser-access、anthropic-version，然后合并 auth → defaultHeaders → bodyHeaders → options.headers。后层覆盖前层，null 表示删除，x-stainless-helper 有独立的逗号去重逻辑。HTTP Headers 不是“JS 对象插入顺序原样上线”的承诺。${ids('SDK-HEADERS','SDK-MERGE','SDK-ENTRIES','SDK-HELPER-MERGE')}\n\n`
  +`独立 Bun ${offline.runtime.bun_version} (${offline.runtime.bun_revision}) 在 Windows x64、本地 HTTP/1.1 回显中，插入 Z-Last / X-App / A-First / User-Agent 后，Headers 迭代和线序均为 A-First / User-Agent / X-App / Z-Last，保留这些头的原始大小写。实际抽出 SDK 链路合并后另做一次回显：Accept/Authorization/Content-Type/User-Agent 保持该大小写，x-stainless-* 与 session 头成为小写；完整原文保存在 wireProbe.sdk_raw。不能推导官方内嵌 Bun 的 TLS/h2 或 Go 的最终线序；Go map 无显式排序也不能单独证明线上随机，HTTP 栈可能排序。证据级别 offline-reproduction，原始线序见 offline-results-bun-*.json。\n\n`
  +`请求体 JSON 在 Sv 的 gzip 条件 ie 成立时，还经过 vTe/g3r：追加换行及随机 0–256 个空格/制表符；这不改变 JSON 语义，会影响原始字节长度，不能只比较解析后的 body。它不是所有普通 JSON 请求的无条件处理。gzip 及代理分支在 wrapper/fetchOptions 中。${ids('REQUEST-WRAPPER','BODY-TRAILER','BODY-TRAILER-LIMIT','BODY-TRAILER-BUFFER')}\n\n`
  +`## system 固定前导\n\n`
  +table(['条件','精确文本','来源'],[
    ['Vertex 或普通交互 CLI',`You are Claude Code, Anthropic's official CLI for Claude.`,E('SYSTEM-PREFIX')],
    ['非交互且有 append system prompt',`You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.`,E('SYSTEM-PREFIX')],
    ['非交互且无 append system prompt',`You are a Claude agent, built on Anthropic's Claude Agent SDK.`,E('SYSTEM-PREFIX')],
    ['录制/回放路径','存在已记录的前导时使用记录值',''+E('SYSTEM-PREFIX')],
  ])
  +`\n上述分支没有“Oauth 才有固定前导”的统一判断。billing 先于前导；后续项目、工具、环境 prompt 随上下文构造。billing 不带 cache_control，其它 system 分块按全局/组织缓存边界决定。${ids('SYSTEM-ORDER','SYSTEM-CACHE','SYSTEM-WIRE-CACHE')}\n\n`+limitations);

const special=[
  ['fine-grained-tool-streaming','S1 的 3055 个已解码 JS 模块中该字符串计数为 0；不应列为本版固定必带。env 可注入任意 beta，静态缺失不构成绝对不可能。','native-scan-summary.json'],
  ['redact-thinking-2026-02-12','B1: firstPartyOnlyBetas && interleavedThinking && !ge() && !L7n()；ge 是“非交互”。后续 thinking display 选择可移除；不能等同 thinking 开关。',E('BETA-BASE-RULES')],
  ['fast-mode-2026-02-01','fast 模式实际可用、当前请求选择 fast、会话 latch 与拒绝状态允许后，在请求阶段追加；仅常量存在不表示全量带。','BETA-WIRE-ASSEMBLY；beta-mutations.json'],
  ['structured-outputs-2025-12-15','B1 路径依赖 F7n(model) + tengu_tool_pear；输出 schema 经 Gns 写入 output_config.format 时也会追加，拒绝/能力检查可阻止。',ids('BETA-STRUCTURED','BETA-OUTPUT-FORMAT')],
  ['inline-tools-2026-09-15','G1: UVr() && F_e(modelFacts) && A_n()；涉及 foamy_spring flag、mid-conv tool 能力与 inline env/flag。不是有 tools 就带。',ids('BETA-CAP-RULES','BETA-TOOL-GATE','BETA-TOOL-CHANGE','BETA-INLINE')],
  ['server-side-fallback-2026-06-01 / 2026-07-01','C0n 区分显式 fallbacks 与 default：模型匹配、功能开关、会话接受/拒绝 latch、silent 重试；按 [Uz,yk] 顺序检查追加。',E('BETA-SERVER-FALLBACK')],
  ['fallback-credit-2026-06-01','A0n 的 armed 状态设 latch，未被拒绝且非 silent 才追加；Bedrock 另写 anthropic_beta。',E('BETA-FALLBACK-CREDIT')],
  ['extended-cache-ttl-2025-04-11','只有当前请求确实使用 1h cache 等 TTL 条件满足时追加，不因 OAuth 自动全量带。','BETA-WIRE-ASSEMBLY；beta-mutations.json'],
  ['mid-conversation-output-config-2026-07-01','S1 解码 JS 中字符串计数 0；当前 registry 是 mid-conversation-tool-changes / per-turn-control 等不同 token，不能混写。','native-scan-summary.json；beta-registry.json'],
  ['thinking-binding-controls-2026-08-01','body thinking 启用且绑定模式/功能可用时设会话 latch，后续 thinking 关闭仍可能保留；mechanical disable、proxy 和 server 拒绝分支可移除。',ids('BETA-STICKY-BINDING','BETA-BINDING-GATE')],
];
const representative=matrix.rows.filter(r=>!r.stream&&!r.tools);
write('beta-matrix.md',`# anthropic-beta 有序条件矩阵 · 2.1.325\n\n${pre}`
  +`六个场景轴不足以唯一确定线上 token 列表。相同 stream/tools/thinking/model-family/auth，可因交互模式、模型能力与别名、组织策略、远程 flag、SDK/env betas、请求来源、缓存 TTL、fallback 与会话历史不同而不同。这里交付完整条件来源、实际代码的有序变更记录，以及固定输入下可复算的 128 格矩阵；不把未知动态输入假装成生产默认。\n\n`
  +`顺序：$1 遍历 B1 → env betas → ree 的模型/策略/拒绝过滤 → z7n 按来源补 claude-code，再按 G1 增补能力项与 SDK betas → Eos 按实际请求条件逐项追加/移除 → P4r provider 过滤 → v2 取非 null header → SDK endpoint 的 token。源码与每个 mutation 的偏移及分支方向见 [beta-mutations.json](beta-mutations.json)。这是调用链证据，mutation 里的 then/else/test 不可忽略。${ids('BETA-BASE','BETA-CACHED','BETA-AGENTIC','BETA-SERIALIZE','BETA-WIRE-ASSEMBLY')}\n\n`
  +`## CLI 注册项全集\n\n此处“全集”指 S1 CLI 的 M/Wc 注册区间，不是 SDK 所有端点的 beta 字符串全集。null 是内部能力标记，不发头。任意 env/SDK 扩展使网络 token 集合开放。\n`
  +table(['符号 / 内部名','header（原文）','来源/定位与证据级别'],registry.map(r=>[
    `${r.symbol} / ${r.name}`,r.header??'null（不发送）',E(r.evidence),
  ]))
  +`\n## 必核条件\n`
  +table(['token','真实条件 / 限制','来源/定位'],special)
  +`\n## 可复算场景矩阵\n\n机器文件：[beta-conditional-matrix.json](beta-conditional-matrix.json)。覆盖 2×2×2×4×2=64 个用户要求场景，再乘交互/非交互共 128 格，另有 8 个 count_tokens 格。beta-probe 在 Bun 下直接求值抽出的 B1/G1，主请求扩展按已定位分支构造明确的 fixture，未运行 Eos 完整生成器。\n\n`
  +`固定输入：firstParty、agentic source、新会话、无拒绝 latch、无 env/SDK 扩展；模型能力均显式设 interleaved/context/thinking-token/effort/binding=true，1m/per-turn/fast/fallback/search/cache1h 等为 false；thinking display=none；结构化输出 flag=false；prompt-cache-scope=true。模型名为 synthetic-<family>，fable 行不声称某个已发布型号拥有这些能力。stream/tools 在这个 fixture 下不改变 beta，因此下面每行同时代表其四种组合；完整 128 格在 JSON，各格保留完整列表和顺序。\n`
  +table(['模型族','鉴权','交互','thinking','完整 token 列表（按序）'],representative.map(r=>[
    r.family,r.auth,r.interactive?'是':'否',r.thinking?'开':'关',r.tokens.join(', '),
  ]))
  +`\n没有 tools 也可带 interleaved、context-management 等能力 beta；关闭 thinking 不自动删除 thinking-token-count。Haiku 基础列表省 claude-code，但 agentic source 会在基础项之后补上，所以顺序与其它族不同。${ids('BETA-BASE-RULES','BETA-AGENTIC')}\n\n`
  +`count_tokens 使用 ree(model)，仅保留 vSn 中 claude-code / interleaved / context-management / oauth，保留原相对顺序，然后由 SDK 追加 token-counting-2024-11-01；它不等同 messages 的完整 beta 集合。\n`
  +table(['模型族','鉴权','count_tokens 有序全集'],matrix.count_tokens.map(r=>[r.family,r.auth,r.tokens.join(', ')]))
  +`\n${ids('BETA-COUNTTOKENS-FILTER','BETA-COUNT-CALLER','BETA-COUNT-SDK')}\n\n`
  +`## Subway 九项对照\n\n每格 JSON 提供 subway_extra / subway_missing，均相对于上面的明确 fixture，不能推广到所有真实会话。以交互 OAuth Sonnet、thinking 开为例：\n`
  +(()=>{const r=matrix.rows.find(r=>r.family==='sonnet'&&r.auth==='oauth'&&r.interactive&&r.thinking);
    return table(['差异','完整 token 列表'],[
      ['Subway 多带（本格）',r.subway_extra.join(', ')],
      ['Subway 缺（本格）',r.subway_missing.join(', ')],
      ['顺序不同','context-management 在 prompt-caching-scope/effort 之前；不能把集合相等当头字符串相同'],
    ]);})()
  +`\nAPI key 的本 fixture 不带 oauth beta；实际判定是 Dt() || nye()&&!F4r()&&Kl()，必须跟随认证解析结果，不能仅由面板的账号标签决定。远程 flag 和 server 回拒可使同一场景后续重试改变 token，运行时完整矩阵需随样本快照记录这些输入。\n\n`+limitations);

const billingFields=[
  ['cc_version','<build VERSION>.<3hex fingerprint>；必需','BILLING'],
  ['cc_entrypoint','request override ?? CLAUDE_CODE_ENTRYPOINT ?? unknown；不是只允许 cli','BILLING'],
  ['cch','firstParty && Ni() 或 vertex 时构造为字面值 00000；本轮未证实最终 wire 值','BILLING'],
  ['cc_workload','Ol() 上下文 workload 非空','BILLING'],
  ['cc_is_subagent','tC(context) && !context.isMainSession → true','BILLING'],
  ['cc_prev_req','firstParty && Ni()；req_ + 1–36 个 [A-Za-z0-9_-]','BILLING'],
  ['cc_prompt_id','firstParty && Ni()；UUID 8-4-4-4-12 十六进制','BILLING'],
  ['cc_turn_origin','firstParty && Ni()；[a-z][a-z_]{0,31}','BILLING'],
  ['cc_prompt_index / cc_turn_index','成对有效才发；整数，prompt>=0、turn>=1，均 <=1e7；firstParty && Ni()','BILLING'],
  ['cc_gateway','gateway/provider auth 分支，排除可信 Anthropic host 等条件；取 1 或 env','BILLING'],
  ['cc_project / cc_project_src','taggedId 正则 ^(?:claude_proj|chan)_(?:staging_|local_)?01[1-9A-HJ-NP-Za-km-z]{22}$；source 为 harness/user/project/local/flag/managed/admin_default，且 SI()','BILLING'],
  ['cc_prev_msg','responseBeforeCompaction.messageId；msg_ + 1–64 个 [A-Za-z0-9_]；firstParty && Ni()','BILLING'],
  ['cc_prev_prompt_index / cc_prev_turn_index','上一压缩消息的索引对，校验同当前索引','BILLING'],
  ['cc_dispatch_entrypoint','gSn() 有值且 firstParty && Ni()','BILLING'],
];
write('billing-fields.md',`# 计费块与 metadata 算法\n\n${pre}`
  +`## fingerprint 与字符串格式\n\n先取 messages 中第一条 type=user 且 !isMeta 的消息；content 为字符串直接取，数组取第一块 type=text 的 text，否则空串。不继续寻找第二条 user 的正文。${E('BILLING-INPUT')}\n\n`
  +`按 JavaScript UTF-16 零起始下标 [4,7,20] 各取一个码元，空值以字符 "0" 代替，拼为 sample3。计算 sha256(UTF8("59cf53e54c78" + sample3 + CLI_VERSION)).hex.slice(0,3)。既不采三个完整 Unicode 字符，也不采 1 起始的第 4/7/20 位。孤立代理码元在 UTF-8 编码时成为替代字符，跨 Go/JS 实现应按 JS 码元语义对拍。${ids('BILLING-SALT','BILLING-INDEX')}\n\n`
  +`下表在独立 Bun ${offline.runtime.bun_version} 下执行 S1 原函数 T$s，并执行完整 sJs 构造器；依赖由显式 firstParty fixture 提供。另执行了 Cqe、XNr、SDK auth / BetaMessages.create / countTokens / buildHeaders，截获四种 auth×stream 请求，并把 SDK 结果发送到本地 HTTP 回显。没有执行 CLI bootstrap 或完整 Eos 生成器。3hex 只有 4096 种，不能当设备 ID 或签名。\n`
  +table(['合成输入','选中码元（JSON 转义）','CLI','fp','构造出的完整最小字符串'],offline.billingExamples.map(r=>[
    JSON.stringify(r.input),JSON.stringify(r.code_units),r.cli_version,r.fingerprint,r.minimal_header,
  ]))
  +`\n格式以 \`x-anthropic-billing-header: cc_version=...; cc_entrypoint=...;\` 开始，后续字段按表中顺序附加，每项前空格、末尾分号；它在 system 文本中，不能误当同名 HTTP 请求头。ATTRIBUTION_HEADER opt-out 可令整个块为空；特定强制选项可忽略 opt-out。\n`
  +table(['键（按构造顺序）','生成与合法条件','来源（文件:函数）与证据级别'],billingFields.map(([a,b,id])=>[a,b,E(id)]))
  +`\n“字段全集”限定该 sJs 构造阶段。S1 解码 JS 对 cch= 的命中只有这一处；未找到其它 JS 替换算法，不能据此排除 native hook 或其它未执行阶段改写。现有证据支持 cch=00000 的构造，不支持把任意 checksum 算法称为官方最终算法。\n\n`
  +`system 数组先放 billing，再放固定前导，再放动态 system 文本；C$s 把 billing 的 cacheScope 设为 null，xos 只为非 null cache scope 的块构造 cache_control，因此 billing 块没有 cache_control。录制、side-query、缓存边界均有分支。${ids('SYSTEM-ORDER','SYSTEM-CACHE','SYSTEM-WIRE-CACHE')}\n\n`
  +`## metadata.user_id\n\n2.1.77 的普通包直接拼接 legacy 格式，2.1.78 普通包改为 JSON；这是两个相邻实际下载样本的代码变化点。258/280/325 的原生样本均沿用 JSON，没有“按 OAuth/API key 在新旧格式间切换”的代码。${ids('METADATA-HISTORY-2.1.77','METADATA-HISTORY-2.1.78','CROSS-METADATA-S4b','CROSS-METADATA-S4a','METADATA')}\n`
  +table(['字段','来源 / 生成 / 作用域','来源（文件:函数）与证据级别'],[
    ['device_id','hD 复用全局配置中合法小写 64hex userID；否则复用进程缓存/有效传入身份或 crypto.randomBytes(32).toString(hex)，通过 Me 写回配置。不是 MAC/硬件特征派生。',ids('DEVICE-ID','DEVICE-SAVE')],
    ['持久化位置','默认 ~/.claude.json，可由 CLAUDE_CONFIG_DIR 改根；存在合法 legacy 配置时可用 ~/.claude/.config.json；存储 backend 与 diskless 路径另有分支。未读取本机任何账号配置。',ids('DEVICE-CONFIG-PATH','DEVICE-CONFIG-LEGACY')],
    ['account_uuid','remote 模式可由 CLAUDE_CODE_ACCOUNT_UUID；否则 dT()?.accountUuid ?? hn()?.accountUuid ?? ""，来自活动授权账号资料。',E('METADATA')],
    ['session_id','G() 返回委派/上下文 session ID 或当前进程会话 ID；不是每次 HTTP 新 UUID。恢复/子会话上下文可改变。',E('SESSION-ID')],
    ['parent_session_id / tk','parent session 存在时附加；特定 remote 上下文可附 tk。原实现用 undefined 使缺省键不序列化。',E('METADATA')],
    ['extra metadata','CLAUDE_CODE_EXTRA_METADATA 必须 JSON object；过滤为 string/number/bool，并排除 ti/os/sb/he/uf/ap/tk 等保留键；核心键在展开后写入，不可被 extra 覆盖。',ids('METADATA','METADATA-FILTER')],
    ['大小控制','user_id 是 JSON 字符串；JSON.stringify 结果的 JS .length（UTF-16 码元数）超 512 时先丢弃额外元数据，再丢可选辅助字段；不是 UTF-8 字节阈值，也不硬截断核心 ID。',ids('METADATA','JSON-STRINGIFY')],
  ])+`\n设备 ID 与账号 ID 不能互相替代，同一设备可切账号，同一账号可开多个会话；x-client-request-id 另外按请求生成。上述作用域用于解释官方行为，不把 profile 的字段逐个随机化。\n\n`+limitations);

write('oauth-auth.md',`# OAuth / API key / setup-token\n\n${pre}`
  +table(['项目','官方构造值 / 分支','来源（文件:函数）与证据级别'],[
    ['client_id','9d1c250a-e61b-44d9-88ed-5944d1962f5e；自定义 OAuth client 有覆盖分支',E('OAUTH-ENDPOINTS')],
    ['authorize（Claude subscription）','https://claude.com/cai/oauth/authorize',E('OAUTH-ENDPOINTS')],
    ['authorize（Console）','https://platform.claude.com/oauth/authorize',E('OAUTH-ENDPOINTS')],
    ['token','https://platform.claude.com/v1/oauth/token',E('OAUTH-ENDPOINTS')],
    ['redirect','manual: https://platform.claude.com/oauth/code/callback；本地 listener: http://localhost:<port>/callback',E('OAUTH-AUTHORIZE')],
    ['authorize 参数','response_type=code、client_id、redirect_uri、scope 空格连接、PKCE code_challenge_method=S256、state，另有账号/org/login hint',E('OAUTH-AUTHORIZE')],
    ['code exchange','grant_type=authorization_code、code、redirect_uri、client_id、code_verifier、state；可带 expires_in；JSON POST timeout=30s',E('OAUTH-EXCHANGE')],
    ['API key / OAuth 发请求','SDK auth 分别 X-Api-Key / Authorization: Bearer；CLI client factory 决定认证来源，beta 里的 oauth 条件另看 Dt/Kl 分支。',ids('SDK-HEADERS','CLI-CLIENT-OPTIONS','BETA-BASE-RULES')],
  ])
  +`\n生产默认注册配置下，完整授权 scope 顺序为：org:create_api_key、user:profile、user:inference、user:sessions:claude_code、user:mcp_servers、user:file_upload、user:plugins、user:privacy_consents:write，共 8 项。Q5t 的默认刷新 scope 是 profile/inference/sessions/mcp_servers/file_upload/plugins 共 6 项。客户端 override、inferenceOnly、alsoScope 可改变授权集合；不能继续把“浏览器 6 / API 5”写成这版通用规则。${ids('OAUTH-SCOPES','OAUTH-REFRESH-SCOPES','OAUTH-ENDPOINTS','OAUTH-AUTHORIZE')}\n\n`
  +`setup-token 进入 ConsoleOAuthFlow 的 setup-token 分支，inferenceOnly=true，因此 scope 仅 user:inference；请求 expires_in 默认 31536000 秒（365 天）。这是客户端申请值，真实 expiresAt 来自响应 expires_in；formatTokens 还接受 refresh_token_expires_in，不能承诺服务端永远签发整年。${ids('SETUP-TOKEN','SETUP-TOKEN-OPTIONS','OAUTH-FORMAT-TOKENS')}\n\n`
  +`setup 成功路径验证新 token，随后展示 accessToken/expiresAt；普通 login 的存储分支位于 else。未把 setup-token 的输出访问令牌等同于“本地已经有 refresh token”。本轮不走真实兑换。${E('SETUP-TOKEN-SUCCESS')}\n\n`
  +`已存储 OAuth 凭据有 refreshToken 时，O_e 用 grant_type=refresh_token、client_id、scope 发刷新请求；新 refresh token 缺失时回退旧值，expiresAt 由响应计算；$O 在到期前 300000ms 判过期。无 refreshToken 的配置走 no_refresh_token 分支；CLAUDE_CODE_OAUTH_TOKEN 等外部注入 token 的替换可依赖 host 或重新签发，不能宣称它一定可自动刷新，也不能宣称所有 setup 相关授权永不刷新。${ids('OAUTH-REFRESH','OAUTH-EXPIRY','OAUTH-NO-REFRESH','OAUTH-ENV-401')}\n\n`+limitations);

const nativeRows=Object.entries(scan.native_markers).map(([term,r])=>[
  term,r.count,r.locations.map(l=>l.binary_offset).join(', '),'S1 原生前缀 literal；存在字符串不等于采到 ClientHello',
]);
write('tls-features.md',`# 网络、头线序与 TLS 证据边界\n\n${pre}`
  +`主 API 调用链是 SDK → Sv → Hde/Zl → dqr → globalThis.fetch，fetchOptions 是 Bun 形态（proxy、unix、tls、timeout、keepalive）。主包 dependencies={} 并不等于没有 SDK 或没有兼容逻辑；嵌入 SDK 已抽出，网络模块还有 require("undici").setGlobalDispatcher / EnvHttpProxyAgent 的代理分支。单看 grep 到 undici 也不能认定主 API 是 Node undici。${ids('SDK-HEADERS','REQUEST-WRAPPER','HTTP-FETCH','HTTP-FETCH-OPTIONS','HTTP-UNDICI-PROXY','HTTP-UNDICI-AGENT')}\n\n`
  +table(['配置','代码实际行为','来源（文件:函数）与证据级别'],[
    ['body idle timeout / keepalive','API_FORCE_IDLE_TIMEOUT 与 body watchdog 条件决定 timeout:false；全局配置可 keepalive:false',E('HTTP-FETCH-OPTIONS')],
    ['Unix socket','forAnthropicAPI 且 ANTHROPIC_UNIX_SOCKET 非空 → unix 字段',E('HTTP-FETCH-OPTIONS')],
    ['proxy / no_proxy','显式代理、认证 Proxy-Authorization、fallbackProxy 及 noProxy 判断，可能改变外部可见网络形态',E('HTTP-FETCH-OPTIONS')],
    ['TLS CA / mTLS','xP 合并 sx() 与按 URL 选择的 CA；CLAUDE_CODE_CLIENT_CERT/KEY/KEY_PASSPHRASE 读入 cert/key/passphrase',ids('TLS-OPTIONS','TLS-MTLS')],
    ['cipher / curve','已定位主 fetchOptions 中未见显式 cipher/curve 列表。不能从“这层没传”推导底层没有默认选择或其它 override。',E('HTTP-FETCH-OPTIONS')],
  ])
  +`\n原生部分出现以下加密库线索（binary_offset 可复核），与 Bun 的 BoringSSL 实现一致。OpenSSL 字符串也存在于兼容接口/错误文本，不能仅靠该词断定另有 Node OpenSSL TLS 栈。\n`
  +table(['字符串','计数','前几个绝对偏移','证据界限'],nativeRows)
  +`\n尝试直接取对应 Bun 上游 revision 的源码失败，记录在 bun-source-provenance.json（ECONNRESET）。因此未把公开 Bun semver 的源码或独立工具行为冒充该 Claude 定制 revision 的完整实现证据。\n\n`
  +`独立 Bun 工具完成本地纯 HTTP/1.1 回显，保留原始线序于 offline-results-bun-*.json。它说明测试配置下的实际行为，不能回答官方客户端通常协商 h2 还是 h1，也不能推出 JA3/JA4。生产代理、TLS session、ALPN 和 HTTP/2 头编码均需实际同构建运行时证据。\n\n`
  +`Subway 的 JA3 44f88fca027f27bab4bb08d4af15f23e、17 ciphers、“Node.js 24.x”注释及只声明 http/1.1 来自用户给定源码基线。本轮结论为“待运行时确认”：该模板的来源注释不能继续当作已验证的 Bun 1.4.4 对等证据，但也没有采集结果证明必须换成某个新 hash。没有生成或推荐虚构 JA3/JA4。\n\n`
  +`可选后续步骤是在明确解除“不执行二进制”的边界后，仅连接自有 TLS 回显端点，记录精确 binary hash、OS、Bun revision、代理/ALPN、ClientHello 原始字节及计算方法，才可比较模板。当前不触发这一步。\n\n`+limitations);

const subwayRows=[
  ['UA / 版本','constants.go:90；version_sync_service；2.1.326 / 内置258','编译时版本；326 已有对应平台包。保持 external,cli 仅适用于该上下文，版本必须绑定构建元组。','改为 按精确构建元组同步版本及 UA', 'UA'],
  ['Package-Version','constants.go:126；写死0.94.0','S1/S2/S3/S6 为0.128.0；285–287 为0.127.0；258/280 为0.112.1。','改为 version-map.json 的 sdk_version','VERSION-S1'],
  ['OS / Arch','constants.go:127-128；Linux / arm64','官方 S3 存在 Linux/arm64；不能因团队无样本拒绝。固定值会损失平台多样性。','改为 与同一官方平台构建配对的 OS/Arch','ST-CROSS-S3'],
  ['Runtime / Version','constants.go:129-130；node / v24.3.0','node 分支成立；325/326 原生兼容常量 v26.12.1，需附静态推断等级。','改为 node + 精确构建的 process.version 来源映射','ST-PROPS'],
  ['Lang','constants.go:125；js','SDK 原文 js。','保持','ST-PROPS'],
  ['Retry / Timeout','constants.go:131-132；0 /600','首次通常0，重试计数变化；timeout来自请求配置，常用600秒。','改为 实际请求尝试计数与超时秒值','SDK-HEADERS'],
  ['X-App / browser access','constants.go:133-134；cli /true','正常CLI一致；背景模式可cli-bg。','改为 根据上下文选择 cli/cli-bg；browser access true','CLI-HEADERS'],
  ['Accept','gateway_upstream_request.go:956-985；application/json','流式仍 application/json。','保持','SDK-HEADERS'],
  ['stream helper','同上；流式加stream','真正的 SDK stream helper 加该头；不能仅按 body.stream 推断所有调用路径。','改为 根据调用 helper 路径携带 stream','SDK-STREAM-HELPER'],
  ['request UUID','同上；每请求新UUID','官方 wrapper 条件生成、已有值不覆盖；请求与session分离。','改为 遵守条件生成及已有头保留','REQUEST-WRAPPER'],
  ['会话头','基线表未列','Vd 固有 X-Claude-Code-Session-Id，G() 与 metadata.session_id 同源。','改为 按会话上下文携带 X-Claude-Code-Session-Id','CLI-HEADERS'],
  ['其它固有/条件头','gateway_upstream_request.go；基线未详列','anthropic-version、Content-Type、远程/agent/request-class/prompt 等头见规格表。','改为 按完整构造层与上下文校验','CLI-CLIENT-OPTIONS'],
  ['头大小写','resolveWireCasing，如x-app','独立Bun HTTP1保留插入大小写；SDK多层Headers合并会影响最终键。官方精确构建未抓取。','待运行时确认','SDK-MERGE'],
  ['头序','Go map 无显式排序','map 数据结构不足以证明 Go 最终线序。Bun 工具实测有排序，不能外推官方h2。','待运行时确认','SDK-HEADERS'],
  ['OAuth全量9betas','constants.go FullClaudeCodeMimicryBetas()','不是本版固定全集；mid-conversation-output-config 字面量缺失，extended cache/effort/binding均有条件。逐格diff见矩阵JSON。','改为 有序条件规则与会话状态求值','BETA-WIRE-ASSEMBLY'],
  ['NoTools / WithTools','constants.go:52-70；均前3项','有无tools不唯一决定beta；模型/交互/flags更关键。','改为 beta-conditional-matrix.json 及条件输入','BETA-BASE-RULES'],
  ['CountTokens / Haiku / APIKey','constants.go:52-70','count只保留vSn再由SDK追加计数token；Haiku非agentic可不带claude-code；OAuth依auth解析。','改为 官方过滤与追加顺序','BETA-COUNT-CALLER'],
  ['billing fp','gateway_billing_block.go:90-105；gateway_billing_header.go；采样4/7/20','必须零起始UTF-16码元，salt+3units+版本→SHA256前三hex；三例已对拍。','改为 billing-fields.md 的码元算法与三组样例','BILLING-INDEX'],
  ['billing字段/块位置','上述billing实现；仅version+entrypoint','官方有cch和多项条件字段；system最前、无cache_control；cch最终wire值尚未测。','改为 完整sJs构造字段与system缓存规则','BILLING'],
  ['metadata格式','metadata_userid.go:74；FormatMetadataUserID；gateway_claude_oauth_body.go:326','77→78已切JSON；258及后续取样均JSON；并有parent与额外元数据过滤。','改为 按2.1.78边界及当前JSON规则处理','METADATA-HISTORY-2.1.78'],
  ['账号级ClientID','identity_service.go:511；每账号crypto/rand32B','官方device_id随机32B hex，但通常按设备配置持久化，不按账号每次派生。','改为 区分设备、账号、会话作用域','DEVICE-ID'],
  ['profile覆盖顺序','ApplyFingerprint后applyClaudeCodeMimicHeaders覆盖全部','会破坏绑定profile的版本、SDK、OS、runtime整体关系；本轮只给分析差异，未修改Subway。','改为 保留同一构建元组与上下文的自洽关系','ST-PROPS'],
  ['TLS / JA3 / ALPN','tlsfingerprint/dialer.go:55-62,338-363；Node24模板，JA3 44f88fca…；仅h1；profiles表空','原生Bun/BoringSSL线索足够重审来源，但无官方ClientHello测量，不能给新hash。','待运行时确认','HTTP-FETCH-OPTIONS'],
  ['OAuth client_id','pkg/oauth/oauth.go:19-31；9d1c250a-e61b-44d9-88ed-5944d1962f5e','默认官方常量一致。','保持','OAUTH-ENDPOINTS'],
  ['OAuth endpoints / redirect','同上；claude.com/cai、platform token/manual callback','常量一致；另有Console authorize与本地localhost redirect分支。','改为 保留现值并覆盖Console与本地redirect分支','OAUTH-AUTHORIZE'],
  ['OAuth scopes','同上；浏览器6/API5/setup仅inference','官方默认完整授权8项，默认刷新6项；setup仅inference仍成立。','改为 区分完整授权8项、刷新6项、setup1项及override','OAUTH-SCOPES'],
  ['setup-token expiry / refresh','ExchangeSetupTokenCode 主路径','申请365天；实际响应决定expiresAt；外部token无refreshToken不可假设自动刷新。','改为 按请求expires_in与服务端响应及凭据能力处理','SETUP-TOKEN-OPTIONS'],
  ['日期隐写归一化','pkg/anthropicfp/dateline.go；撇号/日期分隔符','未观察官方同版本线级日期变体/签名用途；此处不能用静态文本相近证明归一化无影响。','待运行时确认','SYSTEM-ORDER'],
];
assert(subwayRows.every(r=>r[3]==='保持'||r[3]==='待运行时确认'||r[3].startsWith('改为 ')));
write('subway-diff.md',`# Subway 对照清单\n\n${pre}`
  +`Subway 列是用户提供的生产 SHA f314f5d7（2026-11-17 同步）源码定位和值，标记 USER-SUPPLIED。根路径为 orca/workspaces/alice-issue/alice/subway/backend/internal/。基准及团队聚合采集值见 [user-supplied-baseline.json](user-supplied-baseline.json)。本工作区未读取该仓库或生产 DB，也未运行/修改 Subway。处置只有“保持 / 改为 X / 待运行时确认”。\n\n`
  +`团队采集表同样是用户输入，不独立赋予 runtime-capture 等级；它支持 MacOS/Windows 的部分版本对照，但无 Linux 样本不等于官方 Linux 不合法。静态 S3 已证实官方发布 Linux arm64。Subway 当前 2.1.326+0.94.0+Linux/arm64+node v24.3.0 不符合本轮官方325/326构建元组，错误是版本联动，不能笼统归因于Linux平台不存在。\n`
  +table(['项目','Subway 当前值 / 来源（USER-SUPPLIED）','官方差异 / 理由','处置','官方来源（文件:函数）与证据级别'],subwayRows.map(r=>[...r.slice(0,4),E(r[4])]))
  +`\n以上“改为”是官方构造的对照规格，不表示已部署或已验证服务端接收。特别是 cch 最终值、TLS 与头线序仍保留运行时界限。\n`);

write('analysis-manifest.json',{
  workspace:'Claude Code native Bun static outbound request analysis',schema_version:2,status:'static-analysis-complete-with-runtime-boundaries',
  date:'2026-11-17',branch:'english-ui',starting_commit:'d1cf49c90a375108fb8cb9cbba1c9e16edad7791',
  target:{official_cli:'@anthropic-ai/claude-code native platform packages',main:'S1',sdk:'embedded JS module graph, no independent --sdk-root',
    transport:'globalThis.fetch/Bun options; undici proxy compatibility references retained',
    subway:{provenance:'USER-SUPPLIED',sha:'f314f5d7',local_source_reviewed:false}},
  sample_count:samples.length,native_sample_count:versions.length,extraction:'extraction-index.json',
  provenance:'sample-provenance.json',evidence:'evidence-index.json',version_map:'version-map.json',
  deliverables:['report_overview.md','claude-real-fingerprint.md','fingerprint-domain-rules.md',
    'beta-matrix.md','billing-fields.md','oauth-auth.md','tls-features.md','subway-diff.md',
    'fingerprint-rules.json','version-map.json','version-transitions.json','beta-registry.json','beta-conditional-matrix.json'],
  validation:{offline_runtimes:['1.4.1','1.4.3','1.4.4'],official_binary_executed:false,anthropic_requests:0,
    local_loopback_http:true,official_tls_capture:false},
  unresolved:['Official embedded Bun process.version value inferred from native constant, not executed',
    'Runtime flag/model/account/sticky-state inputs needed for a unique production beta list',
    'Official cch final wire value and any native rewrite not observed',
    'Official ClientHello/JA3/JA4/ALPN/h2 and Subway wire casing/order not captured',
    'Bun upstream source downloads failed with ECONNRESET'],
});
write('../README.md',`# Claude Code 静态分析 · v2\n\n`
  +`已从官方 Bun 原生包抽取嵌入模块图，分析入口：[报告总览](analysis/report_overview.md)。样本与工具 integrity、SHA-256、源码偏移、证据级别均随报告保存。用户 v2 的执行约定见 [requirements-v2.md](analysis/requirements-v2.md)。\n\n`
  +`本轮不执行官方 Claude 二进制，不请求 Anthropic 接口。独立 Bun 工具运行纯函数/SDK 切片与本地 HTTP 回显；运行时界限逐项写明。包本体没有独立 SDK node_modules 目录，扫描器已改为读取 Bun module graph；代理兼容逻辑中的 undici 引用仍保留在分析中。\n\n`
  +`交付：真实指纹规格、字段取值域与联动 JSON、128 格条件 beta 矩阵及 count_tokens、计费算法三例、metadata 格式切换、OAuth/setup-token、Subway 逐项差异。可选官方 TLS 抓取没有开展。\n\n`
  +`复算命令（需网络的下载步骤独立执行；不会运行 npm lifecycle）：\n\n`
  +'```powershell\n'
  +'node site/claude/analysis/acquire-samples.mjs --recorded\n'
  +'node site/claude/analysis/extract-bun.mjs\n'
  +'node site/claude/analysis/acquire-tools.mjs\n'
  +'node site/claude/analysis/make-evidence.mjs\n'
  +'node site/claude/analysis/scan-static.mjs --sample S1 --output site/claude/analysis/native-scan-summary.json\n'
  +'& site/claude/analysis/tools/oven_bun-windows-x64-1.4.4/package/bin/bun.exe site/claude/analysis/offline-probe.mjs\n'
  +'& site/claude/analysis/tools/oven_bun-windows-x64-1.4.4/package/bin/bun.exe site/claude/analysis/beta-probe.mjs\n'
  +'node site/claude/analysis/beta-paths.mjs\n'
  +'node site/claude/analysis/build-reports.mjs\n'
  +'node site/claude/analysis/verify-analysis.mjs\n'
  +'node site/claude/analysis/transaction/verify-transaction.mjs\n'
  +'```\n\n'
  +`acquire-samples 可带精确选择，如 darwin-arm64@2.1.288 / main@2.1.78；所有已分析取样见 sample-provenance.json。主包和平台包只下载/解包，不安装。extract-bun 校验原始二进制哈希，定位尾标、32 字节 offsets 表、52 字节模块记录并逐项校验边界，导出到忽略目录；偏移足以从原文件复算。\n\n`
  +`--recorded 按已提交 sample-provenance 下载所有附加版本并保留样本代号；无参数默认集合只是主样本。acquire-tools 默认下载本轮四个精确工具包，也可显式传 package@version。Bun 1.4.1/1.4.3 的离线输出已保留；复测时替换工具路径。报告验证兼容没有本地大文件的 checkout：只检查提交证据；有样本时 verify-analysis 另外重读原始字节验证跨度。\n\n`
  +`installer/*.tgz、analysis/unpacked、tools、raw、captures 均被忽略，禁止提交原生二进制、完整 bundle 或真实凭据。Git 中保留脚本、证据摘录和合成离线结果。\n\n`
  +`transaction/ 四角色沿用 v1 的可回滚工作区契约样例：pending → scaffolded → pending，验证对象与 Claude 网络行为分开；第二轮验证结果由补充记录扩展。\n`);
console.log(JSON.stringify({reports:9,version_rows:versions.length,exact_transitions:changes.length,
  samples:samples.length,subway_rows:subwayRows.length,complete:true}));
