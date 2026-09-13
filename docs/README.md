# ShotMill 文档索引

ShotMill 的开发文档按职责拆分，避免单个文档无限膨胀。开发者 / Codex 应按任务读取必要文档。

## 当前必须优先阅读

- [V0.5 Terry导演工作台 UI 基线](./UI_V0.5_PROJECT_WORKSPACE.md)  
  **当前默认产品 UI 的最高优先级文档。** 定义项目首页、项目工作台、列表 / 卡片双视图、右侧只读栏、底部状态栏、任务编辑弹窗以及“列表模式必须有新建任务按钮”等规则。

- [V0.5 任务编辑窗细化规范](./UI_V0.5_TASK_EDITOR_REFINEMENT.md)  
  **任务编辑弹窗的最新细化规则。** 定义“任务图标 + 可编辑任务名”、片段承接 / 尾帧承接 / 不承接选项卡、承接时长、提示词底栏稳定规则，以及全应用下拉菜单必须匹配触发控件宽度。涉及任务编辑窗或 `PortalSelect` 时优先于 V0.5 主文档中的旧描述。

- [V0.5 后端适配新前端方案](./V0.5_BACKEND_FRONTEND_ADAPTER.md)  
  **真实后端接入 V0.5 前端的契约。** 定义 ProjectSummary、ProjectWorkspaceView、TaskSummary、TaskEditorView、Runtime、推荐 API、SSE、Frontend Adapter / Gateway 和实施顺序。

- [Director Mode UI 开发规范](./UI_DIRECTOR_MODE_GUIDE.md)  
  保留 V0.4 已确认的“查看与编辑分离、右侧只读、任务编辑使用悬浮窗、防参数墙、全中文”等规则。其旧“故事板 / 生成 / 素材”一级导航部分已被 V0.5 文档覆盖。

## 领域与架构文档

- [Storyboard-style Task Workspace 数据模型](./STORYBOARD_TASK_MODEL.md)  
  核心领域模型。`GenerationTask`、Story Order、Context、Job、Result 等内部关系仍然有效，即使 V0.5 UI 不直接展示这些概念。

- [产品与架构规划](./ShotMill_产品与架构规划.md)  
  产品边界、Provider 架构、Task / Job / Result、Context、Queue、Remote Monitor、整体技术方向。

- [UI / UX 开发规范](./UI_UX_SPEC.md)  
  通用视觉、Overlay、可访问性、开发模式与视觉回归基础协议。

- [测试策略](./TEST_STRATEGY.md)  
  Unit / Integration / Contract / E2E / Hardware Smoke、Fake Provider、故障注入和回归策略。

## 历史版本文档

- [V0.2 Storyboard-style Task Workspace 开发任务](./V0.2_STORYBOARD_DEVELOPMENT_TASKS.md)  
  已完成能力与领域回归基线。旧三栏 / Storyboard 默认界面不得覆盖 V0.5 最新 UI 决策。

- [V0.1 第一版开发任务](./V0.1_DEVELOPMENT_TASKS.md)  
  第一版基础工程与总体 Phase，仅保留未被后续版本覆盖的内容。

- [开发记录](./DEVELOPMENT_LOG.md)  
  已实际完成的功能、验证结果和历史记录。

---

# 当前 UI 心智

V0.5 默认产品结构固定为：

```text
项目首页
  ↓ 选择 / 新建项目
项目工作台
  ├─ 列表模式
  ├─ 卡片模式
  ├─ 右侧只读信息栏
  └─ 底部运行状态
       ↓ 双击 / 右键 / 新建任务
任务编辑弹窗
```

不再使用：

```text
故事板 / 生成 / 素材
```

作为三个默认一级页面。

底层领域关系仍然满足：

```text
GenerationTask 可包含 1..N Visual Beats
Story Order 与 Generation Context 独立
Job 是不可变执行快照
Result 属于 Job / Task 历史
```

但这些内部关系不能直接决定默认 UI 信息架构。

---

# UI 开发顺序

```text
Domain Contract
   ↓
UI_V0.5_PROJECT_WORKSPACE
   ↓
UI_V0.5_TASK_EDITOR_REFINEMENT（涉及任务编辑 / 下拉控件时）
   ↓
UI_DIRECTOR_MODE_GUIDE 中未冲突的防参数墙 / 查看编辑分离规则
   ↓
UI_UX_SPEC
   ↓
/dev/ui + Mock Data
   ↓
人工打磨视觉与交互
   ↓
回归测试
   ↓
按 V0.5_BACKEND_FRONTEND_ADAPTER 接真实后端
```

基础 UI 尚未稳定前，不应把真实 Provider / Queue / 数据库逻辑直接绑进 React 组件。

---

# 文档冲突优先级

发生冲突时：

1. 明确的新需求 / 最新决策；
2. **`UI_V0.5_PROJECT_WORKSPACE.md`：当前默认产品页面结构与交互；**
3. **`UI_V0.5_TASK_EDITOR_REFINEMENT.md`：任务编辑窗与通用下拉控件的最新细化；**
4. `V0.5_BACKEND_FRONTEND_ADAPTER.md`：新前端与后端的边界；
5. `UI_DIRECTOR_MODE_GUIDE.md`：查看/编辑分离、防参数墙、用户术语等未冲突规则；
6. `STORYBOARD_TASK_MODEL.md`：领域关系；
7. `UI_UX_SPEC.md`：通用 UI 行为；
8. `TEST_STRATEGY.md`：测试与验收；
9. `ShotMill_产品与架构规划.md`：其他核心架构；
10. V0.2 / V0.1：历史能力基线。

根目录 `AGENTS.md` 保持为轻量开发导航。
