import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Film,
  Link2,
  Pencil,
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
import { storyboardForDensity, type StoryboardDensity } from "../../mock/storyboardScenarios";
import { mockGenerationProfiles } from "../../mock/generationProfiles";
import { ScriptToTasksDialog } from "./ScriptToTasksDialog";
import { StoryReel } from "./StoryReel";
import { TaskEditorDialog } from "./TaskEditorDialog";
import { queueReadyTasks } from "./storyboardExecution";
import {
  insertTaskAfter,
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

type CardMenuState = { taskId: string; x: number; y: number } | null;

function sceneLabel(number: string) {
  return number.replace(/^Scene\s*/i, "场景 ");
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
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [cardMenu, setCardMenu] = useState<CardMenuState>(null);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);

  useEffect(() => {
    if (value === undefined) setLocalSnapshot(initialSnapshot);
    setSelectedTaskId(null);
    setEditorTaskId(null);
    setCardMenu(null);
    setMessage("");
  }, [initialSnapshot]);

  useEffect(() => {
    if (!focusTaskId || !snapshot.tasks.some((task) => task.id === focusTaskId)) return;
    setSelectedTaskId(focusTaskId);
  }, [focusTaskId, snapshot.tasks]);

  useEffect(() => {
    if (!cardMenu) return;
    const close = () => setCardMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cardMenu]);

  const scenes = useMemo(
    () => snapshot.scenes.slice().sort((left, right) => left.orderKey.localeCompare(right.orderKey)),
    [snapshot.scenes],
  );
  const selectedTask = selectedTaskId ? snapshot.tasks.find((task) => task.id === selectedTaskId) : undefined;
  const editorTask = editorTaskId ? snapshot.tasks.find((task) => task.id === editorTaskId) : undefined;
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
      generationParams: { aspectRatio: "16:9", resolution: "1080p", quality: "标准", generationMode: "全能参考", contextMode: "自动承接" },
      contextLinkIds: [],
      state: "draft",
      jobIds: [],
    };
    setSnapshot((current) => insertTaskAfter(current, task, sceneId));
    setSelectedTaskId(task.id);
    setEditorTaskId(task.id);
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
        generationParams: { aspectRatio: "16:9", resolution: "1080p", quality: "标准", generationMode: "全能参考", contextMode: "自动承接" },
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

  const openEditor = (taskId: string) => {
    setSelectedTaskId(taskId);
    setEditorTaskId(taskId);
    setCardMenu(null);
  };

  if (reelOpen) return <StoryReel snapshot={snapshot} onClose={() => setReelOpen(false)} />;

  return (
    <div className={`director-storyboard ${selectedTask ? "has-readonly-panel" : ""}`} data-testid="director-storyboard">
      <header className="director-storyboard-head">
        <div>
          <h1>故事板</h1>
          <p>单击查看，双击或右键编辑。复杂设置只在编辑窗口中出现。</p>
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
                  <span>{sceneLabel(scene.number)}</span>
                  <h2>{scene.title || "未命名场景"}</h2>
                  <small>{scene.location || "地点待定"} · {scene.timeOfDay || "时间待定"}</small>
                </div>
                <em>{tasks.length} 个分镜 · {duration} 秒</em>
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
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedTaskId(task.id);
                        setCardMenu({ taskId: task.id, x: event.clientX, y: event.clientY });
                      }}
                    >
                      <button
                        type="button"
                        className="director-shot-open"
                        onClick={() => setSelectedTaskId(task.id)}
                        onDoubleClick={() => openEditor(task.id)}
                        aria-label={`查看 ${task.number} ${task.title}`}
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
                          <footer><Clock3 size={12} /> {task.plannedDurationSeconds ? `${task.plannedDurationSeconds} 秒` : "时长待定"}</footer>
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

      {selectedTask && (
        <aside className="director-detail director-readonly-detail" aria-label="分镜信息">
          <header>
            <div><span>{selectedTask.number}</span><h2>{selectedTask.title}</h2></div>
            <button type="button" onClick={() => setSelectedTaskId(null)} aria-label="关闭分镜信息"><X size={18} /></button>
          </header>

          <div className="director-detail-preview" style={selectedTask.storyboardFrame.previewUrl ? { backgroundImage: `url("${selectedTask.storyboardFrame.previewUrl}")` } : undefined}>
            {!selectedTask.storyboardFrame.previewUrl && <Film size={30} />}
          </div>

          <section className="director-readonly-section">
            <span>画面描述</span>
            <p>{selectedTask.summary || "还没有画面描述"}</p>
          </section>

          <section className="director-readonly-grid">
            <div><span>时长</span><strong>{selectedTask.plannedDurationSeconds ? `${selectedTask.plannedDurationSeconds} 秒` : "待定"}</strong></div>
            <div><span>状态</span><strong>{stateLabel[selectedTask.state]}</strong></div>
          </section>

          <section className="director-readonly-section">
            <span>素材</span>
            <div className="director-asset-chips">
              {selectedTask.assetBindings.length === 0 ? <small>还没有绑定素材</small> : selectedTask.assetBindings.map((binding) => {
                const asset = snapshot.assets.find((item) => item.id === binding.assetId);
                return <span key={binding.assetId}>{asset?.name ?? "未知素材"}</span>;
              })}
            </div>
          </section>

          <section className="director-continuity">
            {(() => {
              const context = listContextForTask(snapshot, selectedTask.id).filter((link) => link.targetTaskId === selectedTask.id);
              const stale = context.some((link) => link.stale);
              if (stale) return <><AlertTriangle size={16} /><div><strong>上一分镜有变更</strong><span>连续性需要重新同步。</span></div></>;
              if (context.length > 0) return <><Link2 size={16} /><div><strong>已衔接上一分镜</strong><span>角色、画面和运动连续性由系统维护。</span></div></>;
              return <><Check size={16} /><div><strong>独立起始分镜</strong><span>不依赖前序生成结果。</span></div></>;
            })()}
          </section>

          <p className="director-readonly-hint">双击卡片或右键选择“编辑分镜”进行修改。</p>
        </aside>
      )}

      {cardMenu && (
        <div
          className="director-card-menu"
          style={{ left: cardMenu.x, top: cardMenu.y }}
          role="menu"
          aria-label="分镜菜单"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={() => openEditor(cardMenu.taskId)}><Pencil size={14} /> 编辑分镜</button>
        </div>
      )}

      <TaskEditorDialog
        open={Boolean(editorTask)}
        task={editorTask}
        assets={snapshot.assets}
        onClose={() => setEditorTaskId(null)}
        onSave={(patch) => {
          if (!editorTask) return;
          setSnapshot((current) => {
            let next = current;
            if (patch.plannedDurationSeconds !== undefined) {
              next = updateTaskIntent(next, editorTask.id, { plannedDurationSeconds: patch.plannedDurationSeconds });
            }
            next = updateTaskComposerFields(next, editorTask.id, {
              aiPrompt: patch.aiPrompt,
              finalPrompt: patch.finalPrompt,
              generationParams: patch.generationParams,
            });
            return next;
          });
          setMessage("分镜已保存");
        }}
      />

      <ScriptToTasksDialog
        open={scriptDialogOpen}
        scenes={scenes}
        defaultSceneId={defaultSceneId}
        onClose={() => setScriptDialogOpen(false)}
        onAccept={acceptTaskProposals}
      />
    </div>
  );
}
