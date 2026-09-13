import { Clapperboard, Code2, Eye, Pencil, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "terry-react-ui-library";

import { H3PromptEditor, type H3PromptViewMode } from "../../components/H3PromptEditor";
import type { PromptAsset } from "../../components/PromptAssetEditor";
import type { GenerationTask, ProjectAsset } from "../../domain/storyboard";
import { Dialog } from "../../ui/overlay";

type TaskEditorPatch = Partial<Pick<GenerationTask,
  "title" | "aiPrompt" | "finalPrompt" | "generationParams" | "plannedDurationSeconds"
>>;

type TaskEditorSave = { bivarianceHack(patch: TaskEditorPatch): void }["bivarianceHack"];

type TaskEditorDialogProps = {
  open: boolean;
  task?: GenerationTask;
  assets: ProjectAsset[];
  previousTaskDurationSeconds?: number;
  projectContext?: {
    description: string;
    useDescriptionForAiPrompt: boolean;
  };
  onClose: () => void;
  onSave: TaskEditorSave;
};

type PromptMode = "user" | "ai";
type ContextMode = "片段承接" | "尾帧承接" | "不承接";

type ChoiceOption = { value: string; label: string };

function assetKind(asset: ProjectAsset, role?: string): PromptAsset["kind"] {
  if (role === "character") return "subject";
  if (asset.mediaType === "video") return "video";
  if (asset.mediaType === "audio") return "audio";
  return "picture";
}

function promptAssetsForTask(task: GenerationTask | undefined, assets: ProjectAsset[]): PromptAsset[] {
  if (!task) return [];
  const counters: Record<PromptAsset["kind"], number> = { subject: 0, picture: 0, video: 0, audio: 0 };
  return task.assetBindings.flatMap((binding) => {
    const asset = assets.find((item) => item.id === binding.assetId);
    if (!asset) return [];
    const kind = assetKind(asset, binding.role);
    counters[kind] += 1;
    const referenceType = kind === "subject" ? "Subject" : kind[0].toUpperCase() + kind.slice(1);
    return [{
      id: asset.id,
      name: asset.name,
      kind,
      reference: `<${referenceType} ${counters[kind]}>`,
      detail: binding.role === "character" ? "角色素材" : binding.role === "scene" ? "场景素材" : binding.role === "prop" ? "道具素材" : binding.role === "audio" ? "音频素材" : "参考素材",
      tone: kind === "subject" ? "amber" : kind === "video" ? "green" : kind === "audio" ? "violet" : "blue",
      previewUrl: asset.previewUrl,
    }];
  });
}

function stringParam(params: Record<string, unknown>, key: string, fallback: string) {
  const value = params[key];
  return typeof value === "string" && value ? value : fallback;
}

function numberParam(params: Record<string, unknown>, key: string, fallback: number) {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeContextMode(value: string): ContextMode {
  if (value === "自动承接" || value === "片段承接") return "片段承接";
  if (value === "尾帧承接") return "尾帧承接";
  return "不承接";
}

function normalizePromptMode(params: Record<string, unknown>, task: GenerationTask): PromptMode {
  const stored = params.promptSource;
  if (stored === "ai" || stored === "user") return stored;
  if (task.aiPrompt?.trim() && task.finalPrompt === task.aiPrompt) return "ai";
  return "user";
}

function normalizeViewMode(params: Record<string, unknown>, key: string): H3PromptViewMode {
  return params[key] === "text" ? "text" : "visual";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function SegmentedChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="simple-segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "is-active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ContinuationRange({
  maxSeconds,
  start,
  end,
  onChange,
}: {
  maxSeconds: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const max = Math.max(0, Math.floor(maxSeconds));
  if (max < 1) {
    return <div className="simple-context-range-empty">当前任务前没有可承接的片段。</div>;
  }

  const safeEnd = clamp(Math.round(end), 1, max);
  const safeStart = clamp(Math.round(start), 0, safeEnd - 1);
  const left = (safeStart / max) * 100;
  const width = ((safeEnd - safeStart) / max) * 100;

  return (
    <div className="simple-context-range-control">
      <div className="simple-context-range-track">
        <span className="simple-context-range-selection" style={{ left: `${left}%`, width: `${width}%` }} />
        <input
          type="range"
          min={0}
          max={Math.max(0, max - 1)}
          step={1}
          value={safeStart}
          aria-label="承接起点"
          onChange={(event) => {
            const nextStart = Math.min(Number(event.target.value), safeEnd - 1);
            onChange(nextStart, safeEnd);
          }}
        />
        <input
          type="range"
          min={Math.min(max, safeStart + 1)}
          max={max}
          step={1}
          value={safeEnd}
          aria-label="承接终点"
          onChange={(event) => {
            const nextEnd = Math.max(Number(event.target.value), safeStart + 1);
            onChange(safeStart, nextEnd);
          }}
        />
      </div>
      <div className="simple-context-range-labels">
        <span>0s</span>
        <strong>{safeStart}s – {safeEnd}s · {safeEnd - safeStart}s</strong>
        <span>{max}s</span>
      </div>
    </div>
  );
}

export function TaskEditorDialog({
  open,
  task,
  assets,
  previousTaskDurationSeconds = 0,
  projectContext,
  onClose,
  onSave,
}: TaskEditorDialogProps) {
  const [promptMode, setPromptMode] = useState<PromptMode>("user");
  const [userViewMode, setUserViewMode] = useState<H3PromptViewMode>("visual");
  const [aiViewMode, setAiViewMode] = useState<H3PromptViewMode>("visual");
  const [taskTitle, setTaskTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("标准");
  const [generationMode, setGenerationMode] = useState("全能参考");
  const [contextMode, setContextMode] = useState<ContextMode>("片段承接");
  const [contextStartSeconds, setContextStartSeconds] = useState(0);
  const [contextEndSeconds, setContextEndSeconds] = useState(0);

  useEffect(() => {
    if (!open || !task) return;
    const params = task.generationParams ?? {};
    const initialPromptMode = normalizePromptMode(params, task);
    const storedUserPrompt = stringParam(params, "userPrompt", "");
    const initialUserPrompt = storedUserPrompt || (initialPromptMode === "user"
      ? task.finalPrompt || task.userIntent || task.summary || ""
      : task.userIntent || task.summary || "");
    const previousDuration = Math.max(0, Math.floor(previousTaskDurationSeconds));
    const legacyContextDuration = Math.max(1, numberParam(params, "contextDurationSeconds", 1));
    const defaultEnd = previousDuration;
    const defaultStart = Math.max(0, defaultEnd - Math.min(legacyContextDuration, Math.max(1, previousDuration)));
    const storedEnd = previousDuration > 0
      ? clamp(numberParam(params, "contextEndSeconds", defaultEnd), 1, previousDuration)
      : 0;
    const storedStart = storedEnd > 0
      ? clamp(numberParam(params, "contextStartSeconds", defaultStart), 0, storedEnd - 1)
      : 0;

    setPromptMode(initialPromptMode);
    setUserViewMode(normalizeViewMode(params, "userPromptViewMode"));
    setAiViewMode(normalizeViewMode(params, "aiPromptViewMode"));
    setTaskTitle(task.title);
    setEditingTitle(false);
    setUserPrompt(initialUserPrompt);
    setAiPrompt(task.aiPrompt || "");
    setDuration(task.plannedDurationSeconds || 6);
    setResolution(stringParam(params, "resolution", "1080p"));
    setQuality(stringParam(params, "quality", "标准"));
    setGenerationMode(stringParam(params, "generationMode", "全能参考"));
    setContextMode(normalizeContextMode(stringParam(params, "contextMode", "片段承接")));
    setContextStartSeconds(storedStart);
    setContextEndSeconds(storedEnd);
  }, [open, previousTaskDurationSeconds, task]);

  const promptAssets = useMemo(() => promptAssetsForTask(task, assets), [assets, task]);
  if (!task) return null;

  const previousDuration = Math.max(0, Math.floor(previousTaskDurationSeconds));
  const contextDurationSeconds = previousDuration > 0 ? Math.max(1, contextEndSeconds - contextStartSeconds) : 0;
  const activePrompt = promptMode === "ai" ? aiPrompt : userPrompt;
  const activeViewMode = promptMode === "ai" ? aiViewMode : userViewMode;
  const setActiveViewMode = promptMode === "ai" ? setAiViewMode : setUserViewMode;

  const save = () => {
    onSave({
      title: taskTitle.trim() || task.title,
      finalPrompt: activePrompt,
      aiPrompt,
      plannedDurationSeconds: duration,
      generationParams: {
        ...task.generationParams,
        resolution,
        quality,
        generationMode,
        contextMode,
        contextDurationSeconds,
        contextStartSeconds,
        contextEndSeconds,
        promptSource: promptMode,
        userPrompt,
        userPromptViewMode,
        aiPromptViewMode,
      },
    });
    onClose();
  };

  const titleNode = (
    <span className="task-dialog-title">
      <Clapperboard size={18} aria-hidden="true" />
      {editingTitle ? (
        <input
          autoFocus
          value={taskTitle}
          aria-label="任务名称"
          onChange={(event) => setTaskTitle(event.target.value)}
          onBlur={() => setEditingTitle(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setTaskTitle(task.title);
              setEditingTitle(false);
            }
          }}
        />
      ) : (
        <button type="button" className="task-dialog-title-edit" title="编辑任务名称" onClick={() => setEditingTitle(true)}>
          <span>{taskTitle || task.title}</span>
          <Pencil size={14} aria-hidden="true" />
        </button>
      )}
    </span>
  );

  return (
    <Dialog
      open={open}
      size="wide"
      title={titleNode}
      description={`任务编号 ${task.number}`}
      onClose={onClose}
    >
      <div className="simple-task-editor" data-testid="simple-task-editor">
        <aside className="simple-task-config" aria-label="任务配置">
          <header>任务配置</header>

          <section>
            <h3>生成参数</h3>
            <label>
              <span>分辨率</span>
              <SegmentedChoice
                label="分辨率"
                value={resolution}
                onChange={setResolution}
                options={[
                  { value: "480p", label: "480P" },
                  { value: "720p", label: "720P" },
                  { value: "1080p", label: "1080P" },
                ]}
              />
            </label>
            <label>
              <span>质量</span>
              <SegmentedChoice
                label="质量档位"
                value={quality}
                onChange={setQuality}
                options={[
                  { value: "快速", label: "快速" },
                  { value: "标准", label: "标准" },
                  { value: "高质量", label: "高质量" },
                ]}
              />
            </label>
            <label className="simple-slider-field">
              <span>总秒数 <strong>{duration} 秒</strong></span>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={duration}
                aria-label="总秒数"
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
          </section>

          <section>
            <h3>生成模式</h3>
            <SegmentedChoice
              label="生成模式"
              value={generationMode}
              onChange={setGenerationMode}
              options={[
                { value: "全能参考", label: "全能参考" },
                { value: "首尾帧", label: "首尾帧" },
              ]}
            />
          </section>

          <section className="simple-context-section">
            <h3>上下文承接</h3>
            <div className="simple-context-tabs" role="tablist" aria-label="上下文承接方式">
              {(["片段承接", "尾帧承接", "不承接"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={contextMode === mode}
                  className={contextMode === mode ? "is-active" : ""}
                  onClick={() => setContextMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            {contextMode === "片段承接" && (
              <div className="simple-context-params simple-context-interval">
                <span className="simple-context-param-label">承接区间</span>
                <ContinuationRange
                  maxSeconds={previousDuration}
                  start={contextStartSeconds}
                  end={contextEndSeconds}
                  onChange={(start, end) => {
                    setContextStartSeconds(start);
                    setContextEndSeconds(end);
                  }}
                />
                <small>区间来自上一任务；新任务默认选择上一任务末尾 1 秒，可拖动两端调整。</small>
              </div>
            )}

            {contextMode === "尾帧承接" && (
              <p className="simple-context-note">使用上一任务最终帧作为本任务的起始视觉参考。</p>
            )}

            {contextMode === "不承接" && (
              <p className="simple-context-note">本任务独立生成，不引用上一任务的连续性信息。</p>
            )}
          </section>
        </aside>

        <section className="simple-prompt-editor" aria-label="提示词编辑">
          <header className="simple-prompt-head">
            <div className="simple-prompt-title-group">
              <h2>提示词编辑</h2>
              <div className="simple-prompt-view-tabs" role="tablist" aria-label={`${promptMode === "ai" ? "AI增强" : "用户"}提示词显示模式`}>
                <button type="button" role="tab" aria-selected={activeViewMode === "visual"} className={activeViewMode === "visual" ? "is-active" : ""} onClick={() => setActiveViewMode("visual")}><Eye size={13} /> 可视化</button>
                <button type="button" role="tab" aria-selected={activeViewMode === "text"} className={activeViewMode === "text" ? "is-active" : ""} onClick={() => setActiveViewMode("text")}><Code2 size={13} /> 文本</button>
              </div>
            </div>
            <div className="simple-prompt-tabs" role="tablist" aria-label="提示词版本">
              <button type="button" role="tab" aria-selected={promptMode === "user"} className={promptMode === "user" ? "is-active" : ""} onClick={() => setPromptMode("user")}>用户</button>
              <button type="button" role="tab" aria-selected={promptMode === "ai"} className={promptMode === "ai" ? "is-active" : ""} onClick={() => setPromptMode("ai")}><Sparkles size={13} /> AI 增强</button>
            </div>
          </header>

          <div className="simple-prompt-body">
            {promptMode === "user" ? (
              <H3PromptEditor
                value={userPrompt}
                onChange={setUserPrompt}
                assets={promptAssets}
                ariaLabel="用户提示词"
                viewMode={userViewMode}
              />
            ) : (
              <H3PromptEditor
                value={aiPrompt}
                onChange={setAiPrompt}
                assets={promptAssets}
                ariaLabel="AI 增强提示词"
                viewMode={aiViewMode}
              />
            )}
          </div>

          <footer className="simple-prompt-footer">
            <span><strong>@</strong> 输入 @ 引用当前任务资产</span>
            {promptMode === "ai" && projectContext?.useDescriptionForAiPrompt && projectContext.description.trim() && (
              <span className="simple-project-context-hint">AI 增强已启用项目背景</span>
            )}
          </footer>
        </section>

        <footer className="simple-task-editor-actions">
          <div className="simple-task-prompt-source">
            <span>{promptMode === "ai" ? "已使用AI增强提示词" : "当前使用：用户提示词"}</span>
          </div>
          <div className="simple-task-editor-action-buttons">
            <Button onClick={onClose}>取消</Button>
            <Button variant="accent" onClick={save}>保存</Button>
          </div>
        </footer>
      </div>
    </Dialog>
  );
}
