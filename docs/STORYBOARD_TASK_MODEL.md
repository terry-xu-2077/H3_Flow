# ShotMill Storyboard / Generation Task 数据模型

> 状态：架构基线  
> 最后更新：2026-09-12  
> 优先级：本文用于纠正早期文档中可能出现的 `Task / Shot` 一一对应表述；涉及 Storyboard、Task、Job、Result、Context 时以本文为准。

---

## 1. 核心结论

**Storyboard Shot 与 Generation Task 不是同一个对象，也不是固定一一对应。**

MiniMax-H3 当前工作方式允许一次最长约 15 秒的生成任务在 Prompt 中描述多个分镜，因此可能出现：

```text
Storyboard Order
Shot 001 → Shot 002 → Shot 003 → Shot 004 → Shot 005

Generation Grouping
Task A = Shot 001 + Shot 002 + Shot 003
Task B = Shot 004 + Shot 005
```

同时，为了兼容长镜头续接、不同 Provider 的时长限制和未来工作流，底层也不能假设一个 Shot 永远只由一个 Task 生成。

因此 ShotMill 必须把以下三层关系严格分离：

```text
1. Story Order
2. Generation Grouping
3. Generation Context
```

---

## 2. 三层关系

### 2.1 Story Order

表示叙事 / 分镜顺序：

```text
Scene 01
  Shot 001
  Shot 002
  Shot 003
  Shot 004
```

它回答：

> 观众按什么顺序看到这些分镜？

Story Order 属于 Storyboard，不属于生成任务。

---

### 2.2 Generation Grouping

表示哪些 Storyboard Shot 被编译到同一次视频生成 Task 中：

```text
Task A
├─ Shot 001
├─ Shot 002
└─ Shot 003

Task B
├─ Shot 004
└─ Shot 005
```

它回答：

> 这次 Provider 调用要一次生成 Storyboard 中的哪些内容？

Generation Grouping 由以下因素共同决定：

- Generation Profile 的最大时长。
- Provider / Model 是否支持 Prompt 内多镜头。
- Shot planned duration。
- 场景 / 角色连续性。
- 用户手工分组。
- Prompt AI 的建议。

MiniMax-H3 Profile 当前应声明支持单 Task 多 Shot，并由 Profile / Capability 表达最大时长约束；**Core 不得写死 15 秒。**

---

### 2.3 Generation Context

表示 Task 与 Task 之间的生成依赖：

```text
Task A ── Visual / Audio / Latent / Semantic Context ──> Task B
```

它回答：

> Task B 生成时从哪个已生成 Task / Result 续接？

Generation Context 默认定义在 Task 边界，而不是简单定义在相邻 Shot 边界。

Storyboard 的 Previous / Next Shot 仍然可以作为 Prompt AI 的 Semantic Context，但不等于 Provider 的 Generation Context。

---

## 3. 推荐领域对象

### 3.1 StoryboardShot

```text
StoryboardShot
├─ id
├─ scene_id
├─ order_key
├─ number                 # 展示编号，可重算
├─ title
├─ script_source
├─ source_range
├─ user_intent
├─ story_beat
├─ shot_size
├─ camera_movement
├─ planned_duration
├─ storyboard_frame
├─ asset_bindings
└─ continuity_notes
```

StoryboardShot 是创作单位。

它本身不保存唯一 `task_id`。

---

### 3.2 GenerationTask

```text
GenerationTask
├─ id
├─ number
├─ title
├─ generation_profile_id
├─ task_shot_bindings[]
├─ asset_bindings / resolved_assets
├─ ai_prompt
├─ final_prompt
├─ prompt_revisions
├─ generation_params
├─ context_links
├─ state
├─ jobs[]
└─ primary_result_id
```

GenerationTask 是一次可编辑的生成生产单。

一个 Task 可以覆盖一个或多个 Storyboard Shot。

---

### 3.3 TaskShotBinding

不要在 Shot 上放固定 `task_id`，使用独立关联对象：

```text
TaskShotBinding
├─ id
├─ task_id
├─ shot_id
├─ order_in_task
├─ coverage
│  ├─ full
│  └─ partial
├─ planned_start          # 可选，用于 Prompt / Preview，不是 NLE 时间线
├─ planned_end            # 可选
└─ notes
```

这样允许：

```text
1 Task → N Shots
```

也为未来以下情况留出空间：

```text
1 Shot → N Tasks
```

例如：一个连续长镜头超过当前 Generation Profile 单次最大时长，需要通过多个连续 Task 生成。

V0.2 UI 可以优先优化最常见的“连续多个 Shot 合并成一个 Task”，但 Domain Contract 不得把关系限制为一对一。

---

### 3.4 Job

Job 仍然是某次提交的不可变快照：

```text
Job
├─ task_id
├─ task_shot_bindings_snapshot
├─ final_prompt_snapshot
├─ assets_snapshot
├─ generation_profile_snapshot
├─ params_snapshot
├─ context_snapshot
└─ ...
```

即使 Storyboard 之后重新排序、Shot 重新分组，也不能改变历史 Job。

---

### 3.5 Result 与 ResultShotSpan

一个 Result 对应一次 Job 的输出视频，因此一个 Result 可能包含多个 Storyboard Shot。

不要假设：

```text
1 Result = 1 Shot
```

建议：

```text
Result
├─ id
├─ job_id
├─ video
├─ preview
├─ metadata
├─ review_state
└─ shot_spans[]

ResultShotSpan
├─ result_id
├─ shot_id
├─ start_time             # 可为空 / 可估计
├─ end_time               # 可为空 / 可估计
├─ representative_frame   # 可选
└─ confidence / source    # manual / prompt-plan / detected 等，可选
```

V0.2 Mock 阶段不要求精确自动检测实际切镜点，但 Contract 必须允许把一个多镜头生成结果映射回多个 Storyboard Shot。

---

## 4. 状态归属必须分开

### Shot 状态

Storyboard Shot 主要表达创作准备状态，例如：

```text
Draft
Storyboard Ready
Needs Assets
Needs Continuity Review
Covered by Task
Unassigned
```

### Task 状态

生成状态属于 Generation Task：

```text
Draft
Prompt Generating
Prompt Ready
Ready
Queued
Running
Completed
Failed
Blocked
Context Stale
```

因此 UI 不应把 `Running 43%` 直接当作某个 Shot 的唯一状态。

如果一个 Task 覆盖三个 Shot，三个 Shot 可以显示同一个 Task 的生产徽标，但真实运行状态仍归 Task。

---

## 5. Ready 与 Queue

Ready Validation 针对 Generation Task，而不是单个 Storyboard Shot。

推荐工作流：

```text
Storyboard Shots
    ↓
选择连续 Shot
    ↓
创建 / 调整 Generation Task Group
    ↓
Prompt AI 根据 Task 内多个 Shot 编译 Prompt
    ↓
Final Prompt
    ↓
Task Ready
    ↓
Queue
```

Storyboard 中可以提供：

- 自动分组建议。
- 手工 Group Selected Shots。
- Split Task Here。
- Merge Adjacent Tasks。
- Move Shot to Previous / Next Task。
- Unassign from Task。

但任务分组不得破坏 Story Order。

---

## 6. H3 多分镜 Prompt

对于支持 Prompt 内多分镜的 Generation Profile，PromptRequest 应包含结构化 Shot 列表，而不是只有一个“当前镜头”：

```text
PromptRequest
├─ task
├─ shots[]
│  ├─ shot_id
│  ├─ script_source
│  ├─ story_beat
│  ├─ shot_size
│  ├─ camera_movement
│  ├─ planned_duration
│  ├─ assets
│  └─ continuity_notes
├─ previous_task_context
├─ next_story_context
├─ target_generation_profile
└─ output_contract
```

MiniMax-H3 Skill 再把这些结构化信息编译成适合 H3 的多分镜 Prompt。

Core 不直接保存 H3 专属 Prompt 语法。

---

## 7. Storyboard UI 表达

Storyboard 的视觉主对象仍然是 Shot Card。

Generation Task 用“分组层”表达，例如：

```text
Task A · H3 · 12s · READY
┌────────────────────────────────────────────┐
│ [Shot 001] [Shot 002] [Shot 003]          │
└────────────────────────────────────────────┘

Task B · H3 · 9s · DRAFT
┌──────────────────────────────┐
│ [Shot 004] [Shot 005]       │
└──────────────────────────────┘
```

可以使用：

- 顶部 Task Band。
- Shot 卡片上方连续括号 / 色带。
- Task 边界分隔线。

不要把 Task 再画成另一套与 Shot 卡片竞争的巨大卡片。

用户应能一眼看出：

1. Storyboard 一共有多少 Shot。
2. 哪些 Shot 被组合到同一个生成 Task。
3. Task 的总计划时长。
4. Task 是否 Ready / Running / Failed。
5. Task 与下一个 Task 的 Context 关系。

---

## 8. Storyboard 重排与 Task 分组

重排 Shot 时必须区分两种操作：

### 8.1 只改变 Story Order

用户拖动 Shot 改变叙事顺序。

如果该 Shot 已被某个 Task 覆盖，系统不能静默改变历史 Job，也不能默默制造非连续 Task。

应提示：

```text
Storyboard 顺序已改变，生成任务分组需要检查
```

### 8.2 同时调整 Task Grouping

用户可以显式选择：

```text
随 Storyboard 调整当前 Draft Task 分组
```

只允许安全修改尚未产生不可变 Job 的 Draft Task。

已有 Job 的 Task 历史保持不变，需要新 Revision / 新 Task Grouping。

---

## 9. Task Context Stale

至少以下情况触发检查：

- 上游 Task Primary Result 改变。
- Task 分组改变。
- Task 内 Shot 顺序改变。
- Story Order 改变导致 Task 边界语义发生变化。
- Context Link 来源改变。

已有 Result 不自动删除。

用户可选择：

```text
保持现有结果
重编 Prompt
更新 Context
从该 Task 向后重新生成
```

---

## 10. Story Reel

Story Reel 按 **Story Order** 播放，而不是按 Task Card 顺序简单播放完整文件。

当一个 Result 覆盖多个 Shot 时，未来可依据 `ResultShotSpan` 在 Story Reel 中映射到对应 Shot。

V0.2 Mock 阶段如果没有精确 span，可以：

- 使用 Prompt 计划时长估算。
- 或对整个 Task Result 只播放一次，同时高亮其覆盖的多个 Shot。

但 Contract 不得假设一个 Result 只属于一张 Shot 卡。

---

## 11. 架构不变量

以下规则视为强约束：

1. **Shot != Task。**
2. **Task 可以包含多个 Shot。**
3. **Domain 不限制 Shot 只能属于一个历史 Task。**
4. **Story Order != Generation Grouping。**
5. **Generation Grouping != Generation Context。**
6. **Result != Shot Result；一个 Result 可以覆盖多个 Shot。**
7. **生成进度 / Ready / Queue 状态属于 Task。**
8. **Storyboard 创作字段属于 Shot。**
9. **Job 保存 Task 与 Shot 关系的不可变快照。**
10. **H3 的 15 秒和多分镜能力来自 Generation Profile / Capability，不写死在 Core。**
11. **Storyboard 仍不是 NLE。**
