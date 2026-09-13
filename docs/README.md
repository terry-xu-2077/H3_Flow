# ShotMill 文档索引

ShotMill 的开发文档按职责拆分，避免单个文档无限膨胀。开发者 / Codex 应按任务读取必要文档。

## 当前开发任务

- [V0.3 Backend Foundation 开发任务](./V0.3_BACKEND_FOUNDATION_DEVELOPMENT_TASKS.md)  
  **当前后端主执行清单。** 负责把现有 FastAPI 空壳升级为正式模块化单体后端，按 B0-B7 落地 SQLite / Repository、Project / Asset / Task、Frontend Adapter、AI Prompt Enhancement、Job / Result、ComfyUI Provider 和 Runtime Events。开始真实后端开发前必须先读此文档。

## 当前必须优先阅读

- [AI 提示词增强专项架构](./AI_PROMPT_ENHANCEMENT_ARCHITECTURE.md)  
  **AI Prompt Enhancement 的长期最高优先级架构文档。** 定义真实多模态输入、可选项目背景、可选上一任务摘要、H3 / Seedance 独立 Skill、Provider 媒体适配、revision 与 Capability。凡涉及 AI 提示词增强实现，优先读此文档。

- [V0.8 AI 提示词增强与历史版本 UI 规范](./UI_V0.8_AI_PROMPT_ENHANCEMENT.md)  
  定义 AI 增强历史下拉、空状态、可重复增强、Prompt Source 和用户 / AI 版本选择。涉及 UI 时读此文档；增强后端输入语义以专项架构为准。

- [V0.8 后端适配：AI 提示词增强与历史版本](./V0.8_BACKEND_AI_PROMPT_ENHANCEMENT.md)  
  **V0.8 版本增量。** 说明历史版本和现有前端过渡字段。长期实现以 AI 提示词增强专项架构为准。

- [V0.6 项目配置与 H3 提示词编辑规范](./UI_V0.6_PROJECT_CONFIG_H3_EDITOR.md)  
  **当前涉及项目工作台顶部、项目配置、结果播放和 H3 提示词双模式的基础文档。** 定义返回首页、项目配置、卡片/列表共用工具栏、Result 播放，以及用户/AI 提示词各自的可视化/文本模式。

- [V0.6 后端适配增量](./V0.6_BACKEND_DELTA.md)  
  **V0.5 Frontend Adapter 的增量。** 定义项目简介、AI 项目背景开关、项目资产 CRUD、Task Prompt Source、H3 编辑器偏好和 Result 播放数据。

- [V0.5 Terry导演工作台 UI 基线](./UI_V0.5_PROJECT_WORKSPACE.md)  
  定义项目首页、项目工作台、列表 / 卡片双视图、右侧只读栏、底部状态栏和任务编辑弹窗的总体结构。未被后续版本覆盖的规则继续有效。

- [V0.5 任务编辑窗细化规范](./UI_V0.5_TASK_EDITOR_REFINEMENT.md)  
  定义任务标题区、紧凑生成参数、片段承接区间、固定少量候选项使用分段控件，以及下拉菜单宽度规则。

- [V0.5 后端适配新前端方案](./V0.5_BACKEND_FRONTEND_ADAPTER.md)  
  后端 Frontend Adapter 基线。ProjectSummary、ProjectWorkspaceView、TaskSummary、TaskEditorView、Runtime、推荐 API、SSE 和 Gateway 仍然有效；V0.3 负责将这些契约真正落入后端代码。

- [Director Mode UI 开发规范](./UI_DIRECTOR_MODE_GUIDE.md)  
  保留“查看与编辑分离、右侧只读、任务编辑使用悬浮窗、防参数墙、全中文”等通用规则。

## 领域与架构文档

- [Storyboard-style Task Workspace 数据模型](./STORYBOARD_TASK_MODEL.md)  
  核心领域模型。`GenerationTask`、Story Order、Context、Job、Result 等内部关系仍然有效，即使当前 UI 不直接展示这些概念。

- [产品与架构规划](./ShotMill_产品与架构规划.md)  
  产品边界、Provider 架构、Task / Job / Result、Context、Queue、Remote Monitor、整体技术方向。

- [UI / UX 开发规范](./UI_UX_SPEC.md)  
  通用视觉、Overlay、可访问性、开发模式与视觉回归基础协议。

- [测试策略](./TEST_STRATEGY.md)  
  Unit / Integration / Contract / E2E / Hardware Smoke、Fake Provider、故障注入和回归策略。

## 历史开发任务

- [V0.2 Storyboard-style Task Workspace 开发任务](./V0.2_STORYBOARD_DEVELOPMENT_TASKS.md)  
  已完成能力与领域回归基线。旧三栏 / Storyboard 默认界面不得覆盖当前 UI 决策。

- [V0.1 第一版开发任务](./V0.1_DEVELOPMENT_TASKS.md)  
  第一版基础工程与总体 Phase，仅保留未被后续版本覆盖的内容。

- [开发记录](./DEVELOPMENT_LOG.md)  
  已实际完成的功能、验证结果和历史记录。

---

# 当前产品心智

默认产品结构固定为：

```text
项目首页
  ↓ 选择 / 新建项目
项目工作台
  ├─ 返回首页
  ├─ 项目配置
  ├─ 列表模式
  ├─ 卡片模式
  ├─ 共用新建任务工具栏
  ├─ 右侧只读信息 / Result 预览
  └─ 底部运行状态
       ↓ 双击 / 右键 / 新建任务
任务编辑弹窗
       ├─ 用户 / AI增强提示词来源
       ├─ 可视化 / 文本显示模式
       └─ AI增强历史 / 可重复增强
```

不再使用 `故事板 / 生成 / 素材` 作为三个默认一级页面。

底层领域关系仍然满足：

```text
GenerationTask 可包含 1..N Visual Beats
Story Order 与 Generation Context 独立
Task 是可变生产意图
Job 是不可变执行快照
Result 属于 Job / Task 历史
```

这些内部关系不能直接决定默认 UI 信息架构。

---

# 当前后端实施顺序

```text
V0.3_BACKEND_FOUNDATION_DEVELOPMENT_TASKS
   ↓
B0 Backend Skeleton
   ↓
B1 SQLite + Repository
   ↓
B2 Project / Asset / Task
   ↓
B3 Frontend Adapter / Read Model
   ↓
B4 AI Prompt Enhancement
   ↓
B5 Job / Result
   ↓
B6 ComfyUI Video Provider
   ↓
B7 Runtime Events / Queue Basics
```

在 B0-B3 未稳定前，不应把真实 Provider / Queue / 数据库逻辑直接绑进 React 组件。

AI 提示词增强实现优先遵守：

```text
AI_PROMPT_ENHANCEMENT_ARCHITECTURE
   ↓
V0.8_BACKEND_AI_PROMPT_ENHANCEMENT（版本迁移）
   ↓
V0.6_BACKEND_DELTA
   ↓
V0.5_BACKEND_FRONTEND_ADAPTER
```

---

# 文档冲突优先级

发生冲突时：

1. 明确的新需求 / 最新决策；
2. **`V0.3_BACKEND_FOUNDATION_DEVELOPMENT_TASKS.md`：当前后端开发执行顺序、Gate 与 Freeze 标准；**
3. **`AI_PROMPT_ENHANCEMENT_ARCHITECTURE.md`：AI 提示词增强输入、媒体、上下文、Skill、Provider 与 revision 架构；**
4. `UI_V0.8_AI_PROMPT_ENHANCEMENT.md`：AI 增强 UI、历史、Prompt Source；
5. `UI_V0.6_PROJECT_CONFIG_H3_EDITOR.md`：项目工作台顶部、项目配置、H3 Prompt 与 Result；
6. `UI_V0.5_PROJECT_WORKSPACE.md`：总体页面结构与交互；
7. `UI_V0.5_TASK_EDITOR_REFINEMENT.md`：任务配置、Context、控件细化；
8. `V0.8_BACKEND_AI_PROMPT_ENHANCEMENT.md` + `V0.6_BACKEND_DELTA.md` + `V0.5_BACKEND_FRONTEND_ADAPTER.md`：版本适配和前后端边界；
9. `UI_DIRECTOR_MODE_GUIDE.md`：查看/编辑分离、防参数墙、用户术语等未冲突规则；
10. `STORYBOARD_TASK_MODEL.md`：领域关系；
11. `UI_UX_SPEC.md`：通用 UI 行为；
12. `TEST_STRATEGY.md`：测试与验收；
13. `ShotMill_产品与架构规划.md`：其他核心架构；
14. V0.2 / V0.1：历史能力基线。

根目录 `AGENTS.md` 保持为轻量开发导航。
