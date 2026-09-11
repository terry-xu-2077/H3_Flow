# H3 Flow 产品与架构规划

> 状态：产品规划阶段  
> 最后更新：2026-09-11  
> 默认仓库：https://github.com/terry-xu-2077/H3_Flow  
> 当前重点参考模型：https://github.com/MiniMax-AI/MiniMax-H3

---

## 1. 项目定位

H3 Flow 是一个面向 AI 视频生产流程的**素材生成平台**。

它不承担剪辑、时间线、字幕、转场、音视频拼接、成片包装等 NLE / 后期功能。核心目标只有一个：

> 把已经准备好的剧本和项目资产，高效地转化为一批可批量生成、可追踪、可修改、可重新生成的视频素材任务。

虽然项目当前以 MiniMax-H3 为首个重点生成模型，因此沿用 H3 Flow 名称，但**系统架构不绑定 H3，也不绑定 ComfyUI、Qwen 或任何特定模型 / 厂商 API**。

### 1.1 核心体验

1. 打开项目。
2. 将准备好的剧本逐段创建为生成任务。
3. 为任务选择项目资产。
4. 使用已配置的多模态 AI Provider，根据剧本、资产和前后任务上下文自动编写适合当前视频生成模型的提示词。
5. 人工快速检查或修改。
6. 重复以上过程，直到一批任务进入 Ready 状态。
7. 点击“批量生成”。
8. H3 Flow 按依赖和队列自动调用所选视频生成 Provider。
9. 用户可离开电脑，通过手机查看进度和结果。
10. 返回后快速审核：满意则通过 / 导出，不满意则编辑并重新生成。

核心体验：

> 创建生产单 → 一次性开工 → 等待 → 审核 → 局部返工。

---

## 2. 明确不做

H3 Flow 不计划承担：

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

H3 Flow 核心不应绑定任何具体 AI 模型。系统至少抽象出两类独立 Provider：

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

## 4. H3 Flow 是 Source of Truth

项目、资产、Task、Prompt、Job、Result、Context、Queue 都由 H3 Flow Core 管理。

任何 Provider 都只是执行端。

```text
                         H3 FLOW CORE

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

ComfyUI 是第一阶段重点 Provider Adapter，但不是 H3 Flow Core 的必选依赖。

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

H3 Flow 以 Task / Shot 为中心，而不是以某个模型或工作流为中心。

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
│  ├─ H3 Flow Rules
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

但 `latent_context` 不是 H3 Flow Core 的硬依赖。

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
- H3 Flow 重启后恢复
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

H3 Flow 默认使用：

https://github.com/terry-xu-2077/Terry_React_UI_Library

原则：

> 现有控件和样式优先直接复用；必要时新增通用控件，但不得破坏现有 API、组件路径和导出出口。

因为该库同时被 RulesMD Editor 使用，禁止为了 H3 Flow 移动或重命名现有组件、改变 public props 或现有 export path。

通用基础组件进入共享 UI Library；H3 Flow 业务组件留在本项目。

例如：

**共享库：** Card、ProgressBar、Tabs、Toast、Popover、SegmentedControl、EmptyState、通用媒体预览。

**H3 Flow：** TaskCard、AssetCard、ResultCard、QueuePanel、PromptComposer、ContextLink、TaskChainView、ProviderSettings、ProductionMonitor。

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

ComfyUI 是**一个 Video Generation Provider Adapter / Backend 类型**，不是 H3 Flow Core 本身。

第一阶段可以开发 `H3 Flow ComfyUI Bridge / H3 Flow Nodes`，负责：

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
                         H3 FLOW

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

1. **H3 Flow 是素材生成平台，不是剪辑工具。**
2. **H3 Flow Core 不绑定 H3、Qwen、ComfyUI 或任何厂商 API。**
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
