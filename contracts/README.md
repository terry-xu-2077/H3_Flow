# 前后端接口契约与假数据模式

ShotMill 前端只有一套数据入口：`HttpProjectGateway`。它始终请求 `/api/v1`，不会因为使用假数据而切换成组件内 Mock 或另一套数据模型。

## 核心原则：产品体验优先，Mock 可领先真实后端

ShotMill 的 Mock API 不是生产后端的被动镜像，而是**目标产品契约的先行实现环境**。

当核心产品体验已经确定、但真实后端尚未完成对应能力时：

1. 先定义 Frontend Gateway 的目标 contract；
2. 在 backend-owned Mock API 中实现同一 HTTP contract；
3. 前端以 Mock API 完整实现并验证目标产品体验；
4. 将新增目标 contract 记录在 `contracts/`；
5. 真实后端随后按同一 contract 补齐实现；
6. 真实后端落地后，再把目标 contract 收敛进正式 OpenAPI snapshot。

**禁止为了迁就当前真实后端缺口而主动降级已经确定的核心体验。**

例如 V0.4 的核心路径必须保持：

`批量选择任务 → 队列批量 AI 提示词增强 → 用户逐条检查/修改/确认 → 只对已检查任务批量生成视频`

不能因为真实 Batch API 尚未落地，就改成前端循环调用单任务接口，也不能把按钮永久做成禁用占位。

## 两种日常启动模式

| 模式 | 启动入口 | API | 数据用途 |
| --- | --- | --- | --- |
| 真实数据 | `启动 ShotMill（前端+后端）.bat` | `127.0.0.1:8765` | SQLite、真实 Prompt AI 配置、ComfyUI 联调 |
| 假数据 | `启动 ShotMill（假数据）.bat` | `127.0.0.1:8766` | UI 打磨、空状态、保存、资产、AI 增强、Batch/Review 产品流程 |

启动器会在 `.shotmill/mock-ui-processes.json` 记录自己创建的进程 ID 与启动时间；即使上次窗口异常退出，下次启动也能精确清理，不会不断累积服务。若 `1420` 仍被占用，启动器还会同时核验页面内容、进程类型和当前项目路径。确认是当前 ShotMill 遗留的 Vite 服务后才自动结束它并继续使用 `1420`；无法确认身份时不会误杀，而是选择下一个空闲 UI 端口。`8766` 上遗留的 ShotMill 假 API 采用同样处理。

假 API 由后端代码创建，优先复用正式路由、请求/响应模型、Frontend Adapter、SQLite 与业务 Service。对于真实后端尚未落地、但产品已经确定的新能力，可以额外挂载**目标契约路由**：

- 每次启动创建独立临时数据库，退出后自动清理，下次启动恢复标准场景。
- UI 的创建项目、保存任务、编辑资产等操作在当前会话内真实生效。
- Prompt AI 使用确定性假 Provider，不访问网络，也不消耗额度。
- Batch Prompt 等目标流程必须通过一次 Batch HTTP 请求完成，不允许 React 组件循环调用单任务接口冒充队列。
- 不把假数据、绝对路径、base64 或组件专用字段写进产品数据库。

## 契约归属

- 已经由真实后端实现的接口，以后端 Pydantic API Model 为正式接口源头。
- `openapi.json` 是**当前真实 API** 的正式快照。
- 对于“产品已冻结、真实后端尚未完成”的前置能力，在 `contracts/target-*.json` 中记录**目标前后端契约**，Mock API 必须实现它。
- 真实后端完成后，对应 target contract 必须迁入正式 OpenAPI，并删除或标记 target 文件已收敛。
- 假数据场景由 `backend/shotmill/devtools/mock_api.py` 创建；前端只通过 HTTP 拉取。
- UI 单元测试仍可使用内存 Gateway，但日常 UI 调试和 E2E 应优先走 HTTP Mock API。

当前 V0.4 前置契约见：

- `contracts/target-v0.4-batch-review.json`

后端接口变化后更新正式 OpenAPI 快照：

```powershell
& .\.venv\Scripts\python.exe .\scripts\export_frontend_contract.py
```

提交前运行契约测试：

```powershell
& .\.venv\Scripts\python.exe -m pytest .\tests\contract
```
