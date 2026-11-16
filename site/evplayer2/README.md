# EVPlayer2 静态分析汇总

目标：`F:\EVPlayer2\EVPlayer2.exe` v4.8.2（签名有效，长沙一唯/ieway.cn）。
范围：结构 / 侦察 / 文档化，**未**逆向解密、未提取密钥、未编写任何绕过保护的代码。

## 概况
| 项 | 值 |
|---|---|
| 版本 | EVPlayer2 4.8.2（PE32+ x86-64 GUI）|
| SHA-256 | `1986E4607B8B5801AFE060446F2EDC2F186FB0FEA19F0CBBF42550452EFB6B3A` |
| 框架 | Qt5 Widgets + 自研 Bridge.dll / MetaLib.dll / PlayerLibRender56_vs.dll(FFmpeg) |
| 加壳 | 无（.text 熵 5.54，符号可读）|

## 报告
- [report_traffic.md](report_traffic.md) — 动态/流量分析：网络端点、运行态连接、明文上报、隐私风险。
- [report_ipc.md](report_ipc.md) — IPC 测绘：命名管道 + Qt 双通道、`bg::Value` 消息模型、许可子系统。
- [report_antihook.md](report_antihook.md) — 自保护机制清单：反调试 / 反 VM / 防录屏 / 自研跳转表。

## 待动态补全（需真实播放会话，仅观察不破解）
真实管道名 · Bridge 命令集 · `version.ieway.cn`/183 地址完整请求体。
