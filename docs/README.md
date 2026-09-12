# ShotMill 文档索引

ShotMill 的开发文档按职责拆分，避免单个文档无限膨胀。Codex / 开发者应按任务只读取必要文档。

## 核心文档

- [开发记录](./DEVELOPMENT_LOG.md)  
  已实际完成的功能、验证结果、当前边界与下一步建议；最新记录置顶。

- [Storyboard / Generation Task 数据模型](./STORYBOARD_TASK_MODEL.md)  
  **Storyboard 阶段的核心领域模型。** 明确 `Shot != Task`，Generation Task 可覆盖多个 Shot，Story Order、Generation Grouping、Generation Context 三层独立，并定义 TaskShotBinding 与 ResultShotSpan。涉及 Storyboard / Task / Result / Context 的开发必须先读本文。

- [V0.2 Storyboard 开发任务](./V0.2_STORYBOARD_DEVELOPMENT_TASKS.md)  
  **当前下一阶段的主执行清单。** 目标是完整 Storyboard Workspace，并支持多个 Storyboard Shot 组合为一次 Generation Task、Task Band / Grouping、Multi-shot Prompt Composer、Result → 多 Shot 映射与 Story Reel。

- [V0.1 第一版开发任务](./V0.1_DEVELOPMENT_TASKS.md)  
  第一版基础工程、`/dev/ui`、Task Composer、Provider / Core 等总体开发清单；V0.2 在其 UI 原型基础上继续演进。早期将 Task / Shot 并列表述的部分不得用于推导一一对应关系。

- [产品与架构规划](./ShotMill_产品与架构规划.md)  
  产品边界、Provider 架构、Task / Job / Result、Context、Queue、Remote Monitor、整体技术方向。若其中早期 `Task / Shot` 表述与 `STORYBOARD_TASK_MODEL.md` 冲突，以后者为准。

- [UI / UX 开发规范](./UI_UX_SPEC.md)  
  **前端实现的正式交互协议。** 包含视觉气质、全局交互规则、Overlay、Task Workspace、Task Composer、Asset Picker、Result Review、Mobile Monitor，以及 `/dev/ui` 无真实后端的 UI 开发模式、Playwright 与视觉回归策略。

- [测试策略](./TEST_STRATEGY.md)  
  Unit / Integration / Contract / E2E / Hardware Smoke、Fake Provider、故障注入、Regression Test First 与 Codex 自动验收原则。

## UI 开发约定

前端开发必须遵循以下顺序：

```text
Domain Contract
   ↓
UI_UX_SPEC
   ↓
/dev/ui + Mock Data
   ↓
人工打磨视觉与交互手感
   ↓
Playwright / Visual Regression 固化
   ↓
接入真实 Backend / Provider
```

Storyboard 阶段必须先确认：

```text
Story Order
Generation Grouping
Generation Context
```

三层关系没有被混写，再开始复杂 UI。

基础交互尚未在 `/dev/ui` 中稳定前，不应把大量真实后端逻辑绑死到 UI 组件。

当前 Storyboard 阶段优先按 `V0.2_STORYBOARD_DEVELOPMENT_TASKS.md` 推进；Scene / Shot、Task Grouping、Continuity、Result Mapping 先通过 Mock Repository 验证，再进入真实 Core / SQLite / Provider 接入。

用户主要负责可见的视觉、信息密度与操作“手感”；后端、Provider、Scheduler、数据库、恢复逻辑等不可见部分主要通过测试策略和 Codex 闭环开发验证。

## 文档优先级

发生冲突时：

1. 明确的新需求 / 最新决策优先。
2. Storyboard / Task / Result / Context 领域关系以 `STORYBOARD_TASK_MODEL.md` 为准。
3. UI 行为以 `UI_UX_SPEC.md` 为准。
4. 测试和验收以 `TEST_STRATEGY.md` 为准。
5. 产品边界和其他核心架构以 `ShotMill_产品与架构规划.md` 为准。
6. 当前 Storyboard 开发顺序和 Gate 以 `V0.2_STORYBOARD_DEVELOPMENT_TASKS.md` 为准。
7. V0.1 尚未被 V0.2 覆盖的基础任务仍以 `V0.1_DEVELOPMENT_TASKS.md` 为准。

根目录 `AGENTS.md` 应保持为轻量开发导航，避免 Codex 每次扫描整个仓库和所有文档。
