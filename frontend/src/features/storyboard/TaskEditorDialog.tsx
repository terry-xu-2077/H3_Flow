import { Clapperboard, Pencil, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "terry-react-ui-library";

import { PromptAssetEditor, type PromptAsset } from "../../components/PromptAssetEditor";
import type { GenerationTask, ProjectAsset } from "../../domain/storyboard";
import { Dialog, PortalSelect } from "../../ui/overlay";

type TaskEditorPatch = Partial<Pick<GenerationTask,
  "title" | "aiPrompt" | "finalPrompt" | "generationParams" | "plannedDurationSeconds"
>>;

type TaskEditorSave = { bivarianceHack(patch: TaskEditorPatch): void }["bivarianceHack"];

type TaskEditorDialogProps = {
  open: boolean;
  task?: GenerationTask;
  assets: ProjectAsset[];
  onClose: () => void;
  onSave: TaskEditorSave;
};

type PromptMode = "user" | "ai";
type ContextMode = "片段承接" | "尾帧承接" | "不承接";

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

export function TaskEditorDialog({ open, task, assets, onClose, onSave }: TaskEditorDialogProps) {
  const [promptMode, setPromptMode] = useState<PromptMode>("user");
  const [taskTitle, setTaskTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("标准");
  const [generationMode, setGenerationMode] = useState("全能参考");
  const [contextMode, setContextMode] = useState<ContextMode>("片段承接");
  const [contextDurationSeconds, setContextDurationSeconds] = useState(3);

  useEffect(() => {
    if (!open || !task) return;
    const params = task.generationParams ?? {};
    const initialPromptMode = normalizePromptMode(params, task);
    const storedUserPrompt = stringParam(params, "userPrompt", "");
    const initialUserPrompt = storedUserPrompt || (initialPromptMode === "user"
      ? task.finalPrompt || task.userIntent || task.summary || ""
      : task.userIntent || task.summary || "");

    setPromptMode(initialPromptMode);
    setTaskTitle(task.title);
    setEditingTitle(false);
    setUserPrompt(initialUserPrompt);
    setAiPrompt(task.aiPrompt || "");
    setDuration(task.plannedDurationSeconds || 6);
    setResolution(stringParam(params, "resolution", "1080p"));
    setQuality(stringParam(params, "quality", "标准"));
    setGenerationMode(stringParam(params, "generationMode", "全能参考"));
    setContextMode(normalizeContextMode(stringParam(params, "contextMode", "片段承接")));
    setContextDurationSeconds(Math.max(1, numberParam(params, "contextDurationSeconds", 3)));
  }, [open, task]);

  const promptAssets = useMemo(() => promptAssetsForTask(task, assets), [assets, task]);
  if (!task) return null;

  const maxContextDuration = Math.max(1, Math.min(15, duration));
  const activePrompt = promptMode === "ai" ? aiPrompt : userPrompt;

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
        contextDurationSeconds: Math.min(contextDurationSeconds, maxContextDuration),
        promptSource: promptMode,
        userPrompt,
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
              <PortalSelect
                value={resolution}
                onChange={setResolution}
                ariaLabel="分辨率"
                options={[
                  { value: "720p", label: "720P" },
                  { value: "1080p", label: "1080P" },
                  { value: "2K", label: "2K" },
                ]}
              />
            </label>
            <label>
              <span>质量</span>
              <PortalSelect
                value={quality}
                onChange={setQuality}
                ariaLabel="质量档位"
                options={[
                  { value: "快速", label: "快速" },
                  { value: "标准", label: "标准" },
                  { value: "高质量", label: "高质量" },
                ]}
              />
            </label>
            <label className="simple-duration-input">
              <span>总秒数</span>
              <div><input type="number" min={1} max={60} value={duration} onChange={(event) => setDuration(Math.max(1, Number(event.target.value) || 1))} /><em>秒</em></div>
            </label>
          </section>

          <section>
            <h3>生成模式</h3>
            <PortalSelect
              value={generationMode}
              onChange={setGenerationMode}
              ariaLabel="生成模式"
              options={[
                { value: "全能参考", label: "全能参考", detail: "角色、场景与参考素材共同参与" },
                { value: "首尾帧", label: "首尾帧", detail: "重点约束开头和结尾画面" },
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
              <div className="simple-context-params">
                <label className="simple-duration-input">
                  <span>承接时长</span>
                  <div>
                    <input
                      type="number"
                      min={1}
                      max={maxContextDuration}
                      value={contextDurationSeconds}
                      onChange={(event) => setContextDurationSeconds(Math.min(maxContextDuration, Math.max(1, Number(event.target.value) || 1)))}
                    />
                    <em>秒</em>
                  </div>
                </label>
                <small>从上一任务末尾取一段画面与运动信息作为连续性参考。</small>
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
            <h2>提示词编辑</h2>
            <div className="simple-prompt-tabs" role="tablist" aria-label="提示词版本">
              <button type="button" role="tab" aria-selected={promptMode === "user"} className={promptMode === "user" ? "is-active" : ""} onClick={() => setPromptMode("user")}>用户</button>
              <button type="button" role="tab" aria-selected={promptMode === "ai"} className={promptMode === "ai" ? "is-active" : ""} onClick={() => setPromptMode("ai")}><Sparkles size={13} /> AI 增强</button>
            </div>
          </header>

          {promptMode === "user" ? (
            <div className="simple-prompt-body">
              <PromptAssetEditor
                value={userPrompt}
                onChange={setUserPrompt}
                assets={promptAssets}
                ariaLabel="用户提示词"
                rows={18}
              />
            </div>
          ) : (
            <div className="simple-prompt-body simple-ai-prompt">
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                aria-label="AI 增强提示词"
                rows={18}
                placeholder="AI 增强结果会显示在这里。"
              />
            </div>
          )}

          <footer className="simple-prompt-footer">
            <span><strong>@</strong> 输入 @ 引用当前任务资产</span>
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
