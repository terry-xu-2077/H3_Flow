# ShotMill 产品与架构规划

> 状态：产品规划阶段  
> 最后更新：2026-09-11  
> 默认仓库：https://github.com/terry-xu-2077/TerryShotMill  
> 当前重点参考模型：https://github.com/MiniMax-AI/MiniMax-H3

---

## 1. 项目定位

ShotMill 是一个面向 AI 视频生产流程的**素材生成平台**。

它不承担剪辑、时间线、字幕、转场、音视频拼接、成片包装等 NLE / 后期功能。核心目标只有一个：

> 把已经准备好的剧本和项目资产，高效地转化为一批可批量生成、可追踪、可修改、可重新生成的视频素材任务。

虽然项目当前以 MiniMax-H3 为首个重点生成模型，但**系统架构不绑定 H3，也不绑定 ComfyUI、Qwen 或任何特定模型 / 厂商 API**。

### 1.1 核心体验

1. 打开项目。
2. 将准备好的剧本逐段创建为生成任务。
3. 为任务选择项目资产。
4. 使用已配置的多模态 AI Provider，根据剧本、资产和前后任务上下文自动编写适合当前视频生成模型的提示词。
5. 人工快速检查或修改。
6. 重复以上过程，直到一批任务进入 Ready 状态。
7. 点击“批量生成”。
8. ShotMill 按依赖和队列自动调用所选视频生成 Provider。
9. 用户可离开电脑，通过手机查看进度和结果。
10. 返回后快速审核：满意则通过 / 导出，不满意则编辑并重新生成。

核心体验：

> 创建生产单 → 一次性开工 → 等待 → 审核 → 局部返工。

---

## 2. 明确不做

ShotMill 不计划承担：

- 视频剪辑时间线
- 多轨编辑
- 自动剪辑
- 转场编辑
- 字幕编辑
- 配音时间线
- 音视频拼接
- 成片包装
- NLE 工具能力

未来即使增加新的 AI 模型，也仍然保持“素材生成平台”的边界。

---

## 3. 最重要的架构原则：双 Provider 层

ShotMill 核心不应绑定任何具体 AI 模型。系统至少抽象出两类独立 Provider：

### 3.1 Prompt AI Provider

负责：

- 理解剧本
- 理解图片 / 视频等视觉资产
- 读取 Skill / 项目规则
- 读取前后 Task Context
- 编写或修复生成提示词

可以是：

- 本地视觉大语言模型
- llama.cpp / ComfyUI 中运行的 VLM
- MiniMax API
- 其他 OpenAI-compatible API
- 厂商原生 API
- 未来更合适的多模态模型

**Qwen 只是当前可选本地方案之一，不是系统依赖。**

### 3.2 Video Generation Provider

负责真正的视频生成。

可以是：

- ComfyUI + MiniMax-H3
- ComfyUI + 未来其他视频模型
- 直接调用远程视频生成 API
- 本地独立推理服务
- 远程 GPU / 自建服务
- 未来其他生成后端

**MiniMax-H3 只是首个重点 Video Generation Provider / Model Profile，不是永久内核。**

### 3.3 Provider 与模型 / 实例分层

建议概念分为：

```text
Provider Adapter
  └─ 描述“如何通信”

Provider Profile
  └─ 用户保存的一套连接配置

Model / Generation Profile
  └─ 描述“用哪个模型、能力和默认参数生成”
```

例如：

```text
Prompt Provider Adapter: OpenAI Compatible
Prompt Provider Profile: MiniMax API
Model: MiniMax-M3

Video Provider Adapter: ComfyUI
Video Provider Profile: Local RTX 3090
Generation Profile: MiniMax-H3 Ref2VA High Quality
```

以后也可以是：

```text
Video Provider Adapter: Vendor API
Video Provider Profile: Cloud Video API
Generation Profile: FutureVideoModel Cinematic
```

---

## 4. ShotMill 是 Source of Truth

项目、资产、Task、Prompt、Job、Result、Context、Queue 都由 ShotMill Core 管理。

任何 Provider 都只是执行端。

```text
                         SHOTMILL CORE

 Project / Asset / Task / Job / Result / Context / Queue
                         │
             ┌───────────┴───────────┐
             │                       │
      Prompt AI Layer       Video Generation Layer
             │                       │
   ┌─────────┼─────────┐    ┌────────┼──────────────┐
   │         │         │    │        │              │
 Local VLM  API    Future   ComfyUI  Video API   Future
                              │
                           MiniMax-H3
                           / Other Model
```

因此未来替换 Prompt 模型、视频模型、API 厂商或 ComfyUI 工作流，都不应破坏项目数据结构。

---

## 5. Provider Capability：按能力驱动，不按厂商写死

代码中应避免：

```text
if model == qwen
if provider == minimax
if video_model == h3
```

Provider / Model Profile 应声明能力。

### 5.1 Prompt Provider 能力示例

```text
PromptCapabilities
├─ text_input
├─ image_input
├─ video_input
├─ audio_input
├─ system_prompt
├─ structured_output
├─ reasoning
├─ tools
└─ streaming
```

### 5.2 Video Generation Provider 能力示例

```text
GenerationCapabilities
├─ text_to_video
├─ image_to_video
├─ first_frame
├─ last_frame
├─ reference_images
├─ reference_video
├─ reference_audio
├─ native_audio
├─ max_duration
├─ supported_aspect_ratios
├─ seed
├─ batch
├─ visual_context
├─ audio_context
├─ latent_context
├─ continuation
└─ progress_reporting
```

UI、Task Validator、Context Link 和 Scheduler 都依据 Capability 决定可用功能。

例如：

- H3 支持 latent / audio motion context，则任务链可以使用高级连续生成。
- 某未来 API 只支持首帧续接，则 Context Link 自动降级为 frame continuation。
- 某模型完全不支持连续上下文，则仍保留 Semantic Context，但不显示不可用的生成上下文选项。

---

## 6. Provider 配置

### 6.1 Prompt AI Provider Profile

至少支持：

```text
Provider Name
Provider Type
Base URL
API Key
Model
System Prompt Support
Multimodal Capability
Extra Headers（可选）
Extra Body / Model Params（可选）
Timeout
```

首批正式参考：

- Local VLM： https://github.com/lihaoyun6/ComfyUI-llama-cpp_vlm
- MiniMax OpenAI-compatible API： https://platform.minimax.cn/docs/api-reference/text-openai-api

MiniMax 只是一个预置 Profile / 参考实现，不做硬编码耦合。

### 6.2 Video Generation Provider Profile

至少抽象：

```text
Provider Name
Provider Type
Endpoint
Authentication
Capabilities
Available Models / Profiles
Health Status
Concurrency
Default Timeout
```

ComfyUI 是第一阶段重点 Provider Adapter，但不是 ShotMill Core 的必选依赖。

### 6.3 凭据安全

- API Key 不进入普通项目导出。
- UI 默认遮蔽 Key。
- 优先使用系统安全凭据存储或独立受保护配置。
- Job / Prompt 记录只保存 Provider Profile ID、模型名和关键参数，不保存明文密钥。

---

## 7. 项目隔离

每个项目独立管理：

- 资产
- Task
- Prompt
- Result
- Context
- Cache
- Queue
- Project Skill / Prompt Rules
- 默认 Prompt Provider
- 默认 Generation Profile

默认不跨项目共享资产。

建议：

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

业务层引用资产使用 `asset_id`，避免到处保存绝对文件路径。

---

## 8. Asset Library

资产只导入项目一次，之后所有 Task 直接复用。

至少支持：

- 图片
- 视频
- 音频

业务分类可包括角色、场景、道具、分镜参考、动作参考、声音参考等。

建议字段：

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

`ai_description` 可以由当前具备视觉能力的 Prompt Provider 生成并缓存。

任务内通过 Asset Picker 选择资产，支持缩略图、分类、标签、搜索、多选、最近使用和当前已选资产。

---

## 9. Task：核心业务对象

ShotMill 以 Task / Shot 为中心，而不是以某个模型或工作流为中心。

```text
Task
├─ id / 编号 / 名称
├─ script_source
├─ user_intent
├─ Assets
├─ Prompt
├─ Generation Profile
├─ Generation Params
├─ Context Links
├─ Jobs
└─ Primary Result
```

Task 中不应出现必须绑定 H3 的字段。模型特有参数放入所选 Generation Profile / Provider Parameter Schema。

### 9.1 剧本和 Prompt 分离

至少保存：

- 原始剧本 `script_source`
- 用户创作意图 `user_intent`
- AI 生成 Prompt `ai_prompt`
- 人工确认 Prompt `final_prompt`
- Prompt Revision

### 9.2 快速连续创建

高频支持：

- 新建下一个任务
- 复制上一任务
- 插入任务
- 自动编号
- 继承常用参数
- 继承角色 / 场景资产
- 继承 Generation Profile
- 快速替换部分资产

核心目标是减少“粘贴剧本 → AI 编写 → 快速确认 → 下一个任务”之间的无意义操作。

---

## 10. Task 与 Job 分离

Task 是可长期修改的生产任务。

Job 是某一次真正提交给 Video Generation Provider 的不可变快照。

Job 应记录：

- 当次 final_prompt
- 当次 Asset 版本
- Generation Provider Profile
- Generation Profile / Model
- Provider-specific Params
- Seed（如果支持）
- Context 来源
- 提交时间
- 状态
- 错误
- 输出 Result

Prompt AI 调用也要记录：

- Prompt Provider Profile
- 模型
- Skill 版本
- 输入上下文
- 输出版本

确保生成结果可追溯，但 Prompt Job 与 Video Generation Job 可以采用不同记录类型。

---

## 11. Prompt Composer / Skill Engine

Prompt Composer 不绑定 Qwen，也不绑定 H3 Prompt 格式。

统一请求概念：

```text
PromptRequest
├─ system_context
│  ├─ Generation Model Skill
│  ├─ ShotMill Rules
│  └─ Project Skill
├─ script_source
├─ user_intent
├─ task_context
│  ├─ previous
│  └─ next
├─ assets[]
├─ target_generation_profile
└─ output_contract
```

Provider Adapter 将这个请求转换为本地模型输入或远程 API 请求。

### 11.1 Skill 不应固定为 H3 Skill

当前可有：

```text
MiniMax-H3 Skill
├─ H3 Prompt Rules
├─ H3 Modes
└─ H3 Reference Syntax
```

未来更换视频模型时可增加：

```text
Future Model Skill
├─ Prompt Rules
├─ Reference Rules
└─ Model-specific Best Practices
```

Project Skill 则独立存在：

```text
Project Skill
├─ 视觉规则
├─ 摄影规则
├─ 角色规则
├─ 禁止项
└─ 项目自定义说明
```

最终 System Context 动态组合。

---

## 12. Prompt Validator：通用 + Provider / Model 专属

不能只有 H3 Validator。

### 通用校验

- Prompt 是否存在
- Asset 是否存在
- 必要引用是否完整
- Task Context 是否有效
- Generation Profile 是否可用

### Model-specific Validator

由选中的 Generation Profile 提供，例如 H3 Validator 检查：

- H3 特有标签
- Subject / Picture / Audio 引用
- 模式限制
- 时长限制
- H3 Prompt 区块结构

未来换模型时，由对应 Provider / Model Skill 提供自己的规则。

必要时调用当前 Prompt Provider 自动修复。

---

## 13. Task Context / Task Chain

Task Chain 是生成任务之间的顺序、依赖和上下文关系，不是剪辑时间线。

上下文分为：

### A. Semantic Context

模型无关，提供给 Prompt AI：

- Previous Task 剧本 / Prompt / 结果状态
- Current Task
- Next Task 计划内容

原则：

> Previous 告诉 AI“从哪里接”；Next 告诉 AI“应该往哪里去”。

### B. Generation Context

由 Video Generation Provider Capability 决定。

可能包括：

- Previous Result
- Last Frames
- Visual Context
- Audio Context
- Latent / Motion Context
- Provider-specific continuation token / state

当前 H3 可重点参考：

- https://github.com/j955229/ComfyUI-MiniMax-H3-Motion-Director
- https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context

但 `latent_context` 不是 ShotMill Core 的硬依赖。

### C. Context Link

上下文关系定义在 Task A → Task B 的边界。

```text
Task A
  │
  │ Context Link
  │ ├─ Semantic
  │ └─ Generation Context（按 Provider 能力）
  ▼
Task B
```

### 13.1 Primary Result

一个 Task 可有多个 Result。用户指定 `Primary Result`，下游默认基于该结果续接。

### 13.2 Context Stale

上游更换 Primary Result 后，下游若基于旧结果生成，则标记 `Context Stale`。

系统不自动覆盖已有结果。用户决定保持，或从该点向后重生成。

### 13.3 跨 Generation Provider 的上下文降级

如果 Task A 与 Task B 使用不同 Generation Provider，系统根据能力自动选择可传递的最高级上下文：

```text
Provider-native latent / state
        ↓ 不兼容
video / frames / audio
        ↓ 不支持
semantic context only
```

这保证任务链不会因为更换模型而整体失效。

---

## 14. Queue / Scheduler

支持多个 Queue Lane，例如正式生成、快速测试、高质量、夜间批量。

Queue 可绑定：

- Generation Provider Profile
- Generation Profile
- Priority
- Concurrency
- 默认参数

连续 Task Chain 形成依赖图：

```text
A → B → C
D → E
F
```

调度器必须满足依赖后再提交。

批量生成要求：

- 单任务失败不阻塞无依赖任务
- 依赖任务等待上游
- 单任务重试
- 从失败处继续
- 暂停 / 恢复 / 取消
- ShotMill 重启后恢复
- Provider / ComfyUI 重启后恢复

---

## 15. Task Ready

任务进入生成前按所选 Generation Provider / Profile 进行 Ready 检查：

- final_prompt 已准备
- 通用 Validator 通过
- Model-specific Validator 通过
- 必要资产存在
- Context 可满足
- Generation Provider 在线
- Generation Profile 可用
- 参数合法

**Prompt Provider 不在线，不应阻塞已经拥有 final_prompt 的任务进入生成队列。**

---

## 16. Result Manager

重新生成不能覆盖旧结果。

Result 至少保留：

- Job
- Prompt Revision
- Generation Provider / Model
- 参数
- Context 来源
- 生成时间
- 视频文件
- Preview
- 审核状态

审核页以结果墙为主：

- 直接播放
- 通过
- 编辑任务
- 重新生成
- 设为 Primary Result

桌面端使用“导出 / 打开文件位置 / 导出已通过素材”；手机端需要保存到设备时可使用“下载”。

---

## 17. Production Monitor 与手机 Remote Monitor

批量生成后提供直观生产状态：

```text
52 Tasks
37 Completed
2 Running
11 Queued
2 Failed
```

手机端为响应式 Web 页面，第一阶段用于：

- 查看整体进度
- 查看运行 / 排队 / 失败状态
- 播放最新结果
- 标记通过
- 对明显失败结果重新排队

优先支持局域网扫码连接。

桌面端和手机端共享事件源：

```text
job.started
job.progress
job.completed
job.failed
queue.changed
result.approved
provider.status_changed
```

建议 WebSocket / SSE。

手机连接需有二维码配对 / Token / 授权设备撤销机制。

---

## 18. 前端 UI 规范

ShotMill 默认使用：

https://github.com/terry-xu-2077/Terry_React_UI_Library

原则：

> 现有控件和样式优先直接复用；必要时新增通用控件，但不得破坏现有 API、组件路径和导出出口。

因为该库同时被 RulesMD Editor 使用，禁止为了 ShotMill 移动或重命名现有组件、改变 public props 或现有 export path。

通用基础组件进入共享 UI Library；ShotMill 业务组件留在本项目。

例如：

**共享库：** Card、ProgressBar、Tabs、Toast、Popover、SegmentedControl、EmptyState、通用媒体预览。

**ShotMill：** TaskCard、AssetCard、ResultCard、QueuePanel、PromptComposer、ContextLink、TaskChainView、ProviderSettings、ProductionMonitor。

视觉原则：

- 现代卡片式，但避免所有区域卡片化
- 中性色为主
- 高饱和色只用于高亮 / 状态 / 警告
- 不滥用 AI 紫蓝渐变
- 媒体内容优先
- 批量任务保持高信息密度

---

## 19. 桌面端信息架构

打开项目后直接进入“任务生产区”，不做传统 Dashboard 作为默认首页。

一级导航建议：

```text
任务
资产
队列 / 生产状态
结果
项目设置
```

项目设置包含：

- Prompt Provider Profiles
- Video Generation Provider Profiles
- Generation Profiles
- Skill / Project Rules
- Remote Monitor

### 19.1 Task Composer

任务编辑建议采用创作型三栏布局：

```text
┌────────────┬───────────────────────┬────────────┐
│ 剧本/设置   │      Generated Prompt │   项目资产  │
│            │                       │            │
│ 原始剧本    │ AI Prompt             │ Character  │
│ 创作意图    │ Final Prompt          │ Scene      │
│ 生成模型    │ Validator             │ Video      │
│ 参数        │ Revision              │ Audio      │
└────────────┴───────────────────────┴────────────┘
```

日常创建任务时 Provider 选择默认继承项目设置，不让用户反复配置。

---

## 20. ComfyUI 的正确定位

ComfyUI 是**一个 Video Generation Provider Adapter / Backend 类型**，不是 ShotMill Core 本身。

第一阶段可以开发 `ShotMill ComfyUI Bridge / ShotMill Nodes`，负责：

### Task Input

- Job 信息
- final_prompt
- 生成参数
- Model / Workflow Profile

### Asset Resolver

- `asset_id → 实际媒体`

### Context

- Previous Result
- Frames / Audio
- Motion / Latent Context
- Provider-specific Context

### Result

- 返回视频
- 返回元数据
- Preview
- 可续接 Context Cache

远程视频 API Provider 不需要经过 ComfyUI Bridge。

---

## 21. Generation Profile

原先的 `Workflow Preset` 概念升级为更加通用的 `Generation Profile`。

Generation Profile 描述：

```text
GenerationProfile
├─ name
├─ provider_profile_id
├─ model
├─ mode
├─ capability_snapshot
├─ default_params
├─ parameter_schema
├─ prompt_skill_id
├─ validator_id
└─ provider_payload / workflow_ref
```

对于 ComfyUI，它可以引用 workflow JSON。

对于远程 API，它可以保存 API 模型名和默认请求参数。

这样 Task 只选择 Generation Profile，不关心背后是 ComfyUI 还是 API。

---

## 22. Context Cache

Provider-native 的 latent / motion state / continuation token 等缓存不进入普通 Asset Library。

建议：

```text
Project/context/
├─ task_001/
│  └─ result_003/
│      ├─ provider_context.*
│      └─ metadata.json
└─ ...
```

这些属于内部可重建缓存，与 Result 绑定。

---

## 23. 应用整体服务结构

```text
                         SHOTMILL

┌─────────────────────────────────────────────┐
│                 Backend / Core              │
│                                             │
│ Project / Asset / Task / Job / Result      │
│ Prompt / Skill / Context / Queue           │
│ Provider Registry / Scheduler              │
└───────────────┬─────────────────────────────┘
                │
      ┌─────────┴─────────┐
      │                   │
 Prompt Providers   Generation Providers
      │                   │
 Local / API        ComfyUI / API / Future

                HTTP API + WebSocket / SSE
                         │
              ┌──────────┴──────────┐
              │                     │
         Desktop React         Mobile React
              │                     │
              └── Terry React UI ───┘
```

---

## 24. V0.1 范围

第一阶段核心闭环：

```text
Project
  ↓
Asset Library
  ↓
Task Creation
  ↓
Prompt AI Provider
  ↓
Task Context
  ↓
Ready Validation
  ↓
Queue / Batch Generate
  ↓
Video Generation Provider
  ↓
Results
  ↓
Approve / Edit / Regenerate / Export
```

### P0

- Project Manager
- Asset Library
- Task Manager
- Task Composer
- Prompt Provider Layer
- Skill Engine
- Prompt Validator
- Generation Provider Layer
- Generation Profiles
- Task Chain / Context Link
- Job / Result Model
- Queue / Scheduler
- ComfyUI Provider Adapter
- MiniMax-H3 Generation Profile
- Result Review
- Export
- Production Monitor
- Mobile Remote Monitor
- Terry React UI Library 集成

### 首批 Prompt Provider

- Local VLM（具体模型可配置）
- OpenAI-compatible API
- MiniMax API 作为预置 / 参考 Profile

### 首批 Video Generation Provider

- ComfyUI Provider Adapter
- MiniMax-H3 作为首个重点 Generation Profile

后续再增加远程视频 API 或其他本地模型，而不修改 Core 数据模型。

---

## 25. 后续可考虑：大段剧本自动拆 Task

可允许一次粘贴较长剧本，由 Prompt AI Provider 给出候选 Task 拆分。

系统不自动未经人工确认就全部提交生成。

用户仍可调整任务边界、剧本、资产、Prompt、Context Link 和 Generation Profile。

---

## 26. 当前产品原则

1. **ShotMill 是素材生成平台，不是剪辑工具。**
2. **ShotMill Core 不绑定 H3、Qwen、ComfyUI 或任何厂商 API。**
3. **Prompt AI 与 Video Generation 是两个独立 Provider 层。**
4. **Provider 以 Capability 驱动，不以厂商名写死逻辑。**
5. **Task 是核心业务对象，具体模型 / 工作流只是执行配置。**
6. **Generation Profile 屏蔽 ComfyUI Workflow、远程 API 等底层差异。**
7. **Task 与 Job 分离，所有生成结果可追溯。**
8. **资产属于项目，任务通过 Asset ID 复用。**
9. **剧本原文、AI Prompt、Final Prompt 分离。**
10. **Prompt 编译与视频生成分离。**
11. **Task Context / Task Chain 是核心能力，但高级上下文按 Provider Capability 使用。**
12. **跨 Provider 时允许上下文逐级降级，不让任务链被特定模型锁死。**
13. **批量生成必须可恢复、可重试、可无人值守。**
14. **结果审核必须支持快速通过、编辑、重生成。**
15. **手机端用于远程查看生产状态和轻量审核。**
16. **前端统一复用 Terry React UI Library，所有扩展保持向后兼容。**
17. **优先优化每天重复几十次的任务创建流程。**

---

## 27. 下一阶段规划重点

在写业务代码前继续完成：

1. 桌面端完整信息架构。
2. Task 创建 / 编辑主页面原型。
3. Asset Picker。
4. Task Chain / Context Link UI。
5. Ready 检查流程。
6. Queue / Production Monitor。
7. Result Review。
8. Mobile Remote Monitor。
9. Task / Job / Result / ContextLink / Asset 数据模型。
10. Provider Registry / Capability 接口草案。
11. Prompt Provider Adapter 协议。
12. Video Generation Provider Adapter 协议。
13. Generation Profile 格式。
14. ComfyUI Provider Bridge 协议。
15. Skill / Project Skill 组织方式。

---

## 28. 参考项目 / 服务

### MiniMax-H3
https://github.com/MiniMax-AI/MiniMax-H3

### ComfyUI llama.cpp VLM
https://github.com/lihaoyun6/ComfyUI-llama-cpp_vlm

### MiniMax OpenAI-compatible API
https://platform.minimax.cn/docs/api-reference/text-openai-api

### MiniMax H3 Motion Director
https://github.com/j955229/ComfyUI-MiniMax-H3-Motion-Director

### H3 Motion Context
https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context

### Terry React UI Library
https://github.com/terry-xu-2077/Terry_React_UI_Library

---

## 29. 自动化测试与 Codex 目标驱动开发

ShotMill 计划主要在本地通过 Codex 应用以“目标”的方式持续开发，因此测试体系必须从第一批业务代码开始建立，而不是在项目后期补齐。

目标是让常规开发和修 Bug 尽可能形成以下闭环：

```text
定义目标 / Bug
    ↓
Codex 读取 AGENTS.md 与相关模块文档
    ↓
实现或先补回归测试
    ↓
运行 targeted tests
    ↓
失败则继续修复
    ↓
相关测试通过
    ↓
运行完整验收
    ↓
Definition of Done
```

### 29.1 测试分层

建议至少包含：

#### Unit Tests

后端优先使用 `pytest`，前端使用 `Vitest + React Testing Library`。

重点覆盖：

- Task 状态和复制 / 修改
- Asset 路径、Hash、项目隔离
- Prompt Revision / Validator
- ContextLink / Context Stale
- Queue 优先级、暂停、恢复
- Scheduler DAG 依赖
- Provider Capability 匹配
- Primary Result 切换
- 数据库 CRUD / migration

#### Integration Tests

重点验证完整业务链：

```text
Task → Queue → Scheduler → Provider → Job → Result
```

不依赖真实 GPU，优先通过 Fake Provider 模拟成功、失败、超时、断线、重试和恢复。

#### Contract Tests

所有 Provider Adapter 必须通过统一 Contract Test。

例如 Video Generation Provider 统一验证：

```text
validate / capabilities
submit
status / progress
cancel
collect_result
context export / fallback（若支持）
```

Prompt Provider 同样验证标准输入、结构化输出、多模态能力、超时和错误归一化。

#### E2E Tests

使用 Playwright 启动真实 ShotMill Backend + Frontend + Fake Provider，自动模拟用户操作。

覆盖主闭环：

```text
创建项目
→ 导入资产
→ 创建 Task
→ AI Prompt
→ Ready
→ 批量生成
→ 审核
→ 修改
→ 重生成
→ 导出
```

手机 Remote Monitor 同样用 Playwright 的移动端 viewport 自动测试，不要求每次都拿真实手机回归。

#### Hardware Smoke Tests

真实 ComfyUI / MiniMax-H3 或其他真实生成 Provider 不进入每次常规回归。

只在重要版本、Provider 适配改动或发布前执行少量真实硬件 Smoke Test，例如：

- 一个独立 Task
- 一条两段 Context Chain
- 校验输出文件可解码、时长 / 分辨率合理、Result / Context 元数据正确

画面审美质量仍保留人工审核。

### 29.2 Fake Provider 是测试基础设施

必须从早期实现 `FakePromptProvider` 和 `FakeVideoProvider`。

Fake Video Provider 至少支持配置：

- 立即成功
- 延迟成功
- 指定进度后失败
- 第一次失败、第二次成功
- Provider 断线
- Timeout
- Cancel
- 不支持 context
- 只支持 last-frame continuation
- 支持模拟 latent / audio context

这样可以在几秒内自动测试几十个任务、复杂 DAG、恢复和异常状态，不需要真实 GPU。

### 29.3 故障注入

Scheduler / Provider / 文件系统相关测试应主动制造异常，而不是只测试 happy path。

重点场景包括：

- Provider 在 Job 运行中断开
- ShotMill 在 Job 运行中退出并重启
- ComfyUI / Provider 重启
- Asset 文件丢失 / 移动
- Provider 返回未知 Job ID
- Job 超时
- 取消过程中收到 completed event
- Result 已生成但回调丢失
- 重复收到 completed event
- 上游 Primary Result 被替换
- Context Stale
- 上游失败导致下游阻塞
- 磁盘写入失败 / 空间不足
- 数据库恢复和 migration 失败

这些场景应逐步沉淀为永久回归测试。

### 29.4 Bug 修复规则：Regression Test First

正式 Bug 默认遵循：

```text
先增加可稳定复现 Bug 的测试
→ 确认测试失败
→ 修复实现
→ 测试通过
→ 保留该测试
```

禁止为了让测试通过而删除、绕过或弱化已有有效测试。

### 29.5 统一验收入口

计划建立：

```text
python scripts/verify.py
```

并支持有针对性的范围：

```text
python scripts/verify.py --area scheduler
python scripts/verify.py --area providers
python scripts/verify.py --area frontend
python scripts/verify.py --area e2e
python scripts/verify.py --full
```

实现过程中优先跑 targeted tests；目标完成前再运行 full verification。

最终输出应清楚标识各测试层的 PASS / FAIL，减少 Codex 分析无关日志的成本。

### 29.6 测试与开发文档

规划目录：

```text
AGENTS.md

docs/
├─ ShotMill_产品与架构规划.md
├─ TEST_STRATEGY.md
├─ ARCHITECTURE.md
├─ PROVIDERS.md
├─ ACCEPTANCE_CRITERIA.md
└─ FAILURE_SCENARIOS.md

tests/
├─ unit/
├─ integration/
├─ contract/
├─ e2e/
├─ fixtures/
└─ scenarios/

scripts/
└─ verify.py
```

`AGENTS.md` 只保留稳定、必要的工程规则和导航，不写成巨大百科全书。

详细架构和测试规则由对应文档按需读取。

---

## 30. Token 成本与 AI 开发效率原则

ShotMill 的开发会长期使用 Codex / AI Coding Agent，因此 Token 成本应作为工程效率的一部分主动优化。

目标不是“少写代码”，而是减少：

- 反复扫描整个仓库
- 反复理解已经确定的架构
- 无关文件被加载进上下文
- 海量日志反复分析
- 同一 Bug 多次人工复现
- 每次修改都执行完整重型测试

### 30.1 最小必要上下文

根 `AGENTS.md` 应明确：

> Use the minimum repository context necessary for the task. Do not scan unrelated directories when the owning module is known.

模块边界要清晰，避免一个几千行的“大一统 service”承载多个领域。

目标是让大多数任务只需要读取对应模块及其 Contract / Tests，而不是重新理解整个项目。

### 30.2 文档作为索引，而不是重复 Prompt

开发目标应该可以很短，例如：

```text
实现 Video Provider 取消机制，遵循现有 Provider Contract。
完成相关测试并运行对应验收。
```

项目背景、Provider 原则、测试规则不应每次重复塞进用户 Prompt，而应由：

```text
AGENTS.md
→ 对应架构文档
→ 对应模块代码
→ 对应测试
```

按需加载。

### 30.3 Targeted Tests 优先

开发过程中优先运行最小相关测试集；只有完成目标、合并或发布前才运行完整套件。

这既缩短执行时间，也减少 AI 处理无关错误输出和日志的 Token。

### 30.4 结构化错误与日志

应用日志应支持机器和 AI 高效定位问题。

业务层优先输出结构化错误，例如：

```text
code=PROVIDER_TIMEOUT
provider=comfyui-local
job_id=128
retryable=true
```

完整原始 Provider / ComfyUI 日志单独保存，只有需要时再读取。

避免普通故障直接向用户或 Codex 输出几千行混合日志。

### 30.5 测试本身也是 Token 优化工具

自动测试给出明确 PASS / FAIL，比 AI 反复人工推演状态更省上下文。

特别是 Fake Provider、Contract Tests 和 Failure Scenarios，可以把大量“读日志 → 猜问题 → 重试”的工作变成确定性的短反馈。

### 30.6 控制代码噪音

- 使用清晰命名代替无价值注释。
- 注释重点解释“为什么”和关键不变量，不解释显而易见的语句。
- 避免重复封装、复制粘贴和无意义抽象。
- 保持模块小而职责单一。
- Provider-specific 逻辑限制在 Adapter / Profile / Validator 内，不向 Core 泄漏。

代码量本身不是主要 Token 成本；**结构混乱、耦合和重复理解才是长期成本。**

---

## 31. Codex Definition of Done 原则

未来 Codex 的“目标”任务不应只以“代码写完”为完成条件。

默认 Definition of Done 应包含：

1. 功能符合目标和现有架构约束。
2. 新增 / 修改业务逻辑具备对应自动测试。
3. 修 Bug 时增加永久回归测试。
4. Provider 变更通过对应 Contract Tests。
5. UI 行为变化通过相关 E2E。
6. Targeted Tests 全部通过。
7. 类型检查 / Lint / 数据库迁移检查通过。
8. 完成前运行规定范围的 `verify.py`。
9. 不通过删除测试或弱化断言规避问题。
10. 如果某测试无法执行，必须明确报告原因和未验证风险。

长期目标是把开发过程变成：

```text
用户决定产品行为
        ↓
Codex 实现
        ↓
自动测试 / 故障注入 / 验收
        ↓
Codex 修复
        ↓
机器确认行为正确
        ↓
用户重点检查最终体验与视觉质量
```

这样尽可能把重复性的测试和修 Bug 工作交给自动化，把人工精力保留在产品决策、交互体验和生成质量判断上。
