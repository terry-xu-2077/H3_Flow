# ShotMill 开发导航

ShotMill 是面向 AI 视频生产流程的素材生成平台，不是剪辑器或 ComfyUI 外壳。项目以 Generation Task 为核心对象，并通过 Storyboard-style Task Workspace 提供画面化、按故事顺序排列的创作入口。

## 文档入口

- Storyboard / Task 核心领域模型：`docs/STORYBOARD_TASK_MODEL.md`
- 当前 Storyboard 开发顺序与 Gate：`docs/V0.2_STORYBOARD_DEVELOPMENT_TASKS.md`
- V0.1 基础任务与总体 Phase：`docs/V0.1_DEVELOPMENT_TASKS.md`
- 产品边界与核心架构：`docs/ShotMill_产品与架构规划.md`
- UI / UX 行为协议：`docs/UI_UX_SPEC.md`
- Director Mode 信息架构与防参数堆砌规则：`docs/UI_DIRECTOR_MODE_GUIDE.md`
- 测试与故障注入：`docs/TEST_STRATEGY.md`
- 文档索引：`docs/README.md`

发生冲突时，按 `docs/README.md` 中的优先级处理；涉及“哪些信息可以出现在首屏”时，`docs/UI_DIRECTOR_MODE_GUIDE.md` 为强制约束。

## 目录职责

- `frontend/`：React、TypeScript、Vite、Tauri 壳与 `/dev/ui`。
- `backend/shotmill/`：FastAPI 与领域核心。
- `scripts/`：统一开发与验收入口。
- `tests/`：Python unit、integration、contract、E2E fixtures 与场景。
- `docs/`：产品、交互、架构和测试协议。

## 不可违反的边界

- ShotMill Core 不得绑定 H3、Qwen、ComfyUI 或具体厂商。
- Prompt AI Provider 与 Video Generation Provider 必须独立。
- Provider 行为由 Capability 驱动；专属字段只存在于 Adapter、Profile、Skill、Validator 或 Provider Parameter Schema。
- **一张 Storyboard 卡片就是一个 Generation Task。** Storyboard 是分镜式交互方式，不是独立 Shot 制作工具。
- **Task 不硬绑定为一个 Shot。** 一个 Task 可以在内部描述一个或多个镜头 / `TaskVisualBeat`；Beat 不拥有独立卡片、Queue、Job 或 Result 生命周期。
- **Story Order、Task Content、Generation Context 必须是三套独立关系。**
- V0.2 不要求一级 `StoryboardShot`、`TaskShotBinding` 或 `ResultShotSpan`；不得重建 Shot Cards + Task Bands 双层主界面。
- Result 属于 Job / Task；多镜头 Task 的 Result 仍是一份完整结果，不得为了卡片布局伪造多个 Shot Result。
- Ready、Queued、Running、Failed 等执行状态属于 Generation Task。
- H3 当前约 15 秒单任务上限与多分镜 Prompt 能力必须由 Generation Profile / Capability 表达，不得写死在 Core。
- Task 是可变生产意图；Job 是不可变执行快照；Job 必须保存当时的 Task 内容、Prompt、Assets、Profile、Params 与 Context。
- Storyboard 排序变化不得静默改写 Task 内容、历史 Job 或历史 Context。
- Task 展示编号不是稳定 ID；Scene / Task / Result / Context 关系必须使用稳定内部 ID。
- 剧本原文、AI Prompt 与人工 Final Prompt 必须分离；后台操作不得覆盖人工 Final Prompt。
- 项目业务引用使用 project-relative path 和 `asset_id`，不得传播绝对资产路径。
- 重新生成不得覆盖历史 Result；Primary Result 变化必须正确传播 Context Stale。
- Story Reel 仅用于按 Task Story Order 预览已有结果，不得演变为剪辑时间线、多轨、Trim、转场或关键帧编辑器。

### Director Mode UI 不变量

- 一级导航围绕 **故事板 / 生成 / 素材**；设置与高级技术能力不得抢占一级导航。
- **故事板是唯一完整分镜编辑入口。** 生成页只能监控队列、进度与异常，不得复制一套任务编辑器。
- 故事板默认必须是单主画布，不得恢复常驻 `Scene Navigator | Task Board | Inspector` 三栏布局。
- 分镜卡默认最多显示 5 类信息：代表画面、编号、标题/一句描述、时长、用户可理解的状态。
- 简单分镜详情默认只显示：画面描述、时长、素材、连续性摘要、生成按钮、高级设置入口。
- Profile、Prompt、Visual Beat、ContextLink、Job、Capability、Validation 等工程概念默认只能进入高级设置 / 调试层。
- 不得通过缩小字号、增加大量 Badge / Pill、密集 key-value 或多层常驻折叠区来容纳更多参数。
- 系统可自动推导和校验的步骤不得拆成一排要求用户逐项点击的按钮。
- 用户可见文案优先使用创作语言：分镜、连续性、生成方案、生成服务、生成记录；避免直接暴露内部类名。
- UI 修改必须先阅读 `docs/UI_UX_SPEC.md` 与 `docs/UI_DIRECTOR_MODE_GUIDE.md`；Storyboard / Task 相关任务还必须阅读 `docs/STORYBOARD_TASK_MODEL.md` 与 `docs/V0.2_STORYBOARD_DEVELOPMENT_TASKS.md`；重要状态先进入 `/dev/ui`，再连接真实后端。
- 测试修改必须先阅读 `docs/TEST_STRATEGY.md`。

## 开发与验收

- 使用完成当前任务所需的最小仓库上下文，不扫描无关模块。
- 修改业务逻辑必须增加测试；修复 Bug 必须先增加可复现的回归测试。
- Provider 变更必须运行 Contract Tests；UI 行为变化必须运行相关 Playwright / Vitest 测试。
- UI PR 必须检查 `docs/UI_DIRECTOR_MODE_GUIDE.md` 的 Code Review 清单，尤其是参数暴露预算和重复编辑入口。
- 开发中优先运行 targeted tests，完成前运行对应的 `python scripts/verify.py --area <area>`。
- 发布与高风险跨域变更运行 `python scripts/verify.py --full`。
- 禁止删除、跳过或弱化有效测试来规避失败。
- 无法执行的验收必须明确报告原因和未验证风险。

## Windows 本地规则

- 本地命令使用 PowerShell 7，并在中文或文本读写前设置 UTF-8。
- 文本文件读写显式使用 UTF-8。
- 当前 ComfyUI 开发环境：`G:\AIGC\ComfyUI_Codex`。它是 Video Generation Provider 的执行端，不是 Core 依赖。
