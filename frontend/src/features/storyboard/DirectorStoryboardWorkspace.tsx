import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock3,
  Film,
  ImagePlus,
  Link2,
  LoaderCircle,
  Play,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "terry-react-ui-library";

import {
  listContextForTask,
  listTasksInStoryOrder,
  type GenerationTask,
  type GenerationTaskState,
  type StoryboardDomainSnapshot,
  type TaskProposal,
} from "../../domain/storyboard";
import type { GenerationTaskCardView } from "../../types";
import { TaskComposer } from "../../components/TaskComposer";
import { storyboardForDensity, type StoryboardDensity } from "../../mock/storyboardScenarios";
import { mockGenerationProfiles } from "../../mock/generationProfiles";
import { AssetPickerDialog } from "../assets/AssetPickerDialog";
import { ScriptToTasksDialog } from "./ScriptToTasksDialog";
import { StoryReel } from "./StoryReel";
import { queueReadyTasks } from "./storyboardExecution";
import {
  insertTaskAfter,
  replaceTaskAssetBindings,
  updateTaskComposerFields,
  updateTaskIntent,
} from "./storyboardMutations";

const stateLabel: Record<GenerationTaskState, string> = {
  draft: "待完善",
  "prompt-generating": "准备中",
  "prompt-ready": "待确认",
  ready: "可生成",
  queued: "排队中",
  running: "生成中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  blocked: "等待前序",
  "context-stale": "需同步",
};

const stateTone: Record<GenerationTaskState, string> = {
  draft: "quiet",
  "prompt-generating": "working",
  "prompt-ready": "working",
  ready: "ready",
  queued: "quiet",
  running: "working",
  completed: "done",
  failed: "danger",
  cancelled: "quiet",
  blocked: "warning",
  "context-stale": "warning",
};

type DirectorStoryboardWorkspaceProps = {
  density: StoryboardDensity;
  providerOnline?: boolean;
  value?: StoryboardDomainSnapshot;
  onChange?: Dispatch<SetStateAction<StoryboardDomainSnapshot>>;
  focusTaskId?: string | null;
};

function taskToComposerView(task: GenerationTask): GenerationTaskCardView {
  return {
    id: task.id,
    number: task.number,
    title: task.title,
    summary: task.summary,
    state: task.state,
    progress: task.progress,
    assetCount: task.assetBindings.length,
    plannedDurationLabel: task.plannedDurationSeconds ? `${task.plannedDurationSeconds}s` : "—",
    visualBeatCount: task.visualBeats.length,
    assetBindings: task.assetBindings.map((binding) => ({ ...binding })),
    scriptSource: task.scriptSource,
    userIntent: task.userIntent,
    aiPrompt: task.aiPrompt,
    finalPrompt: task.finalPrompt,
    visualBeats: task.visualBeats.map((beat) => ({ ...beat })),
    generationProfileId: task.generationProfileId,
    generationProfileLabel: task.generationProfileLabel,
  };
}

export function DirectorStoryboardWorkspace({
  density,
  providerOnline = true,
  value,
  onChange,
  focusTaskId,
}: DirectorStoryboardWorkspaceProps) {
  const initialSnapshot = useMemo(() => storyboardForDensity(density), [density]);
  const [localSnapshot, setLocalSnapshot] = useState(initialSnapshot);
  const snapshot = value ?? localSnapshot;
  const setSnapshot = onChange ?? setLocalSnapshot;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [advancedTaskId, setAdvancedTaskId] = useState<string | null>(null);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);

  useEffect(() => {
    if (value === undefined) setLocalSnapshot(initialSnapshot);
    setSelectedTaskId(null);
    setDetailTaskId(null);
    setAdvancedTaskId(null);
    setMessage("");
  }, [initialSnapshot, value]);

  useEffect(() => {
    if (!focusTaskId || !snapshot.tasks.some((task) => task.id === focusTaskId)) return;
    setSelectedTaskId(focusTaskId);
    setDetailTaskId(focusTaskId);
  }, [focusTaskId, snapshot.tasks]);

  const scenes = useMemo(
    () => snapshot.scenes.slice().sort((left, right) => left.orderKey.localeCompare(right.orderKey)),
    [snapshot.scenes],
  );
  const selectedTask = selectedTaskId ? snapshot.tasks.find((task) => task.id === selectedTaskId) : undefined;
  const detailTask = detailTaskId ? snapshot.tasks.find((task) => task.id === detailTaskId) : undefined;
  const advancedTask = advancedTaskId ? snapshot.tasks.find((task) => task.id === advancedTaskId) : undefined;
  const defaultSceneId = scenes[0]?.id ?? "";

  const nextIdentity = () => {
    sequence.current += 1;
    const serial = String(snapshot.tasks.length + sequence.current).padStart(3, "0");
    return { id: `task-director-${Date.now()}-${sequence.current}`, number: `S01-${serial}` };
  };

  const createShot = (sceneId: string) => {
    const identity = nextIdentity();
    const task: GenerationTask = {
      ...identity,
      title: "未命名分镜",
      summary: "描述这个画面里发生什么。",
      scriptSource: "",
      userIntent: "",
      storyboardFrame: { sourceType: "placeholder", updatedAt: new Date().toISOString() },
      visualBeats: [],
      assetBindings: [],
      plannedDurationSeconds: 6,
      generationProfileId: "profile-h3-multi-shot",
      generationProfileLabel: "H3 · Multi-shot",
      aiPrompt: "",
      finalPrompt: "",
      promptRevisions: [],
      generationParams: { aspectRatio: "16:9" },
      contextLinkIds: [],
      state: "draft",
      jobIds: [],
    };
    setSnapshot((current) => insertTaskAfter(current, task, sceneId));
    setSelectedTaskId(task.id);
    setDetailTaskId(task.id);
    setMessage("已添加一个空白分镜");
  };

  const createScene = () => {
    const nextIndex = scenes.length + 1;
    const id = `scene-director-${Date.now()}`;
    setSnapshot((current) => ({
      ...current,
      scenes: [...current.scenes, {
        id,
        number: `Scene ${String(nextIndex).padStart(2, "0")}`,
        title: "未命名场景",
        summary: "",
        orderKey: String(nextIndex).padStart(6, "0"),
        location: "地点待定",
        timeOfDay: "时间待定",
        notes: "",
      }],
    }));
    setMessage("已添加新场景");
  };

  const acceptTaskProposals = (proposals: TaskProposal[]) => {
    let next = snapshot;
    const createdIds: string[] = [];
    proposals.forEach((proposal) => {
      const identity = nextIdentity();
      const task: GenerationTask = {
        ...identity,
        title: proposal.title,
        summary: proposal.summary,
        scriptSource: proposal.scriptExcerpt,
        userIntent: proposal.userIntent,
        storyboardFrame: { sourceType: "placeholder", updatedAt: new Date().toISOString() },
        visualBeats: proposal.visualBeats.map((beat, index) => ({ ...beat, id: `${identity.id}-beat-${index + 1}` })),
        assetBindings: proposal.suggestedAssetIds.map((assetId) => ({ assetId, role: "reference" as const })),
        plannedDurationSeconds: proposal.plannedDurationSeconds,
        generationProfileId: proposal.suggestedProfileId,
        generationProfileLabel: proposal.suggestedProfileLabel,
        aiPrompt: "",
        finalPrompt: "",
        promptRevisions: [],
        generationParams: { aspectRatio: "16:9" },
        contextLinkIds: [],
        state: "draft",
        jobIds: [],
      };
      next = insertTaskAfter(next, task, proposal.targetSceneId || defaultSceneId);
      createdIds.push(task.id);
    });
    setSnapshot(next);
    setSelectedTaskId(createdIds.at(-1) ?? null);
    setMessage(`已从剧本创建 ${createdIds.length} 个分镜`);
  };

  const queueAllReady = () => {
    if (!providerOnline) {
      setMessage("生成服务未连接，暂时不能开始生成");
      return;
    }
    const result = queueReadyTasks(snapshot, snapshot.tasks.map((task) => task.id), mockGenerationProfiles);
    setSnapshot(result.snapshot);
    setMessage(result.queuedIds.length > 0
      ? `已将 ${result.queuedIds.length} 个可生成分镜加入队列`
      : "当前没有可直接生成的分镜");
  };

  const queueSelected = () => {
    if (!detailTask) return;
    if (!providerOnline) {
      setMessage("生成服务未连接，暂时不能开始生成");
      return;
    }
    const result = queueReadyTasks(snapshot, [detailTask.id], mockGenerationProfiles);
    setSnapshot(result.snapshot);
    setMessage(result.queuedIds.length > 0 ? "已加入生成队列" : "这个分镜还需要完善后才能生成");
  };

  if (advancedTask) {
    return (
      <TaskComposer
        task={taskToComposerView(advancedTask)}
        onClose={() => setAdvancedTaskId(null)}
        onTaskChange={(patch) => setSnapshot((current) => updateTaskComposerFields(current, advancedTask.id, patch))}
      />
    );
  }

  if (reelOpen) return <StoryReel snapshot={snapshot} onClose={() => setReelOpen(false)} />;

  return (
    <div className="director-storyboard" data-testid="director-storyboard">
      <header className="director-storyboard-head">
        <div>
          <span className="director-kicker">DIRECTOR MODE</span>
          <h1>故事板</h1>
          <p>按故事顺序摆好画面，确认后直接生成。复杂参数只在需要时出现。</p>
        </div>
        <div className="director-head-actions">
          <Button onClick={() => setReelOpen(true)}><Play size={15} /> 连续预览</Button>
          <Button onClick={() => setScriptDialogOpen(true)}><Sparkles size={15} /> 导入剧本</Button>
          <Button variant="accent" onClick={queueAllReady} disabled={!providerOnline}><WandSparkles size={15} /> 批量生成</Button>
        </div>
      </header>

      <div className="director-subbar">
        <button type="button" onClick={createScene}><Plus size={14} /> 添加场景</button>
        <span>{snapshot.tasks.length} 个分镜</span>
        {message && <strong role="status">{message}</strong>}
      </div>

      <main className="director-scene-list" aria-label="故事板画布">
        {scenes.map((scene) => {
          const tasks = listTasksInStoryOrder(snapshot, scene.id);
          const duration = tasks.reduce((sum, task) => sum + task.plannedDurationSeconds, 0);
          return (
            <section className="director-scene" key={scene.id} data-testid={`director-scene-${scene.id}`}>
              <header className="director-scene-head">
                <div>
                  <span>{scene.number}</span>
                  <h2>{scene.title || "未命名场景"}</h2>
                  <small>{scene.location || "地点待定"} · {scene.timeOfDay || "时间待定"}</small>
                </div>
                <em>{tasks.length} 个分镜 · {duration}s</em>
              </header>

              <div className="director-shot-grid">
                {tasks.map((task) => {
                  const previewUrl = snapshot.results.find((result) => result.id === task.primaryResultId)?.previewUrl
                    ?? task.storyboardFrame.previewUrl;
                  const selected = selectedTaskId === task.id;
                  return (
                    <article
                      key={task.id}
                      className={`director-shot-card is-${stateTone[task.state]} ${selected ? "is-selected" : ""}`}
                      data-task-id={task.id}
                      tabIndex={0}
                      onClick={() => setSelectedTaskId(task.id)}
                      onDoubleClick={() => setDetailTaskId(task.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setDetailTaskId(task.id);
                      }}
                    >
                      <button
                        type="button"
                        className="director-shot-open"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTaskId(task.id);
                          setDetailTaskId(task.id);
                        }}
                        aria-label={`编辑 ${task.number} ${task.title}`}
                      >
                        <div className="director-shot-frame" style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}>
                          {!previewUrl && <Film size={28} />}
                          {task.state === "running" && <span className="director-shot-progress">{task.progress ?? 0}%</span>}
                        </div>
                        <div className="director-shot-body">
                          <div className="director-shot-meta">
                            <span>{task.number}</span>
                            <em>{stateLabel[task.state]}</em>
                          </div>
                          <h3>{task.title || "未命名分镜"}</h3>
                          <p>{task.summary || "还没有画面描述"}</p>
                          <footer><Clock3 size={12} /> {task.plannedDurationSeconds ? `${task.plannedDurationSeconds}s` : "时长待定"}</footer>
                        </div>
                      </button>
                    </article>
                  );
                })}

                <button type="button" className="director-add-shot" onClick={() => createShot(scene.id)}>
                  <Plus size={22} />
                  <span>添加分镜</span>
                </button>
              </div>
            </section>
          );
        })}
      </main>

      {detailTask && (
        <aside className="director-detail" aria-label="分镜详情">
          <header>
            <div><span>{detailTask.number}</span><h2>{detailTask.title}</h2></div>
            <button type="button" onClick={() => setDetailTaskId(null)} aria-label="关闭分镜详情"><X size={18} /></button>
          </header>

          <div className="director-detail-preview" style={detailTask.storyboardFrame.previewUrl ? { backgroundImage: `url("${detailTask.storyboardFrame.previewUrl}")` } : undefined}>
            {!detailTask.storyboardFrame.previewUrl && <Film size={30} />}
          </div>

          <label className="director-field">
            <span>画面描述</span>
            <textarea
              value={detailTask.summary}
              rows={5}
              onChange={(event) => setSnapshot((current) => updateTaskIntent(current, detailTask.id, { summary: event.target.value }))}
            />
          </label>

          <label className="director-field director-duration-field">
            <span>时长</span>
            <div><input
              type="number"
              min={1}
              max={60}
              value={detailTask.plannedDurationSeconds || 1}
              onChange={(event) => setSnapshot((current) => updateTaskIntent(current, detailTask.id, { plannedDurationSeconds: Number(event.target.value) || 1 }))}
            /><em>秒</em></div>
          </label>

          <section className="director-detail-section">
            <header><span>素材</span><button type="button" onClick={() => setAssetPickerOpen(true)}><ImagePlus size={14} /> 添加素材</button></header>
            <div className="director-asset-chips">
              {detailTask.assetBindings.length === 0 ? <small>还没有绑定素材</small> : detailTask.assetBindings.map((binding) => {
                const asset = snapshot.assets.find((item) => item.id === binding.assetId);
                return <span key={binding.assetId}>{asset?.name ?? binding.assetId}</span>;
              })}
            </div>
          </section>

          <section className="director-continuity">
            {(() => {
              const context = listContextForTask(snapshot, detailTask.id).filter((link) => link.targetTaskId === detailTask.id);
              const stale = context.some((link) => link.stale);
              if (stale) return <><AlertTriangle size={16} /><div><strong>上一分镜有变更</strong><span>建议同步连续性后再生成。</span></div></>;
              if (context.length > 0) return <><Link2 size={16} /><div><strong>已自动衔接上一分镜</strong><span>角色、画面和运动连续性由系统维护。</span></div></>;
              return <><Check size={16} /><div><strong>独立起始分镜</strong><span>不依赖前序生成结果。</span></div></>;
            })()}
          </section>

          <div className="director-detail-actions">
            <Button variant="accent" onClick={queueSelected} disabled={!providerOnline || detailTask.state === "running" || detailTask.state === "queued"}>
              {detailTask.state === "running" ? <LoaderCircle size={15} /> : <WandSparkles size={15} />}
              {detailTask.state === "running" ? "生成中" : "生成视频"}
            </Button>
            <Button onClick={() => setAdvancedTaskId(detailTask.id)}>高级设置 <ChevronRight size={15} /></Button>
          </div>
        </aside>
      )}

      <ScriptToTasksDialog
        open={scriptDialogOpen}
        scenes={scenes}
        defaultSceneId={defaultSceneId}
        onClose={() => setScriptDialogOpen(false)}
        onAccept={acceptTaskProposals}
      />
      <AssetPickerDialog
        open={assetPickerOpen}
        assets={snapshot.assets}
        initialBindings={detailTask?.assetBindings ?? []}
        onClose={() => setAssetPickerOpen(false)}
        onConfirm={(bindings) => {
          if (detailTask) setSnapshot((current) => replaceTaskAssetBindings(current, detailTask.id, bindings));
          setAssetPickerOpen(false);
        }}
      />
    </div>
  );
}
