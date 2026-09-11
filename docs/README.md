# H3 Flow 文档索引

H3 Flow 的开发文档按职责拆分，避免单个文档无限膨胀。Codex / 开发者应按任务只读取必要文档。

## 核心文档

- [产品与架构规划](./H3_Flow_产品与架构规划.md)  
  产品边界、Provider 架构、Task / Job / Result、Context、Queue、Remote Monitor、整体技术方向。

- [UI / UX 开发规范](./UI_UX_SPEC.md)  
  **前端实现的正式交互协议。** 包含视觉气质、全局交互规则、Overlay、Task Workspace、Task Composer、Asset Picker、Result Review、Mobile Monitor，以及 `/dev/ui` 无真实后端的 UI 开发模式、Playwright 与视觉回归策略。

- [测试策略](./TEST_STRATEGY.md)  
  Unit / Integration / Contract / E2E / Hardware Smoke、Fake Provider、故障注入、Regression Test First 与 Codex 自动验收原则。

## UI 开发约定

前端开发必须遵循以下顺序：

```text
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

基础交互尚未在 `/dev/ui` 中稳定前，不应把大量真实后端逻辑绑死到 UI 组件。

用户主要负责可见的视觉、信息密度与操作“手感”；后端、Provider、Scheduler、数据库、恢复逻辑等不可见部分主要通过测试策略和 Codex 闭环开发验证。

## 文档优先级

发生冲突时：

1. 明确的新需求 / 最新决策优先。
2. UI 行为以 `UI_UX_SPEC.md` 为准。
3. 测试和验收以 `TEST_STRATEGY.md` 为准。
4. 产品边界和核心架构以 `H3_Flow_产品与架构规划.md` 为准。

后续落地根目录 `AGENTS.md` 时，应把本页作为文档导航入口，避免 Codex 每次扫描整个仓库和所有文档。
