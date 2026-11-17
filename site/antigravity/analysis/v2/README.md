# Antigravity 第二轮交付

入口：[完整分析](antigravity-static-analysis-v2.md)、[机器 profile](antigravity-hub-profiles.json)、[样本来源](samples.json)、[证据 catalog](evidence-catalog.json)、[验证记录](verification-results.json)。Subway 对照采用用户提交的 f314f5d7 源码摘录，未独立读取生产仓库。

所有 native 偏移均为零起始文件字节偏移；ASAR 源码偏移相对于解出的源码文件。evidence-excerpts.log 是选定静态指令窗口，不是网络抓包。E1–E5 的定义见 catalog；本轮无 E1。

本地可重复运行的离线核验：

```powershell
node site/antigravity/analysis/v2/validate-deliverables.mjs
node site/antigravity/analysis/v2/probe-report.mjs site/antigravity/analysis/macos/antigravity-macos-fingerprint.md --mode fingerprint
```

校验器需要本地已取得的官方样本；安装包与解包目录保持 Git 忽略，不要求执行客户端。原生入口位于 samples.json 的 native.file。W1 用 7-Zip 静态解 NSIS，再解其中 app-64.7z；M1 解 ZIP 后静态解 app.asar。ASAR 解包可复用第一轮 macos/extract-asar.mjs；解包、校验工具本身不等于执行官方客户端。decode-schemas.mjs 只使用包内 protobuf 库解描述符。

分析脚本：

| 脚本 | 用途 |
|---|---|
| fetch-samples.mjs | 读取更新 channel，范围下载固定样本，验证分片与 SHA-512；需要联网。channel 已更新时拒绝把新 manifest 校验结果套给固定旧样本 |
| native-index.mjs | 静态解析 PE/Mach-O、Go pclntab、运行时类型和 Go string 全局变量 |
| disassemble-pe.go | PE 静态反汇编；构建时在忽略的工具目录旁放 Go toolchain 的 x86asm 源码；Mac 复用第一轮 disassemble-macho.go |
| decode-schemas.mjs | 读取相关 raw descriptor；credits 边界取自 init 中的明确长度，拒绝用后续拼接 rodata 猜结尾 |
| decode-request-maps.mjs | 解 map 初始化中的枚举键/字符串和指令偏移 |
| collect-constants.mjs | 记录产品 CL、secret 的 SHA-256；发布前清理批量反汇编中的 secret 明文 |
| collect-references.mjs | 保存官方下载页、RFC、Gemini CLI release、app-update.yml 来源与偏移 |
| build-deliverables.mjs | 从样本/索引/反汇编构建 catalog、profile、样本清单和精选指令 |
| write-summary-reports.mjs | 更新用户指定的两个现有对照报告 |
| run-verification.mjs | 执行报告 BASELINE/MODIFIED/ROLLBACK、unified patch 重建、离线校验，重开四个角色文件并登记哈希 |

批量索引、反汇编、官方下载页全文与 RFC 全文保持忽略；来源/哈希见 external-references.json。客户端 secret 不发布明文，只有常量 SHA-256；不能从“有三条 secret”推导可轮换的账号或授权。

四角色仍沿用 macOS 第一轮的位置。ROLLBACK.sh 与 BASELINE_FILE.md 放在同一目录；用 POSIX shell 执行：

```sh
sh ROLLBACK.sh /absolute/path/to/REPORT_COPY.md
patch --binary --batch /absolute/path/to/REPORT_COPY.md DIFF_FILE.patch
```

回滚基线现在是完整的第一轮报告（10709 字节），不是第一轮“新增文件”的空基线。验证器在 tools/v2-transaction/ 的独立副本上运行回滚，保留更新后的实际报告和 MODIFIED_FILE。Windows 验证使用 Git for Windows 的 sh/diff/patch，不依赖 WSL。

profile 的 null 和 typed slot 都有语义说明；它是带条件的静态规格，不能把占位符直接发送给服务端。最终认证 UA、传输层头序、实时账号选路与实验 prompt 仍需自有账号的运行时观测。
