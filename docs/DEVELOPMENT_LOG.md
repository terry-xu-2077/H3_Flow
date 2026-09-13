# ShotMill 开发记录

本文件记录已经实际完成并通过验证的开发内容。当前 Storyboard 阶段以 [V0.2 Storyboard 开发任务](./V0.2_STORYBOARD_DEVELOPMENT_TASKS.md) 为主执行清单，V0.1 保留为基础工程参考。

## 2026-09-13 · Windows 启动器端口复用修复

- 修复 `1420` 已由 ShotMill Vite 占用时，Tauri 再次执行 `beforeDevCommand` 并以红字退出的问题。
- 启动器现在会主动识别 `http://127.0.0.1:1420/dev/ui`：确认是 ShotMill 时复用现有前端，并通过独立 Tauri 覆盖配置禁用重复的 `pnpm dev`。
- 若端口属于其他应用，启动器只报告占用者并退出，不会误杀其他进程。
- 新增空闲端口、ShotMill 占用、其他应用占用与 Tauri 复用配置回归测试；实际启动验证只出现 `Running DevCommand`，没有再次出现 `Running BeforeDevCommand`，桌面窗口成功打开。

## 2026-09-12 · V0.2 产品基线纠偏与 Task-first Gate S0–S12 / V0.2 Freeze

### 已完成

- 根据最新产品决策修订 `V0.2_STORYBOARD_DEVELOPMENT_TASKS.md`、`STORYBOARD_TASK_MODEL.md`、文档索引、UI 规范与项目开发边界。
- 明确 Storyboard 是分镜式 Task 交互，不是独立分镜制作工具；`1 Storyboard Card = 1 GenerationTask`。
- 明确 Task 不硬绑定为一个 Shot；一个 Task 可在内部包含 1..N 个 `TaskVisualBeat`，Beat 没有独立 Queue / Job / Result 生命周期。
- 移除 V0.2 对一级 `StoryboardShot`、`TaskShotBinding`、Shot Card、Task Band 与必选 `ResultShotSpan` 的错误要求。
- 前端 Domain `GenerationTask`、`TaskStoryboardPlacement`、`TaskVisualBeat`、`GenerationContextLink`、不可变 `Job` 与 `Result` Contract 已按 Task-first 模型落地。
- Story Order 与 Generation Context 独立存储；Job 保存完整 Task 内容、Prompt、Assets、Profile、Params 与 Context 快照。
- `/dev/ui` 默认进入“分镜式任务工作台”，中央直接显示 Task Cards；Scene Navigator 与 Inspector 均可折叠。
- Task Card 明确标识单镜头 / 多镜头 Task；单击更新 Task Inspector，双击进入现有 Task Composer。
- 增加空 Scene、6 Tasks 和 36 Tasks 三种 Mock 场景；36 Tasks 中混合单镜头与三视觉节拍 Task。
- 抽出独立 `StoryboardTaskCard`；固定代表帧、状态、进度占位、时长、资产、Profile 与多镜头标识的信息层级，状态切换不改变卡片结构。
- 默认 Storyboard Task Board 已支持单选、Ctrl/Cmd 多选、Shift 连选与 Batch Inspector。
- 支持新建空白 Task、“新建下一个”并仅继承 Generation Profile，以及复制 Task 内容。
- 复制时明确清空 Job、Result、Context 与执行状态；已有 Job / Result 历史的 Task 禁止直接删除，无历史 Task 删除前必须确认。
- 支持 Scene 内排序与跨 Scene 拖动 Task Card；移动只改写 `TaskStoryboardPlacement`，Task ID、Task 内容、Job 与 Result 均保持不变。
- 拖动触及已有 Generation Context 时不重连依赖，只将原 Context Link 标记为待复核，并在 Task Inspector 显示明确警告。
- Storyboard Task Card 支持 Ctrl/Cmd+C、Ctrl/Cmd+V、Ctrl/Cmd+D、Delete、Enter、Escape 与方向键操作。
- Scene Overview 支持快速编辑名称、摘要、地点、时间与备注，并保持状态汇总同步。
- Task Inspector 支持快速编辑 Task Name、Summary、Script Source、User Intent、计划时长与 Generation Profile，同时显示 Storyboard Frame、Visual Beats、前后邻接、Prompt / Queue 状态、Context 与 Primary Result。
- Generation Profile 由 Capability 驱动；多镜头 Task 选用不支持多镜头的 Profile 或超出时长上限时显示明确警告。
- Batch Inspector 已提供跨 Scene 移动、批量 Profile、批量资产绑定、仅将 Ready Task 入队、复制与安全删除。
- `/dev/ui` 场景控制器默认收起，避免遮挡右侧 Inspector；需要切换 Mock 密度或浮层场景时仍可随时展开。
- 新增 Script → Task Cards 工作流，支持粘贴大段剧本、从选中文本创建 Proposal 与生成确定性的 Mock AI Proposal。
- Proposal 可在创建正式 Task 前修改标题、剧本边界、User Intent、计划时长、目标 Scene 和 Task 内部 Visual Beats。
- Proposal 支持排序、删除、合并与拆分；逐条接受或“接受全部”均为显式动作，未接受时不会产生正式 GenerationTask。
- 从 Proposal 创建的正式 Task 保持 `Card = Task`，每个 Proposal 内可继续包含多个镜头式 Visual Beats。
- 新增 Asset Library，支持 Image / Video / Audio 与 Character / Scene / Prop / Reference 分类、名称和 Tags 搜索、详情预览。
- Task Asset Picker 支持预览与多选；只有“确认绑定”才更新 Task，取消不会泄漏临时选择。
- 资产业务引用统一使用 `asset_id` 与 project-relative path；新增解析函数生成包含媒体类型、相对路径与 checksum 的不可变资产快照。
- Storyboard Task 的真实资产绑定已传入 Prompt Composer，Final Prompt `@` 菜单会基于当前 Task 资产筛选并插入 `<Subject/Picture/Video/Audio N>` 引用，同时展示素材来源路径。
- Task Composer 已升级为直接编辑当前 GenerationTask；单镜头或多镜头描述统一保存在 Task 内部 `TaskVisualBeat`，不会生成独立 Storyboard Card。
- Visual Beat Strip 支持选择、修改、新增、排序和删除；Generation Profile Capability 会就地提示多镜头与最大时长不兼容。
- 新增 Provider-neutral `PromptRequest` Contract，一次性快照 Task 内容、Visual Beats、解析后的资产、前序生成 Context、后续 Story Context 与目标 Generation Profile。
- AI Prompt Revision 与人工 Final Prompt 保持独立；重新生成 AI Prompt 不覆盖人工内容，显式确认后才允许替换 Final Prompt。
- 新增完整 Ready Validation，检查 Final Prompt、资产引用、Profile Capability、计划时长、Visual Beat timing、Generation Context 与 Provider 在线状态。
- Ready Task 加入队列时会追加不可变 Job 快照，保存当时的 Task 内容、Final Prompt、Assets、Profile、Params 与 Context；已有 Job / Result 历史不被改写。
- Task 内容、Profile 或资产变化会将相关 Context Link 标记为 Stale；上游 Primary Result 变化同样传播 Context Stale。
- Inspector 已将 Task 内部 Visual Beats、Story Order 邻接与 Task 间 Generation Context 分区显示，并提供更新 Context、保留现有 Result、重编 AI Prompt、从当前 Task 向后重新生成等显式操作。
- Provider 离线状态已接入 Ready 与 Queue 流程；离线时显示可操作阻塞原因，单任务和批量入队均不会静默执行。
- 新增 Result Review 工作区，按完整 Generation Task 审核 Result，支持 Pending / Approved / Rejected 筛选、预览、通过、拒绝、批量通过、重新生成、编辑 Task 与历史查看。
- Result 保持归属 Job / Task；多镜头 Task 的 Result 只显示为一份完整结果，不按 Visual Beat 伪造多个 Shot Result。
- Set Primary 保留旧 Result 与不可变 Job 历史，并将引用旧 Primary 的下游 Generation Context 明确标记为 Stale；返回编辑会按稳定 Task ID 选中原卡片。
- 新增 Story Reel，严格按 `TaskStoryboardPlacement` 的 Story Order 预览；素材优先级为 Primary Task Result → Task Storyboard Frame → Placeholder。
- Story Reel 仅提供 Play / Pause、Previous / Next Task、Jump to Task、Current Task 与 Planned Duration；多镜头 Task Result 作为一个完整 Reel 项播放，未引入时间线、多轨、Trim、转场或关键帧控件。
- 新增 `StoryboardRepository` 契约与 `MockStoryboardRepository`，覆盖 Scene、Task Placement、Task、Visual Beats、Assets、Prompt、Context、Job、Result 与 Primary Result 的完整 Mock Repository API。
- Repository 所有读写边界使用防御性副本；Task 后续编辑不会污染已提交 Job 的内容、Prompt、资产、Profile、参数或 Context 快照。
- Repository 的 Story Order 操作只改变 Placement；已有 Task、Job、Result 与 Context 端点不被重写，受影响的 Context Link 以明确 Stale 列表进入复核。
- 高密度 Mock 增加极长标题，并与空 Scene、36 Tasks、单/多镜头 Task、Ready、Running、Failed、Context Stale 一同进入桌面端和移动端回归。

### Gate S0–S12 / V0.2 Freeze 验证

- 83 个 Vitest 测试全部通过，无未处理异步异常，其中 7 个专门验证 Mock Repository Contract。
- 66 个桌面端 / 移动端 Playwright 测试通过；桌面专属的密度与 HTML Drag 用例共 2 个在移动端按预期跳过。
- 浏览器密度用例验证 36 Task Cards，并覆盖 1366×768、1600×900、1920×1080 三档目标视口与页面级无横向溢出。
- 人工检查 1440×900 与 390×844；Ready、Queue、Prompt / Job、Story Order、Generation Context、Result Review 与 Story Reel 信息层级清楚，移动端无页面级横向溢出。
- 使用项目 `.venv` 运行 `scripts/verify.py --full`，后端 lint、后端测试、前端类型检查、83 个前端测试、生产构建、66 个桌面/移动 E2E 共 6 阶段全部通过。
- 当前 V0.2 未变更真实 Video Generation Provider；因此没有触发 ComfyUI / GPU Hardware Smoke，真实生成链路仍属于后续 Provider 接入阶段。

### 下一目标

- V0.2 Storyboard-style Task Workspace 已冻结；下一阶段应在保持 Task-first Contract 的前提下，将 Mock Repository 替换为真实 Core / SQLite 持久化，再接入独立的 Prompt Provider 与 ComfyUI Video Generation Provider。

## 2026-09-12 · Phase 0 完成，Phase 1 Task Composer 可交互原型

### 当前状态

项目已完成基础工程建设，并进入 Phase 1 UI 可交互原型阶段。任务工作区和 Prompt 编辑主链路已经可以在 `/dev/ui` 中运行；当前业务数据仍为本地 Mock，尚未接入真实数据库、Provider 或 ComfyUI 执行链路。

### 已完成

#### 工程与运行基础

- 建立 React、TypeScript、Vite 前端工程。
- 建立 Tauri 2 桌面应用骨架。
- 建立 FastAPI 后端骨架和健康检查。
- 接入并锁定 Terry React UI Library 版本。
- 建立 Windows PowerShell 7、Python、前端、浏览器端和 Tauri 验收流程。
- 参考 Rulesmd_editor 新增根目录 `启动项目.bat`，通过系统默认 PowerShell 调用 `scripts/start-dev.ps1`。
- 启动脚本会检查 Node.js、pnpm、Rust/Cargo、前端依赖指纹和 Tauri 工程，然后直接打开 Tauri 桌面开发窗口。
- `Start-UI.bat` 与 `启动 ShotMill UI.bat` 保留为同一桌面启动流程的兼容别名；`Start-UI.ps1` 保留为浏览器调试入口。

#### App Shell 与任务工作区

- 完成左侧主导航、项目顶部栏、任务卡片列表和状态展示。
- 完成任务搜索和状态筛选。
- 完成 Ctrl 多选、Shift 连续多选和批量操作栏。
- 完成任务复制与连续创建入口。
- 完成桌面端和移动端响应式布局。

#### 统一 Overlay 系统

- 完成 Dialog、Select、Popover、Tooltip、Context Menu、Toast 和 Fullscreen Preview。
- Overlay 统一挂载到 Portal 根节点，避免被滚动容器或变换节点裁切。
- 支持视口边缘避让、嵌套关闭顺序和 Escape 操作。

#### Task Composer Mock

- 完成“剧本 / 设置、Prompt、项目资产”三栏编辑界面。
- 包含 Script Source、User Intent、Generation Profile、Previous / Next Context、AI Prompt、Final Prompt、Prompt Revision、Validator、任务资产、保存状态和后台进度 Mock。
- AI Prompt 重新生成不会覆盖人工编辑的 Final Prompt。
- 用 AI Prompt 替换 Final Prompt 前必须显式确认。
- 后台状态刷新不会抢走编辑焦点，也不会重挂载编辑器节点。

#### Final Prompt `@` 资产菜单

- 参考 ComfyUI-TerryXu-nodes 的 H3 提示词编辑器实现 `@` 触发菜单。
- 菜单读取当前任务资产，并按名称、类型和引用名实时过滤。
- 菜单定位到编辑光标附近，并在桌面端和移动端自动避让视口边缘。
- 支持鼠标选择、方向键、Enter、Tab 和 Escape。
- 当前插入 H3 风格引用：`<Subject 1>`、`<Picture 1>`、`<Video 1>`、`<Audio 1>`。

### 验证结果

- 16 个组件与单元测试通过。
- 32 个桌面端和移动端 Playwright 测试通过。
- `scripts/verify.py --full` 六阶段验证全部通过。
- TypeScript 类型检查和前端生产构建通过。
- Tauri Debug 桌面应用构建通过。

### 当前边界

- Asset Library / Asset Picker 仍需实现完整的分类、搜索、多选、预览、确认和取消流程。
- 任务链目前只显示上下文摘要，尚未形成完整交互。
- Project、Scene、Task、Prompt Revision、Job、Result 等数据仍未接入持久化模型。
- `G:\AIGC\ComfyUI_Codex` 尚未接入工作流发现、参数映射、提交、进度监听和结果回收。
- 真实生成 Provider、失败重试、取消任务、历史结果和导出仍待开发。

### 下一步建议

1. 完成 T1.6 Asset Library / Asset Picker Mock。
2. 完成 T1.7 Task Chain / Context Mock。
3. 固化上述 UI 的交互与视觉回归测试。
4. 进入 Phase 2 数据模型、持久化和 ComfyUI 执行链路。
