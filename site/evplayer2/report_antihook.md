# EVPlayer2 防录屏 / 自保护机制清单（方向三）

目标：`F:\EVPlayer2\EVPlayer2.exe` v4.8.2，纯静态清单化，不绕过/不去除保护。

## 重要修正（对先前判断）
先前把 `.detourc`/`.detourd` 判为「微软 Detours 做 API Hook」，**修正如下**：
- `.detourc`（只读 10778B）是固定 16 字节表项的**内部跳转/调度表**：`{1字节索引 + 8字节目标指针}`，高频目标 `0x14000C5C2`、`0x14001176B`，均落在自身 `.text` 内。
- `.detourd`（可写 284B，零初始化带 `-1` 哨兵）是配套**运行时槽位表**。
- 结论：这是**自研的内部调用间接层（防篡改/调用混淆/延迟绑定）**，指向自身代码，**不是**对外部进程/系统 API 的 Hook，也非标准 Detours 布局。确信度：中。

## 机制清单
| # | 机制 | API / 工件 | 证据 | 确信度 |
|---|---|---|---|---|
| 1 | 反调试 | `IsDebuggerPresent`、`CheckRemoteDebuggerPresent` | IAT+字符串；主 exe 与三个自研 DLL 均导入 | 高 |
| 2 | 虚拟机/沙箱检测 | `CreateToolhelp32Snapshot`+`Process32First/NextW`+`OpenProcess`，比对 `vboxservice/vboxtray/vmacthlp/vmtoolsd/vmupgradehelper/vmwaretray/vmwareuser.exe` | IAT+字符串表 | 高 |
| 3 | 防截屏/防录屏（核心） | `SetWindowDisplayAffinity`（仅字符串，USER32 **未**静态导入）→ 经 `GetProcAddress` 动态解析，设 `WDA_EXCLUDEFROMCAPTURE/WDA_MONITOR` 使窗口在截图/录屏中变黑 | 字符串+主 exe 具备 `LoadLibrary*/GetProcAddress/GetModuleHandle*` 全套动态解析 | 中-高 |
| 4 | 自研调用间接/防篡改 | `.detourc` 只读跳转表 + `.detourd` 可写运行时槽 | PE 节解析 | 中 |
| 5 | 窗口枚举（查工具窗口） | `EnumWindows`+`GetClassNameW`+`GetWindowLongW` | USER32 IAT | 中 |
| 6 | 崩溃转储上报 | `MiniDumpWriteDump`(dbghelp)+子进程 `BugReport.exe`（字符串 `%1/BugReport.exe`） | IAT+字符串 | 高 |
| 7 | 进程/线程控制 | `TerminateProcess`、`SetThreadContext`、`SetThreadExecutionState` | KERNEL32 IAT | 中 |
| 8 | 时序反调试（可能） | `GetTickCount`、`QueryPerformanceCounter/Frequency` | KERNEL32 IAT | 低 |
| 9 | 工作站/会话检查 | `GetProcessWindowStation`、`GetUserObjectInformationW` | USER32 IAT | 低-中 |

> 全部模块**未**静态导入 `BitBlt`/`PrintWindow`/GDI32/Magnification —— 防截屏不靠拦 GDI，而靠 #3 的排除捕获 + #2 的环境检测。

## 自保护架构总结
三层、偏轻量、非商业壳（非 VMProtect/Themida）级别：
1. **启动期环境甄别** —— 调试器检测 + Toolhelp32 比对 VMware/VirtualBox 进程名判断虚拟机/沙箱。
2. **运行期防录屏** —— 动态解析 `SetWindowDisplayAffinity` 对播放窗口启用排除捕获（截图/多数录屏得黑屏），对抗录屏主手段。
3. **代码完整性/混淆** —— `.detourc`/`.detourd` 自研跳转表做调用间接；配合 CFG、ASLR、MiniDump+BugReport 崩溃上报闭环。

**画像**：未加壳（.text 熵 5.54，符号/字符串可读），保护点集中在「别在 VM 里跑、别调试、别录屏」，与 EV 系加密视频播放器定位一致；防截屏单点依赖 `SetWindowDisplayAffinity`，反调试仅 2 个基础 API —— 入门到中等强度。

**边界**：未逆向解密例程、未提取任何密钥、未写绕过/卸载代码。

*工具：`H:\orca\scratch` 下 `fulliat.go`/`secdump.go`/`rawstr.go`。*
