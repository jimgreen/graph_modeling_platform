# reviewer/ — 夜班程序员工作记录

本目录是夜班无人值守 Review Agent 的唯一长期记录目录。

| 目录/文件 | 用途 |
|-----------|------|
| `tasks/TASKS.md` | 所有发现的问题与待处理任务清单（ID/优先级/证据/状态） |
| `reports/YYYY-MM-DD.md` | 每晚 Review 报告：看了什么、发现什么、改了什么、为什么没改 |
| `completed/YYYY-MM-DD.md` | 满足 100% 无副作用标准并已完成的修改记录 |
| `suggestions/YYYY-MM-DD.md` | 不允许自动修改的问题（需人工决策/处理） |

状态取值：TODO / IN_PROGRESS / COMPLETED / BLOCKED / REJECTED
优先级：P0 严重 Bug·数据损坏·安全 > P1 明确 Bug > P2 性能·稳定性·一致性 > P3 文档·技术债
