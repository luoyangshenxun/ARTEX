# 网络层、undici/fetch 与 TLS 特征

状态：模板，静态证据优先；JA3/JA4 为可选运行时交叉项。

## 网络层表

| 项目 | 静态构造/配置 | 运行时观察 | 来源（文件:函数） | 定位 | 证据级别 |
| --- | --- | --- | --- | --- | --- |
| fetch implementation | [待填] | [待填] | [待填] | [待填] | [待填] |
| `undici` version | [待填] | [待填] | [待填] | [待填] | [待填] |
| `Agent`/`Dispatcher` | [待填] | [待填] | [待填] | [待填] | [待填] |
| connection pooling | [待填] | [待填] | [待填] | [待填] | [待填] |
| proxy environment | [待填] | [待填] | [待填] | [待填] | [待填] |
| DNS/connection options | [待填] | [待填] | [待填] | [待填] | [待填] |
| TLS options | [待填] | [待填] | [待填] | [待填] | [待填] |
| HTTP/1.1 vs HTTP/2 | [待填] | [待填] | [待填] | [待填] | [待填] |
| redirect/retry behavior | [待填] | [待填] | [待填] | [待填] | [待填] |

## JA3/JA4 边界

静态分析可以记录显式 TLS 选项、Node/undici 版本和是否使用自定义
dispatcher；它不能单独生成最终 ClientHello 的 JA3/JA4。若有抓包，必须
同时记录：

- Claude Code、CLI、Node/undici、操作系统的精确版本；
- 代理是否存在及代理终止 TLS 的位置；
- 抓包工具和采集时间；
- 是否为同一请求路径和同一认证模式；
- 原始特征、脱敏后的报告值和无法归因的字段。

没有同环境运行时证据时，JA3/JA4 栏只能写“待观测”或“无法由静态证据
确认”。
