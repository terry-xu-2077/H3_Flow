# 前后端接口契约与假数据模式

ShotMill 前端只有一套数据入口：`HttpProjectGateway`。它始终请求 `/api/v1`，不会因为使用假数据而切换成组件内 Mock 或另一套数据模型。

## 两种日常启动模式

| 模式 | 启动入口 | API | 数据用途 |
| --- | --- | --- | --- |
| 真实数据 | `启动 ShotMill（前端+后端）.bat` | `127.0.0.1:8765` | SQLite、真实 Prompt AI 配置、ComfyUI 联调 |
| 假数据 | `启动 ShotMill（假数据）.bat` | `127.0.0.1:8766` | UI 打磨、空状态、保存、资产、AI 增强交互 |

启动器会在 `.shotmill/mock-ui-processes.json` 记录自己创建的进程 ID 与启动时间；即使上次窗口异常退出，下次启动也能精确清理，不会不断累积服务。若 `1420` 仍被占用，启动器还会同时核验页面内容、进程类型和当前项目路径。确认是当前 ShotMill 遗留的 Vite 服务后才自动结束它并继续使用 `1420`；无法确认身份时不会误杀，而是选择下一个空闲 UI 端口。`8766` 上遗留的 ShotMill 假 API 采用同样处理。

假 API 由后端代码创建，复用正式路由、请求/响应模型、Frontend Adapter、SQLite 与业务 Service。它只替换数据目录和外部 Provider：

- 每次启动创建独立临时数据库，退出后自动清理，下次启动恢复标准场景。
- UI 的创建项目、保存任务、编辑资产等操作在当前会话内真实生效。
- Prompt AI 使用确定性假 Provider，不访问网络，也不消耗额度。
- 假 API 与真实 API 的 OpenAPI paths 和 schemas 有自动回归测试，防止两套接口漂移。
- 不把假数据、绝对路径、base64 或组件专用字段写进产品数据库。

## 契约归属

- 后端 Pydantic API Model 是接口的源头。
- `openapi.json` 是提交到仓库的契约快照，供检查、代码生成或未来拆分前端仓库时锁定版本。
- 假数据场景由 `backend/shotmill/devtools/mock_api.py` 创建；前端只通过 HTTP 拉取。
- UI 单元测试仍可使用内存 Gateway，但日常 UI 调试和 E2E 应优先走 HTTP。

后端接口变化后更新快照：

```powershell
& .\.venv\Scripts\python.exe .\scripts\export_frontend_contract.py
```

提交前运行契约测试：

```powershell
& .\.venv\Scripts\python.exe -m pytest .\tests\contract
```
