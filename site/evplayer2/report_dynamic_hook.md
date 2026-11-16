# EVPlayer2 检测点动态 hook 验证

执行日期：2026-11-10（Asia/Shanghai）。本次沿用 `H:/orca/rea/site/evplayer2`，对象为本机 `F:/EVPlayer2/EVPlayer2.exe`，原会话 PID 56664。

主程序 SHA-256：`1986E4607B8B5801AFE060446F2EDC2F186FB0FEA19F0CBBF42550452EFB6B3A`。运行前后相同，安装目录中的程序文件未修改。

## 已确认的检测调用

以下偏移为 **API 调用返回地址的 RVA**，不是已恢复符号名的函数入口。绝对地址受 ASLR 影响；后续定位优先使用模块名与 RVA。

| 观测点 | 播放器内返回地址 | 本次实际结果 | 证据 |
|---|---|---|---|
| `IsDebuggerPresent` | `EVPlayer2.exe+0x18986a` | 最终 6 秒对照中应用自身调用 174 次；保留原始返回值，记录到的结果为 0 | `hooks/modified.jsonl`、`hooks/transaction_results.json` |
| `CreateToolhelp32Snapshot` | `EVPlayer2.exe+0x17ca88` | 首轮 6 秒会话调用 5 次，flags=2、targetPid=0 | `hooks/modified.v1.jsonl` |
| `Process32FirstW` | `EVPlayer2.exe+0x17cab6` | 首轮 5 次，实际读取 PROCESSENTRY32W 中的进程名 | `hooks/modified.v1.jsonl` |
| `Process32NextW` | `EVPlayer2.exe+0x17cc38` | 首轮总调用 2475 次；日志对普通进程条目采样，不能将次数解释为独立进程数 | `hooks/modified.v1.jsonl` summary |
| `GetWindowDisplayAffinity` | 观测器主动查询 | 主窗口 HWND=`0x6fd054c`，值为 1，即 WDA_MONITOR；不是 0x11 | 三组 `window_snapshot` |

`IsDebuggerPresent` 的首次应用调用栈为：`EVPlayer2.exe+0x18986a -> +0x186755 -> +0x186a19 -> KERNEL32.DLL+0x2dda7 -> ntdll.dll+0x7ee4c`（按捕获的栈顺序列出）。`+0x189864` 处是对导入槽的 call，返回后 `test eax,eax; setne al`，说明这里是将检测结果转换为布尔值的包装层。上层如何使用该值仍需继续追踪，不能仅凭这条调用栈断定最终处置分支。

首轮和最终观测的进程枚举次数不同：首轮确实捕获到 5 轮扫描，最终 6 秒窗口没有捕获到该路径。现有记录不足以确定固定扫描周期。进程枚举已得到动态确认；是否将具体进程名判为虚拟机、调试器或录屏软件，仍需关联比较和命中分支。

## SetWindowDisplayAffinity 入口异常

当前原会话中，该导出入口位于 `user32.dll+0x73290`：

- 系统 DLL 磁盘前 8 字节：`ff2502a60400cccc`。
- 当前进程内存前 8 字节：`2000000017020000`。
- `GetWindowDisplayAffinity` 的对应 48 字节在磁盘与内存中一致。

Frida 对当前会话的 `SetWindowDisplayAffinity` 返回 `unable to intercept function`。这里已证实存在进程内存与磁盘代码的差异；尚未定位写入者，也未将此差异归因于播放器、其他注入模块或任何特定保护机制。未执行该异常入口，也未覆盖其现有字节。

为继续观察，脚本增加了 `win32u.dll!NtUserSetWindowDisplayAffinity`，以及仅针对 setter 所在范围的 `VirtualProtect` 记录。最终原会话安装 15 个 hook、保留 1 个明确的入口失败记录；这次窗口内未观察到上述两个补充观测点的应用命中，因此尚未捕获设置 affinity 或写入该入口的现场。

补充启动会话 PID 16376 在入口正常时安装了全部 16 个 hook，之后很快出现 `process-terminated`、无 crash 对象。捕获到的少量调用来自 UxTheme 等系统模块；未将其归为播放器自身的检测。退出原因尚未确认，不能仅据此断定单实例退出或保护触发。这个短会话没有覆盖真实播放路径，也没有进行存活进程的卸载字节检查。

## 三组可复现对照

三组均用 PID 56664、6 秒观察时长和相同的观测器主动自检输入。只替换 agent 路径；脚本配置差异为 `const HOOKS_ENABLED = false` 与 `true`。

| 项 | BASELINE | MODIFIED | ROLLBACK |
|---|---|---|---|
| 进程退出状态（观测器） | 0 | 0 | 0 |
| HOOKS_ENABLED | false | true | false |
| 成功安装 hook 数 | 0 | 15 | 0 |
| 自检 IsDebuggerPresent | 0 | 0 | 0 |
| 自检 CheckRemoteDebuggerPresent 成功值 / 输出 | 1 / 0 | 1 / 0 | 1 / 0 |
| 原主窗口 affinity | 1 | 1 | 1 |
| 卸载后 API 入口恢复 | 无 hook | 15/15 与各自挂钩前 16 字节相同 | 无 hook |

`CheckRemoteDebuggerPresent` 和随之产生的 `NtQueryInformationProcess` 记录在这次对照中属于 **观测器主动自检**；未将它们列为应用自身命中。`origin=observer_selftest` 包括自检和窗口查询；`origin=application` 表示不属于这两个显式主动查询，仍须检查 caller/stack 才能判断调用者。最终报告只将 caller.module 为 `EVPlayer2.exe` 的相应记录归于播放器。

回滚在 `hook_checks.restored.js` 上执行，恢复后的 SHA-256 与 `hook_checks.pristine.js` 相同。补丁通过原生 patch 工具应用在独立副本上，重建后的 SHA-256 与 `hook_checks.js` 相同。完成回滚验证后，`MODIFIED_FILE` 保留 `HOOKS_ENABLED=true`；所有挂钩会话均已结束。

## 文件与使用

固定四个角色：

1. MODIFIED_FILE：`H:/orca/rea/site/evplayer2/hooks/hook_checks.js`
2. DIFF_FILE：`H:/orca/rea/site/evplayer2/hooks/hook_checks.patch`
3. VERIFICATION：`H:/orca/rea/site/evplayer2/hooks/VERIFICATION.txt`
4. ROLLBACK：`H:/orca/rea/site/evplayer2/hooks/ROLLBACK.sh`

运行器：`hooks/observe.mjs`。本地 Node 依赖固定为 Frida 17.26.0；下载的官方预编译归档 SHA-256 为 `FCAB62F9E807217D8DE9E433F27A142EA1557176FFF0BD7475D96FB78E3D23ED`。依赖目录、缓存和归档被项目内 `.gitignore` 排除。

在 PowerShell 中复用现有会话：

```powershell
Set-Location H:/orca/rea/site/evplayer2/hooks
node ./observe.mjs --agent ./hook_checks.js --output ./manual.jsonl --pid 56664 --seconds 30
```

观察期间可在播放器中复现目标操作；原始事件写入 JSONL，命中记录包含参数、原返回值、调用模块与 RVA，首次调用还包含调用栈。每个 API 的普通日志最多保留 60 条，但计数继续累计；带关注进程名的事件会继续保留。记录中的 interesting 只是观测器自己的筛选标签，不代表播放器的比较结果。

主动卸载由运行器完成，并检查已安装 hook 的原始 16 字节。回滚脚本用于恢复 agent 的开关配置，不用于更改或修复安装目录中的 DLL：

```sh
./ROLLBACK.sh ./hook_checks.restored.js
```

完整命令、输入、literal stdout/stderr、exit status 和哈希在 `hooks/VERIFICATION.txt`；摘要在 `hooks/transaction_results.json`；入口指令与磁盘对照分别在 `hooks/entries.json`、`hooks/user32_comparison.json`。

后续优先沿进程枚举循环的比较分支查明实际匹配名单，或在真实播放操作中用现有观测器捕获 affinity 设置调用。当前证据不支持“唯一防录屏路径”“只有两个反调试 API”或“跳转表必然是完整性保护”的强结论。