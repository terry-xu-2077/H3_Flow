# ShotMill 开发记录

本文件记录已经实际完成并通过验证的开发内容。开发顺序和待办仍以 [V0.1 第一版开发任务](./V0.1_DEVELOPMENT_TASKS.md) 为准。

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
- 新增根目录 `Start-UI.ps1`，用于浏览器 UI 热更新或 Tauri 桌面壳开发。

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
