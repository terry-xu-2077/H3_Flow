# ShotMill 开发导航

ShotMill 是面向 AI 视频生产流程的素材生成平台，不是剪辑器或 ComfyUI 外壳。项目以 Task 为核心，负责从剧本、项目资产和上下文生成可追踪、可恢复、可审核的视频素材。

## 文档入口

- 开发顺序与 Gate：`docs/V0.1_DEVELOPMENT_TASKS.md`
- 产品边界与核心架构：`docs/ShotMill_产品与架构规划.md`
- UI / UX 行为协议：`docs/UI_UX_SPEC.md`
- 测试与故障注入：`docs/TEST_STRATEGY.md`
- 文档索引：`docs/README.md`

发生冲突时，按 `docs/README.md` 中的优先级处理。

## 目录职责

- `frontend/`：React、TypeScript、Vite、Tauri 壳与 `/dev/ui`。
- `backend/shotmill/`：FastAPI 与领域核心。
- `scripts/`：统一开发与验收入口。
- `tests/`：Python unit、integration、contract、E2E fixtures 与场景。
- `docs/`：产品、交互、架构和测试协议。

## 不可违反的边界

- ShotMill Core 不得绑定 H3、Qwen、ComfyUI 或具体厂商。
- Prompt AI Provider 与 Video Generation Provider 必须独立。
- Provider 行为由 Capability 驱动；专属字段只存在于 Adapter、Profile 或 Validator。
- Task 是可变意图；Job 是不可变执行快照；Result 是不可变输出记录。
- 剧本原文、AI Prompt 与人工 Final Prompt 必须分离；后台操作不得覆盖人工 Final Prompt。
- 项目业务引用使用 project-relative path 和 `asset_id`，不得传播绝对资产路径。
- 重新生成不得覆盖历史 Result；Primary Result 变化必须正确传播 Context Stale。
- UI 修改必须先阅读 `docs/UI_UX_SPEC.md`，重要状态先进入 `/dev/ui`，再连接真实后端。
- 测试修改必须先阅读 `docs/TEST_STRATEGY.md`。

## 开发与验收

- 使用完成当前任务所需的最小仓库上下文，不扫描无关模块。
- 修改业务逻辑必须增加测试；修复 Bug 必须先增加可复现的回归测试。
- Provider 变更必须运行 Contract Tests；UI 行为变化必须运行相关 Playwright 测试。
- 开发中优先运行 targeted tests，完成前运行对应的 `python scripts/verify.py --area <area>`。
- 发布与高风险跨域变更运行 `python scripts/verify.py --full`。
- 禁止删除、跳过或弱化有效测试来规避失败。
- 无法执行的验收必须明确报告原因和未验证风险。

## Windows 本地规则

- 本地命令使用 PowerShell 7，并在中文或文本读写前设置 UTF-8。
- 文本文件读写显式使用 UTF-8。
- 当前 ComfyUI 开发环境：`G:\AIGC\ComfyUI_Codex`。它是 Video Generation Provider 的执行端，不是 Core 依赖。
