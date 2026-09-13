# ShotMill 文档索引

ShotMill 的开发文档按职责拆分，避免单个文档无限膨胀。Codex / 开发者应按任务只读取必要文档。

## 核心文档

- [开发记录](./DEVELOPMENT_LOG.md)  
  已实际完成的功能、验证结果、当前边界与下一步建议；最新记录置顶。

- [Storyboard-style Task Workspace 数据模型](./STORYBOARD_TASK_MODEL.md)
  **Storyboard 阶段的核心领域模型。** 明确 `1 Storyboard Card = 1 GenerationTask`；Storyboard 是分镜式 Task 交互，不是独立 Shot 工具；一个 Task 可在内部描述多个镜头 / 视觉节拍。涉及 Storyboard / Task / Result / Context 的开发必须先读本文。

- [V0.2 Storyboard-style Task Workspace 开发任务](./V0.2_STORYBOARD_DEVELOPMENT_TASKS.md)
  **已完成 V0.2 Freeze 的领域与能力回归基线。** 以画面化 Task Cards 完成故事排序、Multi-shot Prompt Composer、Result Review、Context 与 Story Reel；不建立 Shot Card + Task Band 双层主界面。V0.3 继续复用这些能力，但不再要求把全部能力暴露在默认 UI。

- [V0.1 第一版开发任务](./V0.1_DEVELOPMENT_TASKS.md)  
  第一版基础工程、`/dev/ui`、Task Composer、Provider / Core 等总体开发清单；V0.2 在其 UI 原型基础上继续演进。早期将 Task / Shot 并列表述的部分不得用于推导一一对应关系。

- [产品与架构规划](./ShotMill_产品与架构规划.md)  
  产品边界、Provider 架构、Task / Job / Result、Context、Queue、Remote Monitor、整体技术方向。若其中早期 `Task / Shot` 表述与 `STORYBOARD_TASK_MODEL.md` 冲突，以后者为准。

- [UI / UX 开发规范](./UI_UX_SPEC.md)  
  **前端实现的通用交互协议。** 包含视觉气质、全局交互规则、Overlay、基础 Workspace、Task Composer、Asset Picker、Result Review、Mobile Monitor，以及 `/dev/ui` 无真实后端的 UI 开发模式、Playwright 与视觉回归策略。

- [Director Mode UI 开发规范](./UI_DIRECTOR_MODE_GUIDE.md)  
  **V0.3 起的默认信息架构与防参数堆砌强制规则。** 规定一级导航、单主画布、分镜卡信息预算、简单详情边界、三级 Progressive Disclosure、用户术语映射，以及 UI Code Review 清单。凡是决定“哪些字段 / 按钮可以出现在首屏”的任务必须先读本文。

- [测试策略](./TEST_STRATEGY.md)  
  Unit / Integration / Contract / E2E / Hardware Smoke、Fake Provider、故障注入、Regression Test First 与 Codex 自动验收原则。

## UI 开发约定

前端开发必须遵循以下顺序：

```text
Domain Contract
   ↓
UI_DIRECTOR_MODE_GUIDE + UI_UX_SPEC
   ↓
/dev/ui + Mock Data
   ↓
人工打磨视觉与交互手感
   ↓
Playwright / Visual Regression 固化
   ↓
接入真实 Backend / Provider
```

V0.3 默认用户心智固定为：

```text
剧本 → 故事板 → 生成 → 看结果 / 局部返工
```

一级工作区固定围绕：

```text
故事板 / 生成 / 素材
```

Storyboard 的领域关系仍必须满足：

```text
1 Card = 1 GenerationTask
Task 内可有 1..N Visual Beats
Story Order 与 Generation Context 独立
```

但这些内部关系不等于用户必须在首屏看到 `GenerationTask / VisualBeat / ContextLink / Job / Profile / Validation` 等工程概念。默认 UI 必须按 `UI_DIRECTOR_MODE_GUIDE.md` 做信息分层。

基础交互尚未在 `/dev/ui` 中稳定前，不应把大量真实后端逻辑绑死到 UI 组件。

当前前端主线进入 V0.3 Director Mode：V0.2 保留为能力和领域回归基线，默认 UI 则优先降低学习成本、重复编辑入口和参数暴露密度。

用户主要负责可见的视觉、信息密度与操作“手感”；后端、Provider、Scheduler、数据库、恢复逻辑等不可见部分主要通过测试策略和 Codex 闭环开发验证。

## 文档优先级

发生冲突时：

1. 明确的新需求 / 最新决策优先。
2. Storyboard / Task / Result / Context 领域关系以 `STORYBOARD_TASK_MODEL.md` 为准。
3. **首屏信息架构、参数暴露层级、用户术语以 `UI_DIRECTOR_MODE_GUIDE.md` 为准。**
4. 其他 UI 行为与交互基础设施以 `UI_UX_SPEC.md` 为准。
5. 测试和验收以 `TEST_STRATEGY.md` 为准。
6. 产品边界和其他核心架构以 `ShotMill_产品与架构规划.md` 为准。
7. V0.2 作为已完成能力 / 领域回归基线；其旧三栏默认布局不得覆盖 V0.3 Director Mode 最新决策。
8. V0.1 尚未被后续版本覆盖的基础任务仍以 `V0.1_DEVELOPMENT_TASKS.md` 为准。

根目录 `AGENTS.md` 应保持为轻量开发导航，避免 Codex 每次扫描整个仓库和所有文档。
