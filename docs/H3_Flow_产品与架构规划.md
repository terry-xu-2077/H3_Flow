# H3 Flow 产品与架构规划

> 状态：产品规划阶段  
> 最后更新：2026-09-11  
> 默认仓库：https://github.com/terry-xu-2077/H3_Flow  
> 核心模型参考：https://github.com/MiniMax-AI/MiniMax-H3

---

## 1. 项目定位

H3 Flow 是一个面向本地 AI 视频生成生产流程的**素材生成平台**。

它不承担剪辑、时间线、字幕、转场、音视频拼接、成片输出等 NLE / 后期功能。项目的核心目标只有一个：

> 把已经准备好的剧本和项目资产，高效地转化为一批可批量生成、可追踪、可修改、可重新生成的视频素材任务。

H3 Flow 的主要使用对象是已经拥有剧本、角色图、场景图、参考视频、音频等资产，需要持续批量生产镜头素材的创作者。

### 1.1 核心体验

理想使用流程：

1. 打开 H3 Flow 项目。
2. 将准备好的剧本逐段创建为生成任务。
3. 为每个任务选择项目资产。
4. 使用本地 Qwen 多模态模型，根据剧本、资产和前后任务上下文自动改写为完整 MiniMax-H3 提示词。
5. 人工快速检查或修改提示词。
6. 重复上述过程，直到一整批任务进入 Ready 状态。
7. 点击“批量生成”。
8. H3 Flow 按任务依赖、队列规则和 ComfyUI 执行状态自动完成生成。
9. 用户可以离开电脑，通过手机查看生成进度。
10. 返回后在结果页快速审核生成素材。
11. 满意的结果标记通过并导出；有问题的任务继续编辑并再次生成。

核心体验应尽量接近：

> 创建生产单 → 一次性开工 → 等待 → 审核 → 局部返工。

用户不应该被迫频繁进入 ComfyUI、重复上传素材、手动拼接工作流或处理大量底层节点参数。

---

## 2. 明确不做的功能

H3 Flow 不计划承担以下能力：

- 视频剪辑时间线
- 多轨编辑
- 自动剪辑
- 转场编辑
- 字幕编辑
- 配音时间线
- 音视频拼接
- 成片包装
- NLE 工具能力

即使未来支持更多模型，也仍然保持“生成素材”的产品边界，而不是向剪辑软件演变。

---

## 3. 核心架构原则

### 3.1 H3 Flow 是 Source of Truth

项目、资产、任务、队列、提示词、结果和上下文关系都由 H3 Flow 管理。

ComfyUI 只作为底层执行器，不作为项目管理中心。

```text
H3 Flow
├─ 项目数据库
├─ 项目资产库
├─ Task / Job / Result
├─ Prompt / Skill
├─ Task Context
├─ Queue / Scheduler
└─ Workflow Preset
        │
        ▼
H3 Flow ComfyUI Bridge
        │
        ▼
ComfyUI Runtime
        │
        ▼
MiniMax-H3 / Qwen / 其他模型
```

这样可以保证未来更新工作流、更换模型、增加 ComfyUI 实例或更换后端时，不破坏项目数据结构。

### 3.2 ComfyUI 不承担资产库和任务数据库

H3 Flow 不应把全部业务逻辑塞进一个 ComfyUI 节点。

更合理的方式是开发一个 `H3 Flow ComfyUI Bridge / H3 Flow Nodes` 插件包，仅负责：

- 接收 H3 Flow 任务
- 解析 H3 Flow 资产 ID
- 获取任务上下文
- 向工作流提供 Prompt 和参数
- 回传生成结果
- 回传必要的连续生成 Context
- 提供 H3 Flow 所需 API / WebSocket 接口

### 3.3 用户不需要理解 ComfyUI 工作流内部结构

H3 Flow 通过 Workflow Preset 与实际 ComfyUI workflow JSON 建立映射。

任务只选择类似：

- H3 Ref2VA Standard
- H3 I2VA Standard
- H3 FL2VA Standard
- H3 Fast Preview
- H3 High Quality

而不是直接保存或编辑几十个节点参数。

---

## 4. 项目隔离

每个 H3 Flow 项目独立管理自己的：

- 资产
- 任务
- Prompt
- 结果
- 任务上下文
- 缓存
- 队列配置
- 项目 Skill / Prompt 规则

默认不跨项目共享资产。

建议的数据结构示意：

```text
Project/
├─ project.db
├─ assets/
│  ├─ images/
│  ├─ videos/
│  └─ audio/
├─ thumbnails/
├─ outputs/
├─ context/
├─ cache/
└─ project-config/
```

业务层引用资产时应优先使用 `asset_id`，而不是到处保存绝对文件路径。

---

## 5. 资产库

### 5.1 目标

素材只需要导入项目一次，之后创建任何任务时都可以直接从资产库选择，不需要重复上传。

### 5.2 资产类型

至少支持：

- 图片
- 视频
- 音频

业务分类可以进一步包括：

- 角色
- 场景
- 道具
- 分镜参考
- 动作参考
- 声音参考
- 其他

### 5.3 Asset 数据建议

```text
Asset
├─ id
├─ name
├─ media_type
├─ category
├─ tags
├─ notes
├─ source_path
├─ hash
├─ thumbnail
├─ width / height
├─ duration
└─ ai_description
```

`ai_description` 可由本地 VLM 在首次导入时生成并缓存，用于后续 Prompt 编写，避免同一资产在几十个任务中被重复完整分析。

### 5.4 资产选择体验

任务编辑时通过项目 Asset Library 直接选择素材，而不是调用传统文件打开窗口。

资产选择器应支持：

- 缩略图
- 分类
- 标签
- 搜索
- 多选
- 最近使用
- 当前任务已选资产

---

## 6. Task：核心业务对象

H3 Flow 应以 Task / Shot 为中心，而不是以 ComfyUI Workflow 为中心。

一个 Task 代表一个待生成素材任务。

```text
Task
├─ 编号 / 名称
├─ 原始剧本片段
├─ 当前创作意图
├─ Assets
├─ H3 模式
├─ 时长
├─ 画幅
├─ Workflow Preset
├─ Prompt
├─ Context
├─ Jobs
└─ Primary Result
```

### 6.1 原始剧本与 Prompt 必须分离

至少应分别保存：

- `script_source`：原始剧本片段
- `user_intent`：当前任务创作要求
- `ai_prompt`：AI 根据剧本生成的 H3 Prompt
- `final_prompt`：人工确认后的最终 Prompt
- `prompt_revision`：版本记录

重新生成 Prompt 时不能覆盖原始剧本，也不能无提示覆盖用户已经手工修改过的最终 Prompt。

### 6.2 快速连续创建任务

因为用户会反复创建几十个任务，任务创建必须是高频、低摩擦操作。

建议支持：

- 新建下一个任务
- 复制上一任务
- 插入任务
- 自动编号
- 继承上一个任务的常用参数
- 继承角色 / 场景资产
- 继承 Workflow Preset
- 继承画幅 / 时长等设置
- 快速清除或替换部分资产

目标是在“粘贴下一段剧本 → 生成 Prompt → 快速确认 → 下一个任务”之间减少无意义操作。

---

## 7. Task 与 Job 必须分离

Task 是长期存在、可不断修改的生成任务。

Job 是某一次真正提交给生成后端的不可变生成快照。

示例：

```text
SHOT 027

Job #001
Prompt v3
Seed 18281
8 sec
→ Failed

Job #002
Prompt v3
Seed 48122
8 sec
→ Result A

Job #003
Prompt v4
Seed 77345
10 sec
→ Result B
```

Job 应记录：

- 当次最终 Prompt
- 当次资产版本
- Workflow Preset
- 模型 / 关键参数
- Seed
- Context 来源
- 提交时间
- 运行状态
- 错误信息
- 输出结果

这样每一个生成视频都可以追溯到准确的生成条件。

---

## 8. Prompt Composer 与本地 Qwen

### 8.1 目标

用户输入的是剧本和创作意图，而不是完整的 H3 技术提示词。

H3 Flow 使用本地 Qwen 多模态模型辅助：

- 理解剧本
- 理解选中的图片 / 视频 / 音频资产
- 读取项目级 Prompt 规则
- 读取前后任务上下文
- 按 MiniMax-H3 规范生成完整 Prompt

参考 ComfyUI 节点：

- https://github.com/lihaoyun6/ComfyUI-llama-cpp_vlm

计划利用其支持系统提示词的能力，将 H3 Prompt 规则作为类似 Skill 的系统上下文。

### 8.2 Prompt 编译与视频生成分离

AI 编写 Prompt 和 H3 视频生成应是两个独立阶段。

```text
剧本 + Assets + Context + Skill
              │
              ▼
            Qwen
              │
              ▼
        H3 Prompt Ready
              │
       人工检查 / 修改
              │
              ▼
          Queue / Render
```

这样可以先批量完成几十个 Prompt，再统一检查，最后一次性开始生成。

### 8.3 Skill 体系

建议正式引入 Skill / Prompt Profile 概念。

例如：

```text
H3 Official Skill
├─ 官方 H3 Prompt 规则
├─ 不同模式规范
└─ H3 Flow 输出规范

Project Skill
├─ 项目视觉规则
├─ 摄影规则
├─ 角色规则
├─ 禁止项
└─ 项目自定义 Prompt 指令
```

最终 System Prompt 由多层内容动态组合，而不是写死为一个不可维护的巨大 Prompt。

---

## 9. Prompt Validator

AI 输出后不能立刻直接进入生成。

H3 Flow 应加入 H3 Prompt Validator，在任务进入 Ready 前自动检查：

- Prompt 是否完整
- H3 模式是否匹配
- Asset Reference 是否存在
- 图片 / 视频 / 音频引用是否合法
- 时长是否合法
- Subject / Picture / Audio 标签是否匹配
- 必要区块是否缺失
- 上下文依赖是否完整

必要时可让 Qwen 自动修复一次。

最终仍然无法通过时，任务应显示明确错误，而不是等 ComfyUI 执行后再失败。

---

## 10. Task Context：任务上下文与连续生成

MiniMax-H3 单次生成时长有限，因此一个较长连续镜头可能需要拆成多个 Task。

H3 Flow 必须将相邻 Task 的连续性作为一等公民设计，而不是简单增加“上一帧”选项。

参考项目：

- https://github.com/j955229/ComfyUI-MiniMax-H3-Motion-Director
- https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context

### 10.1 三层上下文

#### A. Semantic Context

用于 Qwen 编写当前任务 Prompt。

当前任务编写 Prompt 时可读取：

- 上一个任务的剧本意图
- 上一个任务最终 Prompt
- 上一个任务实际结果状态
- 当前任务内容
- 下一个任务计划内容

原则：

> Previous Task 告诉 AI“从哪里接”；Next Task 告诉 AI“当前任务应该往哪里去”。

#### B. Generation Context

用于真正的 H3 连续生成。

优先考虑直接传递 H3 Motion / Latent Context，而不是简单将上一段视频重新解码、截帧、重新编码。

可包含：

- Visual Context
- Audio Context
- Latent Context
- 上一个批准 Result 的相关缓存

#### C. Context Link

上下文关系应定义在 Task A → Task B 的边界，而不完全属于某一个 Task。

```text
Task 12
   │
   │ Context Link
   │ ├─ Semantic ✓
   │ ├─ Visual ✓
   │ └─ Audio ✓
   ▼
Task 13
```

这样可以区分：

- 真正连续的 15 秒分段
- 正常切镜但仍有语义连续性
- 完全独立镜头

### 10.2 Task Chain

正式引入 `Task Chain / 任务链`。

它不是剪辑时间线，而只是描述一组生成任务之间的：

- 顺序
- 上下文
- 依赖
- 连续关系

例如：

```text
01 车辆冲过断层
        │ Visual + Audio + Semantic
        ▼
02 车辆落地继续加速
        │ Visual + Semantic
        ▼
03 驾驶员回头观察
        │ Semantic / Cut
        ▼
04 远景：虫群追赶车辆
```

### 10.3 Previous 与 Next 的区别

Previous Task 可以提供真实生成上下文：

- latent
- audio
- frames
- previous result

Next Task 尚未生成，因此主要作为 Prompt Planning Context 使用。

### 10.4 Primary Result

一个 Task 可能有多个 Result。

必须允许用户指定：

`Primary Result / 主结果`

下游连续任务默认使用上游 Task 的 Primary Result 作为 Context 来源。

### 10.5 Context Stale

如果上游 Task 更换 Primary Result，而下游已经基于旧 Result 生成，则下游应进入：

`Context Stale / 上游上下文已变化`

系统不能偷偷自动覆盖下游结果。

用户可以选择：

- 保持当前结果
- 从该任务开始重新生成后续链路

---

## 11. Queue / Scheduler

### 11.1 多逻辑队列

H3 Flow 支持多个 Queue Lane，例如：

- 正式生成
- 快速测试
- 高质量
- 夜间批量

每个 Queue 可绑定：

- Workflow Preset
- Backend
- 默认模型
- 参数
- Priority
- Concurrency

即使只有一张 GPU，多队列也可以作为逻辑调度结构存在。

### 11.2 Task Chain 形成依赖图

连续任务不能完全并行。

```text
A → B → C
D → E
F
```

调度器可以先启动：

- A
- D
- F

B 必须等待 A 完成并产生有效 Context；C 必须等待 B。

未来增加多台 ComfyUI 或多 GPU Backend 时，这种依赖模型仍然成立。

### 11.3 批量生成必须可恢复

必须考虑：

- 单任务失败不阻塞无依赖的其他任务
- 下游依赖任务进入“等待上游”
- 单任务重试
- 从失败处继续
- 暂停整个队列
- 恢复队列
- 取消任务
- ComfyUI 重启后恢复剩余队列
- H3 Flow 重启后恢复未完成状态

目标是用户点“批量生成”后可以真正离开电脑，而不是持续人工值守。

---

## 12. Task Ready 与批量生成前检查

在进入批量生成前，每个任务应有明确的 Ready 状态。

自动检查至少包括：

- Prompt 已生成
- Prompt Validator 通过
- 必要资产存在
- H3 引用合法
- Context 来源有效
- Workflow Preset 可用
- ComfyUI Backend 在线
- 对应模型可用
- 生成参数合法

只有满足要求的 Task 才能显示为 Ready。

批量生成前应提供总览，例如：

```text
48 Tasks
✓ 44 Ready
! 3 Need Attention
× 1 Missing Asset
```

避免批量运行很久后才暴露基础配置错误。

---

## 13. Result Manager

### 13.1 一个 Task 可以拥有多个结果

重新生成不能覆盖旧结果。

每个 Result 应保留：

- 对应 Job
- Prompt Revision
- Seed
- Workflow Preset
- Context 来源
- 生成时间
- 视频文件
- Preview
- 审核状态

### 13.2 审核体验

批量生成结束后，用户应该进入类似“待审核结果墙”的界面。

每张 Task Card 直接显示：

- 视频预览
- Task 名称
- 当前结果
- 通过
- 重新生成
- 编辑任务

满意的素材快速标记通过，有问题的直接回到任务编辑并再次提交。

### 13.3 导出而不是下载

因为 H3 Flow 是本地应用，生成文件本身已经存在于本机。

桌面端主要概念应使用：

- 导出
- 打开文件位置
- 导出已通过结果

可按规则整理输出：

```text
项目名/
├─ SHOT_001.mp4
├─ SHOT_002.mp4
└─ SHOT_003.mp4
```

手机端如果需要保存到设备，则可以表现为“下载”。

---

## 14. 生产进度视图

批量生成后，主界面需要一个非常直接的生产进度页面，而不是复杂 Dashboard。

例如：

```text
52 个任务
37 完成
2 生成中
11 排队
2 失败
```

应能够快速定位：

- 当前正在生成的任务
- 失败任务
- 等待上游任务
- 已完成待审核任务

---

## 15. 手机 Remote Monitor

H3 Flow 需要提供一个手机可访问的响应式 Web 页面，用于用户离开工作站后查看批量生成状态。

### 15.1 第一阶段定位

手机端不是完整编辑器，而是：

`Remote Monitor / 远程生成监控页`

第一版主要支持：

- 查看整体生成进度
- 查看当前正在运行的 Task
- 查看排队 / 完成 / 失败数量
- 查看最新生成结果
- 手机播放生成视频
- 标记结果“通过”
- 对明显失败结果执行“重新排队”

暂不要求手机端完成复杂的 Prompt 编辑、批量资产选择和任务创建。

### 15.2 访问方式

优先支持同一局域网：

```text
PC H3 Flow Backend
├─ Desktop UI
└─ Mobile Web UI
```

桌面端显示二维码，手机扫码连接。

### 15.3 实时事件

桌面端和手机端应共享同一套事件状态源，例如：

```text
job.started
job.progress
job.completed
job.failed
queue.changed
result.approved
```

建议通过 WebSocket 或 SSE 实时推送，而不是手机不断轮询数据库。

### 15.4 手机连接安全

即使第一版只支持 LAN，也不应开放无认证的控制页面。

可考虑：

- 桌面二维码配对
- 一次性 Token
- 已授权设备长期 Token
- 可在桌面端撤销设备授权

### 15.5 手机视频预览

手机端不应一次加载大量原始高码率生成文件。

应考虑：

- Preview 文件
- Poster / Thumbnail
- 流式播放
- 按需加载

---

## 16. 前端 UI 规范

### 16.1 默认 UI 库

H3 Flow 默认使用：

https://github.com/terry-xu-2077/Terry_React_UI_Library

原则：

> 现有控件和样式优先直接复用；必要时新增通用控件，但必须保持现有 API 与导出路径向后兼容。

原因：该 UI 库当前同时被 RulesMD 编辑器使用。

因此禁止：

- 随意移动现有组件目录
- 修改现有 public export path
- 破坏现有组件 public props
- 为 H3 Flow 私自重构库结构导致 RulesMD Editor 失效

### 16.2 什么进入 Terry React UI Library

通用基础组件可以进入共享 UI Library，例如：

- Card
- ProgressBar
- ProgressRing
- Tabs
- Toast
- Popover
- SegmentedControl
- EmptyState
- 通用媒体预览基础组件

### 16.3 什么留在 H3 Flow

包含业务语义的组件留在 H3 Flow，例如：

- TaskCard
- AssetCard
- GenerationResultCard
- QueuePanel
- PromptComposer
- ContextLink
- TaskChainView
- ProductionMonitor

原则：

> Terry React UI Library 提供积木；H3 Flow 负责产品组合。

### 16.4 UI 风格

整体采用现代卡片式 UI，但避免所有区域都卡片化。

设计原则：

- 中性色为主
- 高饱和颜色只用于状态、高亮、警示
- 不做泛滥的 AI 紫蓝渐变
- 任务缩略图 / 视频画面优先于装饰
- 批量任务保留高密度信息能力
- 重要操作简单直接

---

## 17. 桌面端信息架构方向

打开项目后不建议进入传统 Dashboard。

默认直接进入“任务生产区”。

建议一级导航：

```text
任务
资产
队列 / 生产状态
结果
项目设置
```

辅助区域：

- 当前项目
- ComfyUI 在线状态
- GPU / Backend 状态
- 手机监控入口

### 17.1 Task Card

卡片视觉中心应是参考画面或最新结果。

包含：

- Task 编号
- 简短描述
- 关键资产
- H3 模式
- 时长
- 状态
- Context 状态

快捷操作：

- 编辑
- 生成 Prompt
- 加入队列
- 更多

### 17.2 批量操作

多选任务后出现批量操作栏：

- 生成 Prompt
- 加入队列
- 设置公共参数
- 修改 Workflow Preset
- 删除

### 17.3 Task Composer

任务编辑不建议做成普通长表单。

建议采用创作型布局，例如：

```text
┌────────────┬───────────────────────┬────────────┐
│ 剧本/设置   │       H3 Prompt       │   项目资产  │
│            │                       │            │
│ 原始剧本    │ AI Prompt             │ Character  │
│ 创作意图    │ Final Prompt          │ Scene      │
│ H3 模式     │ Validator             │ Video      │
│ 时长/画幅   │ Revision              │ Audio      │
└────────────┴───────────────────────┴────────────┘
```

---

## 18. ComfyUI Bridge 初步职责

初步可抽象为以下逻辑能力：

### H3 Flow Task Input

提供：

- Task / Job 信息
- Prompt
- 生成参数
- Workflow Preset 参数

### H3 Flow Asset Resolver

负责：

- asset_id → 实际媒体
- 统一图片 / 视频 / 音频引用

### H3 Flow Context

负责：

- Previous Result
- Visual Context
- Audio Context
- Motion / Latent Context
- Context 配置

### H3 Flow Result

负责：

- 回传生成视频
- 回传元数据
- 保存 Preview
- 保存必要的 Context Cache
- 将 Result 关联回 Job / Task

---

## 19. Context Cache

用于连续生成的 latent / motion context 不应污染普通 Asset Library。

建议：

```text
Project/context/
├─ task_001/
│  └─ result_003.*
├─ task_002/
└─ ...
```

这些文件属于内部生成缓存：

- 用户一般无需直接管理
- 与对应 Result 关联
- 删除 Result 时可按规则清理
- 必要时可以重建

---

## 20. 应用整体服务结构

当前推荐方向：

```text
                    H3 FLOW

┌────────────────────────────────────────┐
│              Backend / Core            │
│                                        │
│ Project / Asset / Task / Job / Result │
│ Prompt / Skill / Context              │
│ Queue / Scheduler                     │
│ ComfyUI Bridge                        │
└──────────────────┬─────────────────────┘
                   │ HTTP API
                   │ WebSocket / SSE
        ┌──────────┴──────────┐
        │                     │
   Desktop React         Mobile React
        │                     │
        └── Terry React UI ───┘
```

即使桌面应用未来通过 Tauri 等方式打包，Core 仍应保留本地 HTTP / WebSocket 服务能力，以支持手机 Remote Monitor。

---

## 21. V0.1 建议范围

第一阶段只完成最核心闭环：

```text
Project
  ↓
Asset Library
  ↓
Task Creation
  ↓
Qwen Prompt Composer
  ↓
Task Context
  ↓
Ready Validation
  ↓
Queue / Batch Generate
  ↓
ComfyUI
  ↓
Results
  ↓
Approve / Edit / Regenerate / Export
```

### V0.1 P0

- Project Manager
- Asset Library
- Task Manager
- Task Composer
- Prompt Composer
- H3 Skill Engine
- Prompt Validator
- Task Chain / Context Link
- Job / Result Model
- Queue Manager
- Scheduler
- ComfyUI Bridge
- Workflow Presets
- Result Review
- Export
- Production Monitor
- Mobile Remote Monitor
- Terry React UI Library 集成

### 可后续增加

- 资产 AI 描述缓存优化
- 多 ComfyUI 实例
- 多 GPU Backend
- 更复杂的队列调度
- 大段剧本自动预拆任务
- 更丰富的手机端操作
- 更多生成模型类型

注意：这些扩展仍然必须遵守“素材生成平台”的产品边界。

---

## 22. 后续可考虑的大段剧本自动拆任务

后续可以允许用户一次粘贴较长剧本，由 Qwen 自动给出候选任务拆分：

```text
原始剧本
   ↓
Qwen Shot / Task Planner
   ↓
候选 Task 01
候选 Task 02
候选 Task 03
...
```

但系统不应直接未经人工确认就全部进入生成。

用户仍然可以：

- 调整任务边界
- 修改剧本片段
- 选择资产
- 检查 Prompt
- 确认 Context Link
- 进入 Ready

这项能力的目标只是减少“逐段复制剧本”的重复劳动。

---

## 23. 当前最重要的产品原则

1. **H3 Flow 是素材生成平台，不是剪辑工具。**
2. **H3 Flow 管理项目状态，ComfyUI 只负责执行。**
3. **Task 是核心业务对象，Workflow 只是执行配置。**
4. **Task 与 Job 分离，所有生成结果可追溯。**
5. **资产属于项目，任务通过 Asset ID 复用。**
6. **剧本原文、AI Prompt、最终 Prompt 分离。**
7. **Prompt 编译与 H3 视频生成分离。**
8. **任务上下文和 Task Chain 是核心能力。**
9. **连续生成优先考虑 latent / motion context，而不是简单尾帧拼接。**
10. **批量生成必须可恢复、可重试、可离开电脑无人值守。**
11. **结果审核必须允许快速通过、修改、重新生成。**
12. **手机端用于远程查看生产状态和轻量审核。**
13. **前端统一复用 Terry React UI Library，所有扩展保持向后兼容。**
14. **优先优化每天重复几十次的任务创建流程，而不是堆积功能。**

---

## 24. 下一阶段规划重点

在开始写业务代码之前，建议继续完成以下设计：

1. 桌面端完整信息架构。
2. Task 创建 / 编辑主页面原型。
3. Asset Picker 交互。
4. Task Chain / Context Link 的 UI 表达。
5. 批量任务 Ready 检查流程。
6. Queue / Production Monitor 页面。
7. Result Review 页面。
8. 手机 Remote Monitor 页面。
9. Task / Job / Result / ContextLink / Asset 的数据模型草案。
10. H3 Flow ↔ ComfyUI Bridge API 协议草案。
11. Workflow Preset 格式。
12. Qwen Prompt Skill / Project Skill 的组织方式。

完成这些之后，再进入代码结构和 V0.1 实现阶段。

---

## 25. 参考项目

### MiniMax-H3

https://github.com/MiniMax-AI/MiniMax-H3

### ComfyUI llama.cpp VLM

https://github.com/lihaoyun6/ComfyUI-llama-cpp_vlm

### MiniMax H3 Motion Director

https://github.com/j955229/ComfyUI-MiniMax-H3-Motion-Director

### H3 Motion Context

https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context

### Terry React UI Library

https://github.com/terry-xu-2077/Terry_React_UI_Library
