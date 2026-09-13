# ShotMill 开发导航

ShotMill 是面向 AI 视频生产流程的素材生成平台，不是剪辑器或 ComfyUI 外壳。Core 仍以 Generation Task、Job、Result、Asset、Context 等领域对象组织能力，但当前默认产品 UI 已收敛为“项目首页 → 项目工作台 → 任务编辑弹窗”。

## 当前优先文档

- **最新 UI 增量：`docs/UI_V0.6_PROJECT_CONFIG_H3_EDITOR.md`**
- **V0.6 后端增量：`docs/V0.6_BACKEND_DELTA.md`**
- 当前产品 UI 基线：`docs/UI_V0.5_PROJECT_WORKSPACE.md`
- 任务编辑与 Context / Select 细化：`docs/UI_V0.5_TASK_EDITOR_REFINEMENT.md`
- V0.5 后端适配基线：`docs/V0.5_BACKEND_FRONTEND_ADAPTER.md`
- 查看/编辑分离、防参数墙：`docs/UI_DIRECTOR_MODE_GUIDE.md`
- Storyboard / Task 核心领域模型：`docs/STORYBOARD_TASK_MODEL.md`
- 产品边界与核心架构：`docs/ShotMill_产品与架构规划.md`
- 通用 UI / UX：`docs/UI_UX_SPEC.md`
- 测试与故障注入：`docs/TEST_STRATEGY.md`
- 文档索引与冲突优先级：`docs/README.md`

涉及项目工作台顶部、项目配置、Result 播放或提示词编辑时，必须先读 `UI_V0.6_PROJECT_CONFIG_H3_EDITOR.md`。旧文档里的“故事板 / 生成 / 素材”三个一级页面已被当前 UI 覆盖，不得恢复。

## 目录职责

- `frontend/`：React、TypeScript、Vite、Tauri 壳与 `/dev/ui`。
- `backend/shotmill/`：FastAPI 与后续领域 / Application / Frontend Adapter。
- `scripts/`：统一开发与验收入口。
- `tests/`：Python unit、integration、contract、E2E fixtures 与场景。
- `docs/`：产品、交互、架构和测试协议。

## 不可违反的领域边界

- ShotMill Core 不得绑定 H3、Qwen、ComfyUI 或具体厂商。
- Prompt AI Provider 与 Video Generation Provider 必须独立。
- Provider 行为由 Capability 驱动；专属字段只存在于 Adapter、Profile、Skill、Validator 或 Provider Parameter Schema。
- Task 可以在内部描述一个或多个 `TaskVisualBeat`；Beat 不拥有独立 Queue、Job 或 Result 生命周期。
- Story Order、Task Content、Generation Context 必须保持独立。
- Result 属于 Job / Task；重新生成不得覆盖历史 Result。
- Task 是可变生产意图；Job 是不可变执行快照。
- Task 展示编号不是稳定 ID；关系必须使用稳定内部 ID。
- 剧本原文、AI Prompt 与人工 Final Prompt 必须分离。
- 项目业务引用使用 project-relative path 和 `asset_id`，不得传播绝对资产路径。
- Primary Result 变化必须正确传播 Context Stale。
- H3 当前时长 / 多镜头等限制必须由 Profile / Capability 表达，不得写死在 Core。

## 当前 UI 不变量

- 默认一级结构只有 **项目首页** 与 **项目工作台**；任务编辑使用 Overlay。
- 首页只负责打开 / 新建项目，不展示任务内部参数。
- 项目页左上是 **返回首页**，必须有房子图标，不再用产品标题伪装导航。
- 项目页顶部中间显示当前项目；右侧必须有 **项目配置** 与表格 / 卡片切换。
- **列表与卡片是同一任务集合的两种视图。** 切换不得改变任务数据和选中任务。
- **表格和卡片都必须保留顶部“新建任务 / N 个任务”工具栏；卡片模式可额外保留“新建任务卡”。**
- 单击任务只选择并更新右侧只读栏。
- 双击任务或右键“编辑任务”打开同一套任务编辑弹窗。
- 右侧栏永远只读，不得出现 input / textarea / Select / 保存 / 添加素材等编辑控件。
- 有 Result 时右侧缩略图允许点击打开独立播放弹窗；播放器不得常驻右栏。
- 底部左侧是应用设置入口，右侧只显示当前运行摘要。
- 项目配置负责项目标题、简介、AI 项目背景开关与项目资产管理；不得把这些塞进任务编辑器。
- 不再恢复“故事板 / 生成 / 素材”三个一级导航。
- 任务编辑弹窗保持“左侧少量配置 + 右侧大提示词区 + 底部取消/保存”。
- 用户提示词与 AI 增强提示词都必须支持 **可视化 / 文本** 两种模式。
- 用户 / AI 标签决定真正使用哪份提示词；可视化 / 文本只决定同一份 H3 字符串的编辑表现。
- H3 可视化模式参考 `ComfyUI-TerryXu-nodes` 的 H3 Prompt Editor：标签、素材引用、Shot、对白、时间、运镜等以用户可读组件显示，但序列化仍保持标准 H3 文本。
- Profile、Visual Beat、ContextLink、Job、Capability、Validation 等工程概念不得进入默认产品 UI。
- 不得通过缩小字号、大量 Badge / Pill、密集 key-value 来容纳更多参数。
- 用户可见文案默认中文，产品名 / 模型名 / 外部协议标签除外。

## 后端接入不变量

- React 页面不得直接围绕 Core 对象或数据库表拼 UI；使用 Frontend Adapter / Read Model。
- 首页消费 `ProjectSummary`，项目页消费 `ProjectWorkspaceView / TaskSummary`，编辑窗消费 `TaskEditorView`。
- Project status、Task status、resultCount、preview fallback 等聚合逻辑放在后端 Adapter，不让前端理解 Job / Result / Context 细节。
- 项目简介只在 `useDescriptionForAiPrompt=true` 时作为 Prompt Enhancer 项目级 Context；不得直接拼进用户 Prompt。
- H3 可视化 HTML / Chip DOM 不得入库，后端只存标准 H3 文本。
- Prompt Source 必须明确保存为 user / ai；两份 Prompt 独立保存。
- `userViewMode / aiViewMode` 是 UI 偏好，不属于真实 Video Provider 参数；真实后端接入时应从 generationParams 中拆出。
- 新建任务应在用户点击“保存”时才真正落库；打开空白编辑窗不产生数据库垃圾记录。
- Core 的 Scene / TaskPlacement 不因当前 UI 隐藏 Scene 而删除；Adapter 负责压平成任务顺序。
- 实时状态优先使用项目级 SSE，轮询可作为第一阶段 fallback。
- 真实后端接入时优先新增 `ProjectGateway`，不要让组件散落 `fetch()`。

## 开发与验收

- UI 修改必须先阅读 `UI_V0.6_PROJECT_CONFIG_H3_EDITOR.md`、`UI_V0.5_PROJECT_WORKSPACE.md` 和 `UI_DIRECTOR_MODE_GUIDE.md`。
- 后端接 UI 必须阅读 `V0.5_BACKEND_FRONTEND_ADAPTER.md` 与 `V0.6_BACKEND_DELTA.md`。
- Storyboard / Task 领域变更必须阅读 `STORYBOARD_TASK_MODEL.md`。
- 测试修改必须阅读 `TEST_STRATEGY.md`。
- 修改业务逻辑必须增加测试；修复 Bug 必须先增加可复现回归测试。
- Provider 变更必须运行 Contract Tests；UI 行为变化必须运行相关 Vitest / Playwright。
- 开发中优先 targeted tests，完成前运行对应 `python scripts/verify.py --area <area>`。
- 发布与高风险跨域变更运行 `python scripts/verify.py --full`。
- 禁止删除、跳过或弱化有效测试来规避失败。
- 无法执行的验收必须明确报告原因和未验证风险。

## Windows 本地规则

- 本地命令使用 PowerShell 7，并在中文或文本读写前设置 UTF-8。
- 文本文件读写显式使用 UTF-8。
- 当前 ComfyUI 开发环境：`G:\AIGC\ComfyUI_Codex`。它是 Video Generation Provider 的执行端，不是 Core 依赖。
