# H3 Flow 测试策略

> 状态：规划阶段  
> 最后更新：2026-09-11

本文件定义 H3 Flow 的自动测试、回归测试、故障注入和 Codex 验收原则。

目标不是追求形式上的测试覆盖率，而是让以下行为能够被机器持续验证：

- 批量任务可稳定运行
- Provider 可替换
- Scheduler 可恢复
- Task Chain / Context 不因异常进入错误状态
- Bug 修复后不再复发
- Codex 能在最少人工干预下完成“实现 → 测试 → 修复 → 验收”闭环

---

## 1. 总体测试金字塔

```text
                 Hardware Smoke
                      ▲
                    E2E
                      ▲
           Integration / Contract
                      ▲
                 Unit Tests
```

常规开发以 Unit + Integration + Contract 为主。

真实 GPU / ComfyUI / 视频模型只在必要时做 Hardware Smoke，不应成为日常回归测试的依赖。

---

## 2. Unit Tests

后端：`pytest`  
前端：`Vitest + React Testing Library`

重点覆盖：

- Task 状态转换
- Task 复制 / 插入 / 继承参数
- Asset 项目隔离和路径处理
- Prompt Revision
- Validator
- ContextLink
- Context Stale
- Primary Result
- Queue 优先级
- Scheduler DAG 计算
- Provider Capability 匹配
- Generation Profile 参数校验
- 数据库 CRUD / migration

Unit Tests 应快速、确定、无网络、无真实模型依赖。

---

## 3. Integration Tests

验证跨模块行为：

```text
Task
→ Ready Validation
→ Queue
→ Scheduler
→ Provider
→ Job
→ Result
→ Context / Downstream Task
```

重点验证：

- 多任务批量执行
- Task Chain 依赖
- 上游失败 / 下游阻塞
- Retry
- Cancel
- Pause / Resume
- App 重启恢复
- Provider 重连
- Result 回收
- Primary Result 替换
- Context Stale

Integration Tests 默认使用 Fake Provider，不依赖真实 GPU。

---

## 4. Provider Contract Tests

所有 Prompt Provider 和 Video Generation Provider 必须通过统一契约测试。

### Prompt Provider Contract

至少验证：

- capability declaration
- text input
- multimodal input（按 capability）
- system context
- structured output（若支持）
- timeout
- authentication error normalization
- invalid response handling
- cancellation（若支持）

### Video Generation Provider Contract

至少验证：

- capability declaration
- validate task
- submit job
- status / progress
- cancel
- collect result
- timeout
- provider unavailable
- duplicate completion event
- unknown remote job id
- context export / continuation（按 capability）

新增 Provider 时，不允许只做人工验证。

---

## 5. Fake Provider

测试基础设施必须包含：

```text
FakePromptProvider
FakeVideoProvider
```

Fake Video Provider 可配置：

- immediate_success
- delayed_success
- fail_at_progress
- fail_once_then_success
- disconnect
- timeout
- cancel_success
- cancel_race_with_complete
- duplicate_complete_event
- unknown_job
- no_context_support
- last_frame_only
- latent_context_supported
- audio_context_supported

Fake Provider 应输出可预测结果，便于断言 Scheduler / Job / Result 状态。

---

## 6. Failure Injection

必须主动测试异常状态，而不是只覆盖 Happy Path。

第一批场景：

```text
FS-001 Provider 在 60% 断线
FS-002 H3 Flow 在 Running Job 中退出并重启
FS-003 Provider 重启后远端 Job 仍存在
FS-004 Provider 重启后远端 Job 丢失
FS-005 Result 已生成但回调丢失
FS-006 duplicate completed event
FS-007 cancel 与 completed 同时发生
FS-008 Asset 文件被移动 / 删除
FS-009 上游 Task 失败，下游等待
FS-010 上游 Primary Result 替换，产生 Context Stale
FS-011 数据库 migration 失败
FS-012 输出文件写入失败
FS-013 磁盘空间不足
FS-014 Provider 返回非法 payload
FS-015 API timeout / rate limit
```

每个正式发现的生产 Bug 都应增加新的永久场景编号。

---

## 7. E2E

使用 Playwright。

默认启动：

```text
H3 Flow Backend
+ Desktop React
+ Mobile React
+ Fake Providers
```

核心桌面 E2E：

```text
创建项目
→ 导入资产
→ 创建两个 Task
→ 配置 Context Link
→ 生成 Prompt
→ Ready
→ 批量生成
→ 等待结果
→ 标记通过
→ 修改第二个 Task
→ 再生成
→ 设为 Primary Result
→ 导出
```

核心手机 E2E：

```text
打开 Remote Monitor
→ 认证 / 配对
→ 查看任务进度
→ 查看生成结果
→ 标记通过
→ 重新排队失败任务
```

移动端优先使用 Playwright viewport 自动回归，真实手机只做阶段性体验测试。

---

## 8. Hardware Smoke

真实模型测试不进入每次开发循环。

发布前或 Provider Adapter 有重大修改时执行：

### ComfyUI / 当前视频模型

- 生成一个独立 Task
- 生成一条两段连续 Task Chain
- 验证视频文件存在
- 验证可解码
- 验证基本时长 / 分辨率
- 验证 Job / Result 元数据
- 验证 Context Cache（若 Provider 支持）

### Prompt Provider

- 本地 VLM Smoke
- 一个 OpenAI-compatible API Smoke
- 多模态输入 Smoke

生成质量和美术判断仍由人工完成。

---

## 9. Regression Test First

Bug 修复默认流程：

```text
1. 写可复现 Bug 的自动测试
2. 确认测试失败
3. 修代码
4. 确认该测试通过
5. 运行相关 Integration / Contract / E2E
6. 保留测试永久参与回归
```

禁止：

- 删除有效测试来通过验收
- 弱化断言掩盖 Bug
- 将真实错误改为静默忽略
- 用 sleep / 超长 timeout 掩盖 race condition

---

## 10. 验收命令

计划统一入口：

```text
python scripts/verify.py
```

建议支持：

```text
python scripts/verify.py --area backend
python scripts/verify.py --area scheduler
python scripts/verify.py --area providers
python scripts/verify.py --area frontend
python scripts/verify.py --area e2e
python scripts/verify.py --area mobile
python scripts/verify.py --full
```

开发中运行 targeted verification。

目标完成前运行与改动风险相匹配的最终验收。

发布前运行 `--full` + Hardware Smoke。

---

## 11. Codex 开发规则

未来根目录 `AGENTS.md` 至少应包含以下原则：

1. 使用完成任务所需的最小仓库上下文。
2. 已知所属模块时不要扫描无关目录。
3. 修改前先读取对应 Contract / Tests / 架构文档。
4. 修改业务逻辑必须补测试。
5. 修 Bug 必须补回归测试。
6. Provider 变化必须跑 Contract Tests。
7. UI 行为变化运行对应 E2E。
8. 开发过程中优先 targeted tests。
9. 完成前运行规定的 verify 命令。
10. 不得通过删除或弱化测试规避失败。
11. 无法执行的测试必须在最终报告中明确说明。

---

## 12. Token / AI 开发成本控制

测试体系本身也是 Token 优化基础设施。

原则：

- 用确定性的测试结果代替 AI 反复推演。
- 用 Fake Provider 代替每次分析 ComfyUI / GPU 长日志。
- 用 Contract Tests 快速确定 Provider 行为是否合格。
- 日志采用结构化错误码，原始长日志按需读取。
- 模块职责保持小而清晰。
- `AGENTS.md` 作为导航，不重复整个项目文档。
- 架构文档按主题拆分，Codex 按需读取。
- 开发期间不无脑执行 Full Suite。
- 用户 Prompt 只描述目标和体验，不重复项目背景。

示例目标：

```text
修复 Scheduler 在应用重启后 Running Job 不恢复的问题。
先增加回归测试，遵循现有 Scheduler 状态机，完成相关验收。
```

而不是在每次目标里重新解释整个 H3 Flow 架构。

---

## 13. Definition of Done

一个 Codex 目标默认只有在以下条件满足后才算完成：

- 行为符合需求
- 架构边界未被破坏
- 新业务逻辑有自动测试
- Bug 有回归测试
- 相关 Contract Test 通过
- 相关 E2E 通过
- typecheck / lint / migration 检查通过
- targeted verification 通过
- 高风险改动按要求运行 full verification
- 未执行项和残余风险被明确报告

最终目标是：

> 将“重复测试、复现异常、验证修复”尽可能交给机器，把人工时间集中在产品行为、交互体验和生成质量判断上。
