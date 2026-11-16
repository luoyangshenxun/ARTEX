# EVPlayer2 IPC 测绘报告（方向二）

目标：`F:\EVPlayer2`，仅结构测绘，未注入/未劫持/未改程序。

## 概览：两套独立 IPC 机制
1. **Bridge.dll 原生命名管道（主通道）** — Win32 `CreateNamedPipeA/ConnectNamedPipe/WaitNamedPipeA/SetNamedPipeHandleState`，`bg::` 框架，承载 `Value` 变体对象的二进制序列化消息，用于与 EV 录制/宿主套件通信。
2. **Qt QLocalSocket/QLocalServer（exe 内，次通道）** — 疑似单实例守卫/辅助通道。

## 运行态
- EVPlayer2（PID 56664）由 explorer.exe **直接双击、无命令行参数**启动。
- 系统 586 个命名管道中**无任何 EV/Bridge 项**（仅 Chromium `mojo.*`、`cc-msg.*` 噪声）→ 宿主未在场，Bridge 服务端此刻未监听。
- 推论：**Bridge 管道是宿主驱动场景通道**，被录制套件拉起并传入管道名时才建立；独立双击仅走本地授权（`SetLicence`/`NeedCheckMachine`）。

## 命名管道
- 传输：原生 Win32 ANSI 命名管道（非 Qt）。
- 前缀字面量 `\\.\pipe\`，**具体名运行时由调用方传入**（`create_pipe_server(name,int)`）；exe 内无固定管道名字面量。
- 日志标记：`pipeSrv, exception=%s`、`[pipe] err: %s`。
- 真实管道名需在「录制套件拉起 EVPlayer2」的真实会话中枚举才能抓到。

## Bridge.dll = 完整 `bg` 框架（按子命名空间）
| ns | 关键导出 | 作用 |
|---|---|---|
| `bg::pi` | `create_pipe_server`/`create_pipe_client`/`srv_listen_pipe(name,mode,cb,ctx)`/`client_pipe_send(name,string)`/`INamedPipe(Server)`/`setup_single_app` | 命名管道 + 单实例 |
| `bg::binary` | `create(buf,len,Endian)`/`cpuEndian`/`Abstract_Binary` | **端序感知二进制序列化**（Value 编解码） |
| `bg::sharem` | `Abstract_ShareMem` | 共享内存 IPC（大块/帧数据可选通道） |
| `bg::conf`/`bg::log`/`bg::sig` | `Abstract_Config`/`Logger`/`Signal` | 配置/日志/信号 |
| hook/trace | `create_hook`/`Abstract_Hook`/`trace::hook` | **API Hook 框架**（呼应 exe 的 Detours 自保护层） |
| module | `InitBridge`/`LoadModule(s)`/`StartModules`/`Interface@bg` | 模块化插件装载 |
| instance | `getInstance/setInstance/eraseInstance/travellInstance/getInstanceCount` | 全局实例注册表 |
| **license** | `SetLicence`/`NeedCheckMachine`/`NeedCheckOrganization`/`RegEditPath`/`SetEnableRegEdit` | **机器绑定 + 组织校验 + 注册表许可** |
| misc | `regist_value_type(id,name,ctor,ctor)`/`GetEnvPtr`/`StartMultiConsole`/`SetConsoleUtf8` | 可扩展类型注册/环境 |

## Value 载荷类型体系（消息模型）
`Value` 变体对象 + `ValueList`(list) + `ValueMap`(string→Value) + `MultiValues`(多值聚合)。由构造签名归纳支持：`int/uint`、`int64/uint64`、`float/double`、`bool`、`const char*`/`std::string`、**`const unsigned char*,int`=带长度字节块**、`void*` 指针、`ValueList`、`ValueMap`、空。`ValueMap::operator[](const char*)` → 以 C 字符串为键。`regist_value_type` → 两端需注册一致的自定义类型 id 才能互通。

**推断 wire 格式**：`Value` → `bg::binary`（端序标注二进制流）→ `client_pipe_send(pipe, payload)` 写管道；服务端 `srv_listen_pipe` 回调里反序列化分发。大体量数据（帧/纹理）可能改走 `bg::sharem`，管道仅传句柄/元信息。命令字（cmd/method）未以明文常量出现，更可能由各 module 运行时注册进 ValueMap 键 —— 需真实会话抓 payload 才能枚举完整命令集。

## 调用关系
宿主(EVCapture/EVCreator) ──`bg::pi` 命名管道 / `Value` 二进制消息──> EVPlayer2.exe(Qt 前端) ──进程内──> `PlayerLibRender56_vs.dll` 的 `MediaPlayer::playFile(QString)`（`ev::EVPlayer/RenderImpl/TextureImpl/AudioImpl/RtAudio/Surface`）。授权由 Bridge `bg::` license 子系统承担，与播放流程解耦。

## 待动态侧补全（不在本次范围）
1. 真实管道名（录制套件在场时枚举 `\\.\pipe\`）；
2. 命令集 / ValueMap 字段（抓管道 payload）；
3. `LoadModules` 模块清单。
