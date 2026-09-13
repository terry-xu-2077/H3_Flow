import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "terry-react-ui-library";

import { PromptAssetEditor, type PromptAsset } from "../../components/PromptAssetEditor";
import type { GenerationTask, ProjectAsset } from "../../domain/storyboard";
import { Dialog, PortalSelect } from "../../ui/overlay";

type TaskEditorPatch = Partial<Pick<GenerationTask,
  "aiPrompt" | "finalPrompt" | "generationParams" | "plannedDurationSeconds"
>>;

type TaskEditorDialogProps = {
  open: boolean;
  task?: GenerationTask;
  assets: ProjectAsset[];
  onClose: () => void;
  onSave: (patch: TaskEditorPatch) => void;
};

type PromptMode = "user" | "ai";

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

export function TaskEditorDialog({ open, task, assets, onClose, onSave }: TaskEditorDialogProps) {
  const [promptMode, setPromptMode] = useState<PromptMode>("user");
  const [userPrompt, setUserPrompt] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState("标准");
  const [generationMode, setGenerationMode] = useState("全能参考");
  const [contextMode, setContextMode] = useState("自动承接");

  useEffect(() => {
    if (!open || !task) return;
    const params = task.generationParams ?? {};
    setPromptMode("user");
    setUserPrompt(task.finalPrompt || task.userIntent || task.summary || "");
    setAiPrompt(task.aiPrompt || "");
    setDuration(task.plannedDurationSeconds || 6);
    setResolution(stringParam(params, "resolution", "1080p"));
    setQuality(stringParam(params, "quality", "标准"));
    setGenerationMode(stringParam(params, "generationMode", "全能参考"));
    setContextMode(stringParam(params, "contextMode", "自动承接"));
  }, [open, task]);

  const promptAssets = useMemo(() => promptAssetsForTask(task, assets), [assets, task]);
  if (!task) return null;

  const save = () => {
    onSave({
      finalPrompt: userPrompt,
      aiPrompt,
      plannedDurationSeconds: duration,
      generationParams: {
        ...task.generationParams,
        resolution,
        quality,
        generationMode,
        contextMode,
      },
    });
    onClose();
  };

  const useAiPrompt = () => {
    if (!aiPrompt.trim()) return;
    setUserPrompt(aiPrompt);
    setPromptMode("user");
  };

  return (
    <Dialog
      open={open}
      size="wide"
      title={`编辑分镜 · ${task.number}`}
      description={task.title}
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

          <section>
            <h3>上下文承接</h3>
            <PortalSelect
              value={contextMode}
              onChange={setContextMode}
              ariaLabel="上下文承接"
              options={[
                { value: "自动承接", label: "自动承接", detail: "系统自动使用上一分镜连续性" },
                { value: "尾帧承接", label: "尾帧承接", detail: "优先使用上一分镜尾帧" },
                { value: "不承接", label: "不承接", detail: "作为独立分镜生成" },
              ]}
            />
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
              <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} aria-label="AI 增强提示词" rows={18} placeholder="AI 增强结果会显示在这里。" />
              <footer>
                <span>AI 增强稿不会自动覆盖用户提示词。</span>
                <Button onClick={useAiPrompt} disabled={!aiPrompt.trim()}>采用增强结果</Button>
              </footer>
            </div>
          )}
        </section>

        <footer className="simple-task-editor-actions">
          <Button onClick={onClose}>取消</Button>
          <Button variant="accent" onClick={save}>保存</Button>
        </footer>
      </div>
    </Dialog>
  );
}
