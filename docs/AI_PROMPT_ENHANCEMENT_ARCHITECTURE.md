# AI 提示词增强专项架构

> 状态：**长期有效的专项架构文档**  
> 日期：2026-09-13  
> 适用范围：ShotMill 的 Prompt Enhancement Service、Frontend Adapter、AI Prompt Revision、H3 / Seedance 等模型专属 Prompt Skill  
> 参考实现：`T8mars/comfyui-minimax-h3-prompt-enhancer-T8` 中的 MiniMax H3 Prompt Enhancer 与 Seedance 2.0 Prompt Enhancer。ShotMill 借鉴其多模态输入组织与 Provider 适配思想，不复制其具体代码或 System Prompt。

---

## 1. 核心定位

ShotMill 的 AI 提示词增强不是普通的“文本润色器”。

它应被实现为一个 **多模态 Prompt Compiler（多模态提示词编译器）**：

```text
用户创作意图
+ 当前任务实际参考媒体
+ 明确的媒体角色
+ 可选项目背景
+ 可选上一任务摘要
+ 可选硬约束 / 必要生成参数
        ↓
Prompt Enhancement Skill
        ↓
面向目标视频模型的最终 Prompt
```

最重要的原则：

> **用户描述 + 当前任务实际视觉素材，是 AI 增强的核心输入。**  
> 项目简介、上一任务摘要、其他叙事信息都只是可选辅助上下文。

因此不得把 AI 增强实现成：

```text
用户 Prompt
+ 上一任务摘要
+ 项目简介
+ 资产名字字符串
→ LLM 文本改写
```

资产名和引用标签只负责告诉模型“媒体是谁 / 承担什么角色”，不能替代真实媒体本体。

---

## 2. 总体架构

推荐结构：

```text
Task Editor / Frontend
        │
        │ assetId + role + 用户选择的可选上下文开关
        ▼
Frontend Adapter / Prompt Enhancement Application Service
        │
        ├─ 解析当前任务资产
        ├─ 读取项目背景（可选）
        ├─ 读取上一任务摘要（可选）
        ├─ 选择目标 Prompt Skill
        └─ 构造 Provider 无关请求
        ▼
Prompt Enhancement Skill
        ├─ MiniMax H3 Skill
        ├─ Seedance 2.0 Skill
        └─ Future Model Skill ...
        ▼
Prompt AI Provider Adapter
        ├─ Gemini / AI Workshop
        ├─ Qwen-VL / Local
        ├─ OpenAI-compatible
        └─ 其他多模态模型
        ▼
AI Prompt Revision
```

### 2.1 三层职责必须分开

**Application / Adapter 层**负责：

- 从 `assetId` 找到真实项目资产；
- 判断哪些上下文被用户启用；
- 根据任务模式和 Provider Capability 决定发送什么媒体；
- 记录输入快照和 revision。

**Prompt Skill 层**负责：

- 目标模型的 Prompt 写作规则；
- H3 / Seedance 等专属格式；
- 媒体引用语法；
- 必要的结构化输出约束。

**Prompt AI Provider 层**负责：

- API Key / endpoint；
- 上传文件、URL、base64、原生 multimodal part；
- 视频抽帧兼容；
- token / media size / retry / timeout；
- 不理解 ShotMill 的 Task / Scene / Job 业务。

---

## 3. 输入分层

### 3.1 必选：当前用户描述

```ts
userPrompt: string;
```

这是 AI 增强的创作意图源。

AI 不得因为参考素材或可选上下文存在，就擅自覆盖用户明确提出的：

- 主体；
- 动作；
- 事件结果；
- 对白；
- 可见文字；
- 风格硬约束；
- 指定生成方式。

---

## 3.2 核心多模态输入：当前任务实际资产

前端业务请求只传稳定资产引用：

```ts
type PromptEnhancementAssetRef = {
  assetId: string;
  reference: string; // <Picture 1> / <Subject 1> / @图片1 ...
  role?: string;     // 角色外观、场景、首帧、尾帧、动作参考等
};
```

前端**不要**负责：

- 读取绝对文件路径；
- base64 编码；
- 上传第三方 Provider；
- 判断某 Provider 用 `image_url` 还是 `video_url`；
- 视频抽帧。

后端 Prompt Enhancement Adapter 根据 `assetId` 解析项目资产，并构造成真正的多模态媒体输入。

### 3.2.1 媒体角色与媒体本体必须绑定

推荐发送语义：

```text
<Picture 1>：角色外观参考
[实际 Picture 1]

<Picture 2>：场景环境参考
[实际 Picture 2]
```

而不是只发送：

```text
参考资产：林澜雨夜造型、旧港口仓库外景
```

后者只能作为辅助说明，不能替代图片。

### 3.2.2 图片

图片应尽量作为真正视觉输入发送给支持 Vision 的 Prompt AI Provider。

### 3.2.3 视频

若 Prompt AI Provider 原生支持视频，应优先发送真实视频或 Provider 可访问的视频 URL。

如果 Provider 不支持原生视频，但支持多图 Vision，可由 Provider Adapter 将视频转换为：

```text
视频角色说明
+ 有序时间戳
+ 抽样帧 1
+ 有序时间戳
+ 抽样帧 2
+ ...
```

此时必须明确能力边界：AI 只看到了采样视觉帧，不能声称完整分析了所有视频帧或音频。

### 3.2.4 音频

音频是否作为真实多模态输入，必须由 `PromptAIProviderCapability` 决定。

如果当前 Provider 不支持音频理解：

- 可以发送用户写下的声音意图文本；
- 可以发送资产名称 / 角色说明；
- **不能声称 AI 已经听取或分析音频文件。**

---

## 4. 可选上下文

可选上下文不能因为“系统有这些数据”就默认全部发送。

推荐统一表达：

```ts
type PromptEnhancementContextOptions = {
  includeProjectBackground: boolean;
  includePreviousTaskSummary: boolean;
};
```

后续需要增加新的上下文时，也必须遵守显式选择 / 明确策略，不得无限堆叠隐式 Context。

---

## 4.1 项目背景：可选

项目配置中的：

```text
AI 增强时使用项目简介作为背景
```

决定是否发送：

```ts
projectBackground?: string;
```

规则：

- 开关关闭：不得发送；
- 开关开启但简介为空：不发送；
- 只作为背景事实；
- 不直接拼进用户 Prompt；
- 不允许项目背景覆盖当前任务明确意图。

---

## 4.2 上一任务摘要：可选，不是默认必选

上一任务摘要用于需要剧情 / 动作连续性的增强场景，但**是否发送给 AI 必须是可选策略**。

推荐请求字段：

```ts
includePreviousTaskSummary: boolean;
previousTaskSummary?: string;
```

当 `includePreviousTaskSummary == false`：

```text
不得发送 previousTaskSummary
```

当开启时，摘要来源建议：

```text
上一任务 summary
→ 简短 userIntent
→ title（兜底）
```

摘要应保持短小，例如 1–4 句。

### 4.2.1 默认禁止发送上一任务完整 Prompt

即使启用“上一任务摘要”，也不要默认发送：

- `previousTask.userPrompt` 全文；
- `previousTask.aiPrompt` 全文；
- `previousTask.finalPrompt` 全文；
- 完整 Result 描述；
- ContextLink / Job / Provider 内部对象。

原因是上一任务完整 Prompt 往往包含大量局部镜头、动作、构图、参数，容易污染当前任务。

### 4.2.2 Prompt 增强上下文与生成 Context 是两回事

例如：

```text
视频生成：片段承接上一任务最后 2 秒
```

不等于：

```text
AI Prompt 增强必须读取上一任务摘要
```

二者必须独立控制。

---

## 5. 必要生成参数

只给 AI Prompt Enhancer 发送**真正有助于写 Prompt**的生成参数。

例如：

```ts
generation: {
  durationSeconds: number;
  mode: string;
  contextMode?: string;
}
```

通常不需要把所有底层 Provider 参数暴露给 Prompt AI。

例如分辨率、队列参数、设备参数等，如果不影响 Prompt 编写，就不应进入增强上下文。

原则：

> **Prompt Enhancer 只知道写 Prompt 所必需的信息，不是 Video Provider 参数镜像。**

---

## 6. H3 与 Seedance 必须使用不同 Prompt Skill

Prompt AI Provider 可以共用，但 Prompt Skill 不能简单共用一套 System Prompt。

推荐：

```text
Prompt Enhancement Core
        │
        ├─ MiniMax H3 Enhancement Skill
        │    ├─ H3 官方/兼容结构
        │    ├─ Subject / Picture / Video 引用
        │    ├─ Shot / 时间 / 对白 / 声景规则
        │    └─ H3 输出校验
        │
        └─ Seedance 2.0 Enhancement Skill
             ├─ Seedance 自然语言工程 Prompt
             ├─ 图片/视频引用规则
             ├─ 镜头 / 动作 / 运镜 / 声音描述
             └─ Seedance 输出校验
```

### 6.1 H3 Skill

负责生成 MiniMax H3 能直接使用的标准 H3 文本。

它可以包含 H3 专属结构和引用协议，但这些结构不能泄漏到 Seedance Skill。

### 6.2 Seedance 2.0 Skill

Seedance Skill 必须明确：

- 当前目标是 Seedance，不是 H3；
- 不生成 H3 专属协议字段；
- 根据 Seedance 能力组织自然语言镜头工程指令；
- 正确解释图片 / 视频的角色。

### 6.3 Future Skill

未来增加其他视频模型时：

```text
新增 Skill
而不是不断给同一 System Prompt 增加 if/else
```

---

## 7. Provider 多模态传输策略

参考实现中最值得借鉴的不是某条具体 Prompt，而是**媒体传输被放在 Provider Adapter 中**。

ShotMill 也应如此。

### 7.1 Provider 原生文件上传

流程：

```text
项目资产
→ 后端读取
→ Provider Upload API
→ 得到临时 URL
→ image_url / video_url
```

### 7.2 Base64 / Data URL

对于允许内联媒体的兼容接口：

```text
image bytes → data:image/...;base64,...
```

视频只有在目标接口明确支持时才这样做。

### 7.3 原生 video_url

Provider 原生支持视频时优先使用。

### 7.4 视频抽帧 fallback

Provider 只支持图片时：

```text
视频
→ 按预算采样
→ 时间戳 + ordered frames
→ Vision LLM
```

必须将其标记为 sampled visual evidence，而不是完整视频分析。

---

## 8. 推荐消息结构

Prompt Skill 最终交给 Provider Adapter 的逻辑消息建议保持：

```text
System
  └─ 目标视频模型专属 Prompt Skill

User
  ├─ 当前用户描述
  ├─ 必要任务信息
  ├─ 可选项目背景
  ├─ 可选上一任务摘要
  ├─ 可选约束
  ├─ 媒体 1 角色说明
  ├─ [真实媒体 1]
  ├─ 媒体 2 角色说明
  ├─ [真实媒体 2]
  └─ ...
```

如果没有媒体：

```text
User.content = text
```

如果有媒体：

```text
User.content = [textPart, mediaPart1, mediaPart2, ...]
```

---

## 9. 推荐 API 契约

前端业务请求建议逐步收敛为：

```ts
type PromptEnhancementRequest = {
  taskId: string;
  target: "minimax-h3" | "seedance-2.0" | string;

  userPrompt: string;

  media: Array<{
    assetId: string;
    reference: string;
    role?: string;
  }>;

  context: {
    includeProjectBackground: boolean;
    includePreviousTaskSummary: boolean;
  };

  generation: {
    durationSeconds: number;
    mode: string;
    contextMode?: string;
  };
};
```

注意：请求中不需要前端重复发送真实项目简介和上一任务摘要正文；正式后端可以依据 `projectId / taskId + options` 自己读取，以避免前端伪造或产生陈旧数据。

如果第一阶段仍由 Frontend Adapter 显式返回摘要文本，也必须把 `includePreviousTaskSummary` 独立保存，不能以“字段非空”等方式暗示默认发送。

响应：

```ts
type PromptEnhancementResponse = {
  id: string;
  createdAt: string;
  prompt: string;
};
```

---

## 10. AI Prompt Revision

对已经保存的 Task，每次点击“增强”产生独立 revision，不覆盖旧版本。

新建 Task 在首次保存前没有稳定 `taskId`，因此走项目级草稿预览接口：

```http
POST /api/v1/projects/{projectId}/prompt-enhancement-previews
```

草稿预览仍须由后端解析 `assetId`、发送真实媒体并执行同一 Prompt Skill，但不创建 Task，也不写入 `AiPromptRevision`。用户保存新 Task 时，当前预览结果作为 `aiPrompt / finalPrompt` 保存；该 Task 的正式可追溯历史从保存后的下一次增强开始。前端不得把 `previewId` 冒充为持久化 revision ID。

推荐模型：

```ts
type AiPromptRevision = {
  id: string;
  taskId: string;
  createdAt: string;

  targetSkill: string;
  prompt: string;
  sourceUserPrompt: string;

  assetIds: string[];

  includeProjectBackground: boolean;
  includePreviousTaskSummary: boolean;
  previousTaskSummarySnapshot?: string;

  providerId?: string;
  modelId?: string;
  skillVersion?: string;
};
```

历史 revision 应能回答：

```text
当时用的是哪份用户描述？
用了哪些图片 / 视频？
是否启用了项目背景？
是否启用了上一任务摘要？
用了哪个 Prompt Skill / AI Provider？
```

这样后续才能可靠重现和比较 Prompt。

---

## 11. 资产与引用规则

### 11.1 业务层永远使用 assetId

不得把绝对路径传播到前端和领域关系中。

### 11.2 资产显示名不是文件名

Prompt 中需要用户可读名称时使用资产显示名；Provider 读取真实文件时使用后端资产记录的 project-relative path。

### 11.3 媒体角色优先于猜测

如果任务已经知道某资产是：

- 角色外观；
- 场景；
- 道具；
- 首帧；
- 尾帧；
- 动作参考；

应明确告诉 Prompt Skill / AI，而不是只把素材丢给模型自行猜测。

---

## 12. Capability

Prompt AI Provider 至少需要表达：

```ts
type PromptAIProviderCapability = {
  visionImage: boolean;
  nativeVideo: boolean;
  sampledVideoFallback: boolean;
  audioUnderstanding: boolean;
  maxImages?: number;
  maxVideos?: number;
  maxMediaBytes?: number;
};
```

Prompt Enhancement Application Service 根据 capability 决定媒体准备方式。

不得在 React 组件中判断：

```text
“Gemini 可以视频，所以这样发”
“OpenAI-compatible 不行，所以那样抽帧”
```

这些判断属于 Provider Adapter。

---

## 13. 错误与降级

### 13.1 媒体读取失败

不要静默忽略一个用户明确引用的媒体。

应返回可理解错误：

```text
无法读取参考图片「林澜·雨夜造型」
```

### 13.2 Provider 不支持某媒体

如果可以安全降级：

```text
视频 → 有序抽帧
```

则由 Adapter 降级，并记录能力边界。

如果不能可靠降级，应明确失败，不要假装已经分析。

### 13.3 AI 请求失败

- 不创建成功 revision；
- 不覆盖当前 AI Prompt；
- 用户可再次增强；
- requestId 可用于幂等和诊断。

---

## 14. 安全与隐私边界

- API Key 不进入 Prompt 文本；
- Prompt Enhancement 不向前端暴露绝对文件路径；
- 只允许读取当前项目有权访问的资产；
- 第三方 Provider 上传应遵循明确的 Provider 配置和用户设置；
- 不将未选中的项目资产自动上传给 AI；
- 不因为资产存在于项目库，就默认把它发给 Prompt AI。

核心原则：

> **只发送当前增强请求真正选中的媒体和用户明确启用的可选上下文。**

---

## 15. 与 Video Generation Context 的边界

必须区分：

```text
Prompt Enhancement Context
```

和：

```text
Video Generation Context
```

前者解决“AI 如何写当前任务 Prompt”；后者解决“视频模型如何承接上一片段的视觉 / latent / native context”。

它们可以来源于同一个上一任务，但不能成为同一个隐式对象。

---

## 16. 测试要求

### 16.1 Prompt Skill Contract Tests

每个 Skill 至少验证：

- H3 不输出 Seedance 协议；
- Seedance 不输出 H3 专属协议；
- 用户明确文本不被篡改；
- 媒体引用编号稳定；
- 可选上下文关闭后不进入消息。

### 16.2 Media Adapter Tests

至少验证：

- 图片真实进入 multimodal part；
- 视频原生通道；
- 视频抽帧 fallback；
- 时间戳顺序正确；
- Provider 不支持音频时不会谎称已分析音频。

### 16.3 Context Tests

必须验证：

```text
includePreviousTaskSummary = false
→ 请求中不存在上一任务摘要
```

以及：

```text
includeProjectBackground = false
→ 请求中不存在项目简介
```

### 16.4 Revision Tests

- 重复增强产生多个 revision；
- revision 不互相覆盖；
- 输入 assetIds 可追溯；
- 上下文开关状态可追溯；
- 失败请求不产生成功历史。

---

## 17. 当前过渡实现与后续迁移

截至 2026-09-13，前端已经有 AI 增强历史 UI 和过渡 service，但正式后端尚未完成。

当前过渡代码仍可能：

- 由前端发送资产元信息；
- 显式携带上一任务摘要文本；
- DEV 环境生成确定性预览结果。

这些都只是 UI 联调手段，不代表最终架构。

正式后端实现时应迁移为：

```text
前端：assetId + role + context options
后端：解析实际媒体
Prompt Skill：构造目标模型 Prompt 规则
Provider Adapter：发送真实多模态请求
Repository：保存 AiPromptRevision
```

---

## 18. 参考实现得到的关键结论

从 `T8mars/comfyui-minimax-h3-prompt-enhancer-T8` 的 MiniMax H3 / Seedance 2.0 Prompt Enhancer 中，ShotMill 主要借鉴以下思想：

1. **真实图片 / 视频进入多模态消息，而不是只传文件名或引用字符串。**
2. **媒体前带角色说明，帮助 AI 正确解释每个参考资产。**
3. **System Prompt / Skill 针对目标视频模型独立设计。**
4. **Provider Adapter 负责上传、内联、video_url 和抽帧 fallback。**
5. **文本 Context 是 supplemental，媒体事实应优先。**
6. **视频抽帧属于能力降级，必须如实描述证据边界。**

不应机械复制：

- 具体 Provider；
- 具体 API；
- 具体 System Prompt 文本；
- 具体 ComfyUI 节点参数；
- 与 ShotMill 产品无关的高级选项。

---

## 19. 开发决策摘要

以后实现 / 修改 AI 提示词增强时，按以下顺序判断：

```text
1. 当前用户到底想生成什么？
2. 当前任务真正引用了哪些图片 / 视频？
3. 每个媒体承担什么角色？
4. 用户是否启用了项目背景？
5. 用户是否启用了上一任务摘要？
6. 目标是 H3、Seedance 还是其他模型？
7. 当前 Prompt AI Provider 能真正理解哪些媒体？
8. 如何把结果保存成可追溯 revision？
```

如果实现绕过以上问题，只是把若干文本字段拼起来发给 LLM，则不符合本架构。
