import {
  Folder,
  Grid2X2,
  Home,
  List,
  Pencil,
  Play,
  Plus,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Button } from "terry-react-ui-library";

import {
  listTasksInStoryOrder,
  type GenerationTask,
  type Result,
  type StoryboardDomainSnapshot,
} from "../../domain/storyboard";
import type {
  PromptReviewItem,
  VideoBatchEligibility,
  VideoBatchResponse,
} from "../../gateways/batchReviewGateway";
import type { DirectorProject } from "../../mock/projects";
import type {
  PromptEnhancementRequest,
  PromptEnhancementResponse,
} from "../../services/promptEnhancement";
import { ContextMenu, Dialog } from "../../ui/overlay";
import { TaskEditorDialog } from "../storyboard/TaskEditorDialog";
import { updateTaskComposerFields } from "../storyboard/storyboardMutations";
import {
  BatchActionBar,
  BatchPromptDialog,
  BatchVideoDialog,
  type PromptBatchOptions,
} from "./BatchReviewControls";
import { ProjectConfigPanel } from "./ProjectConfigPanel";

export { CreateProjectDialog, ProjectHome } from "./ProjectWorkspace";

type TaskViewMode = "list" | "card";
type DisplayStatus = "idle" | "running" | "completed" | "failed";
type TaskEditorPatch = Partial<Pick<GenerationTask,
  "title" | "aiPrompt" | "finalPrompt" | "generationParams" | "plannedDurationSeconds" | "assetBindings"
>>;
type ProjectSettingsPatch = Pick<DirectorProject, "title" | "description" | "useDescriptionForAiPrompt">;
type BatchPromptSubmit = (request: {
  taskIds: string[];
  includeProjectBackground: boolean;
  includePreviousTaskSummary: boolean;
}) => Promise<unknown>;

const taskStatusLabel: Record<DisplayStatus, string> = {
  idle: "未开始",
  running: "进行中",
  completed: "已完成",
  failed: "失败",
};

function displayTaskStatus(task: GenerationTask): DisplayStatus {
  if (task.state === "completed") return "completed";
  if (task.state === "running" || task.state === "queued") return "running";
  if (task.state === "failed") return "failed";
  return "idle";
}

function orderedTasks(snapshot: StoryboardDomainSnapshot) {
  return snapshot.scenes
    .slice()
    .sort((left, right) => left.orderKey.localeCompare(right.orderKey))
    .flatMap((scene) => listTasksInStoryOrder(snapshot, scene.id));
}

function taskResult(snapshot: StoryboardDomainSnapshot, task: GenerationTask) {
  const primary = task.primaryResultId
    ? snapshot.results.find((result) => result.id === task.primaryResultId)
    : undefined;
  if (primary) return primary;
  const jobIds = new Set(snapshot.jobs.filter((job) => job.taskId === task.id).map((job) => job.id));
  return snapshot.results.slice().reverse().find((result) => result.videoUrl && jobIds.has(result.jobId));
}

function taskPreview(snapshot: StoryboardDomainSnapshot, task: GenerationTask) {
  return taskResult(snapshot, task)?.previewUrl ?? task.storyboardFrame.previewUrl;
}

function resultCount(snapshot: StoryboardDomainSnapshot, taskId: string) {
  const jobIds = new Set(snapshot.jobs.filter((job) => job.taskId === taskId).map((job) => job.id));
  return snapshot.results.filter((result) => jobIds.has(result.jobId)).length;
}

function promptSummary(task: GenerationTask) {
  return task.finalPrompt || task.userIntent || task.summary || "还没有提示词";
}

function makeDraftTask(snapshot: StoryboardDomainSnapshot): GenerationTask {
  const serial = snapshot.tasks.length + 1;
  return {
    id: `task-local-${Date.now()}`,
    number: `T01-${String(serial).padStart(3, "0")}`,
    title: `新任务 ${serial}`,
    summary: "等待填写提示词。",
    scriptSource: "",
    userIntent: "",
    storyboardFrame: { sourceType: "placeholder", updatedAt: new Date().toISOString() },
    visualBeats: [],
    assetBindings: [],
    plannedDurationSeconds: 6,
    generationProfileId: "profile-h3-multi-shot",
    generationProfileLabel: "H3",
    aiPrompt: "",
    finalPrompt: "",
    promptRevisions: [],
    generationParams: {
      aspectRatio: "16:9",
      resolution: "1080p",
      quality: "标准",
      generationMode: "全能参考",
      contextMode: "片段承接",
      promptSource: "user",
      userPromptViewMode: "visual",
      aiPromptViewMode: "visual",
    },
    contextLinkIds: [],
    state: "draft",
    jobIds: [],
  };
}

function TaskPreview({ previewUrl, compact = false }: { previewUrl?: string; compact?: boolean }) {
  return (
    <div className={`task-preview ${compact ? "is-compact" : ""}`} style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}>
      {!previewUrl && <Play size={compact ? 22 : 44} />}
    </div>
  );
}

function TaskInfoPanel({ snapshot, task, review, onPlayResult }: {
  snapshot: StoryboardDomainSnapshot;
  task?: GenerationTask;
  review?: PromptReviewItem;
  onPlayResult: (result: Result, task: GenerationTask) => void;
}) {
  if (!task) return <aside className="project-task-info" aria-label="任务信息"><div className="project-task-info-empty">选择一个任务查看信息</div></aside>;
  const params = task.generationParams ?? {};
  const status = displayTaskStatus(task);
  const result = taskResult(snapshot, task);
  const preview = taskPreview(snapshot, task);
  return (
    <aside className="project-task-info" aria-label="任务信息">
      {result ? <button type="button" className="task-result-preview-button" onClick={() => onPlayResult(result, task)} aria-label={`播放任务 ${task.title} 的生成结果`}><TaskPreview previewUrl={preview} /><span className="task-result-play"><Play size={25} fill="currentColor" /></span></button> : <TaskPreview previewUrl={preview} />}
      <h2>任务名：{task.title}</h2>
      <section className="project-info-block"><h3>提示词</h3><p>{promptSummary(task)}</p></section>
      <section className="project-info-block">
        <h3>生成参数</h3>
        <dl>
          <div><dt>状态</dt><dd><span className={`workspace-status-dot is-${status}`} />{taskStatusLabel[status]}</dd></div>
          <div><dt>提示词</dt><dd className={`task-review-inline is-${review?.promptReviewStatus ?? "pending"}`}>{review?.promptReviewStatus === "approved" ? "已检查" : "待检查"}</dd></div>
          <div><dt>时长</dt><dd>{task.plannedDurationSeconds || 0} 秒</dd></div>
          <div><dt>分辨率</dt><dd>{String(params.resolution ?? "1080P").toUpperCase()}</dd></div>
          <div><dt>质量</dt><dd>{String(params.quality ?? "标准")}</dd></div>
        </dl>
      </section>
    </aside>
  );
}

export function ProjectWorkspace({
  project,
  promptReviewItems,
  onBack,
  onRenameProject,
  onLoadTaskEditor,
  onCreateTask,
  onUpdateTask,
  onSaveProjectConfiguration,
  onEnhancePrompt,
  onBatchEnhancePrompts,
  onApprovePrompt,
  onCheckVideoBatchEligibility,
  onCreateVideoBatch,
}: {
  project: DirectorProject;
  promptReviewItems: PromptReviewItem[];
  onBack: () => void;
  onRenameProject: (title: string) => Promise<void>;
  onLoadTaskEditor: (taskId: string) => Promise<GenerationTask>;
  onCreateTask: (task: GenerationTask) => Promise<string>;
  onUpdateTask: (task: GenerationTask) => Promise<void>;
  onSaveProjectConfiguration: (settings: ProjectSettingsPatch, assets: DirectorProject["snapshot"]["assets"]) => Promise<void>;
  onEnhancePrompt: (request: PromptEnhancementRequest) => Promise<PromptEnhancementResponse>;
  onBatchEnhancePrompts: BatchPromptSubmit;
  onApprovePrompt: (taskId: string) => Promise<PromptReviewItem>;
  onCheckVideoBatchEligibility: (taskIds: string[]) => Promise<VideoBatchEligibility>;
  onCreateVideoBatch: (taskIds: string[]) => Promise<VideoBatchResponse>;
}) {
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [batchSelectedTaskIds, setBatchSelectedTaskIds] = useState<Set<string>>(() => new Set());
  const [batchAnchorIndex, setBatchAnchorIndex] = useState<number | null>(null);
  const [batchPromptOpen, setBatchPromptOpen] = useState(false);
  const [batchPromptBusy, setBatchPromptBusy] = useState(false);
  const [batchVideoOpen, setBatchVideoOpen] = useState(false);
  const [batchVideoLoading, setBatchVideoLoading] = useState(false);
  const [batchVideoSubmitting, setBatchVideoSubmitting] = useState(false);
  const [batchVideoEligibility, setBatchVideoEligibility] = useState<VideoBatchEligibility>();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [loadedEditingTask, setLoadedEditingTask] = useState<GenerationTask | null>(null);
  const [draftTask, setDraftTask] = useState<GenerationTask | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectConfigOpen, setProjectConfigOpen] = useState(false);
  const [playing, setPlaying] = useState<{ result: Result; task: GenerationTask } | null>(null);

  const tasks = useMemo(() => orderedTasks(project.snapshot), [project.snapshot]);
  const reviews = useMemo(() => new Map(promptReviewItems.map((item) => [item.taskId, item])), [promptReviewItems]);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const editingTask = draftTask ?? loadedEditingTask;
  const editingTaskIndex = editingTask && !draftTask ? tasks.findIndex((task) => task.id === editingTask.id) : -1;
  const previousEditingTask = draftTask ? tasks.at(-1) : editingTaskIndex > 0 ? tasks[editingTaskIndex - 1] : undefined;
  const previousTaskDurationSeconds = previousEditingTask?.plannedDurationSeconds ?? 0;
  const previousTaskSummary = previousEditingTask ? previousEditingTask.summary.trim() || previousEditingTask.userIntent.trim() || previousEditingTask.title : "";
  const runningTask = tasks.find((task) => ["running", "queued"].includes(task.state));
  const selectedIdsInOrder = tasks.filter((task) => batchSelectedTaskIds.has(task.id)).map((task) => task.id);

  useEffect(() => {
    if (selectedTaskId && tasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId(tasks[0]?.id ?? null);
  }, [selectedTaskId, tasks]);
  useEffect(() => {
    const validIds = new Set(tasks.map((task) => task.id));
    setBatchSelectedTaskIds((current) => new Set([...current].filter((id) => validIds.has(id))));
  }, [tasks]);
  useEffect(() => setRenameValue(project.title), [project.title]);

  const openExistingEditor = async (taskId: string) => {
    setSelectedTaskId(taskId);
    setDraftTask(null);
    setLoadedEditingTask(null);
    try {
      const task = await onLoadTaskEditor(taskId);
      setEditingTaskId(taskId);
      setLoadedEditingTask(task);
    } catch (error) { console.error("Failed to load task editor", error); }
  };
  const openNewTask = () => { setDraftTask(makeDraftTask(project.snapshot)); setEditingTaskId(null); setLoadedEditingTask(null); };
  const closeEditor = () => { setDraftTask(null); setEditingTaskId(null); setLoadedEditingTask(null); };

  const handleTaskSelection = (event: ReactMouseEvent<HTMLButtonElement>, taskId: string, index: number) => {
    setSelectedTaskId(taskId);
    if (event.shiftKey && batchAnchorIndex !== null) {
      const start = Math.min(batchAnchorIndex, index);
      const end = Math.max(batchAnchorIndex, index);
      setBatchSelectedTaskIds(new Set(tasks.slice(start, end + 1).map((task) => task.id)));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setBatchAnchorIndex(index);
      setBatchSelectedTaskIds((current) => { const next = new Set(current); if (next.has(taskId)) next.delete(taskId); else next.add(taskId); return next; });
      return;
    }
    setBatchAnchorIndex(index);
    setBatchSelectedTaskIds(new Set());
  };
  const clearBatchSelection = () => { setBatchSelectedTaskIds(new Set()); setBatchAnchorIndex(null); };

  const submitBatchPromptEnhancement = async (options: PromptBatchOptions) => {
    if (!selectedIdsInOrder.length || batchPromptBusy) return;
    setBatchPromptBusy(true);
    try {
      await onBatchEnhancePrompts({ taskIds: selectedIdsInOrder, includeProjectBackground: options.includeProjectBackground, includePreviousTaskSummary: options.includePreviousTaskSummary });
      setBatchPromptOpen(false);
      await openExistingEditor(selectedIdsInOrder[0]);
    } catch (error) { console.error("Failed to batch enhance prompts", error); }
    finally { setBatchPromptBusy(false); }
  };

  const updatedTaskFromPatch = (patch: TaskEditorPatch) => {
    if (!editingTaskId || !editingTask) return undefined;
    const { title, plannedDurationSeconds, ...composerPatch } = patch;
    const next = updateTaskComposerFields(
      { ...project.snapshot, tasks: project.snapshot.tasks.map((task) => task.id === editingTaskId ? editingTask : task) },
      editingTaskId,
      composerPatch,
    );
    const updated = next.tasks.find((task) => task.id === editingTaskId);
    return updated ? { ...updated, ...(typeof title === "string" && title.trim() ? { title: title.trim() } : {}), ...(typeof plannedDurationSeconds === "number" ? { plannedDurationSeconds } : {}) } : undefined;
  };

  const saveTask = (patch: TaskEditorPatch) => {
    if (draftTask) {
      const finalPrompt = patch.finalPrompt ?? draftTask.finalPrompt;
      const savedTask: GenerationTask = { ...draftTask, ...patch, summary: finalPrompt.trim() || draftTask.summary, generationParams: { ...draftTask.generationParams, ...(patch.generationParams ?? {}) } };
      void onCreateTask(savedTask).then((taskId) => setSelectedTaskId(taskId)).catch((error) => console.error("Failed to create task", error));
      closeEditor();
      return;
    }
    const updated = updatedTaskFromPatch(patch);
    if (updated) void onUpdateTask(updated).catch((error) => console.error("Failed to update task", error));
    closeEditor();
  };

  const approveAndNext = async (patch: TaskEditorPatch) => {
    if (!editingTaskId) return;
    const currentId = editingTaskId;
    const nextId = editingTaskIndex >= 0 && editingTaskIndex < tasks.length - 1 ? tasks[editingTaskIndex + 1].id : undefined;
    const updated = updatedTaskFromPatch(patch);
    if (updated) await onUpdateTask(updated);
    await onApprovePrompt(currentId);
    if (nextId) await openExistingEditor(nextId);
    else await openExistingEditor(currentId);
  };

  const openVideoBatch = async () => {
    if (!selectedIdsInOrder.length) return;
    setBatchVideoOpen(true);
    setBatchVideoEligibility(undefined);
    setBatchVideoLoading(true);
    try { setBatchVideoEligibility(await onCheckVideoBatchEligibility(selectedIdsInOrder)); }
    catch (error) { console.error("Failed to check video batch eligibility", error); }
    finally { setBatchVideoLoading(false); }
  };
  const submitVideoBatch = async () => {
    if (!batchVideoEligibility?.eligibleTaskIds.length || batchVideoSubmitting) return;
    setBatchVideoSubmitting(true);
    try {
      await onCreateVideoBatch(selectedIdsInOrder);
      setBatchVideoOpen(false);
      clearBatchSelection();
    } catch (error) { console.error("Failed to create video batch", error); }
    finally { setBatchVideoSubmitting(false); }
  };

  return (
    <main className="project-workspace-page" aria-label="项目工作台">
      <header className="project-workspace-topbar">
        <button type="button" className="workspace-home-button" onClick={onBack} aria-label="返回项目首页"><Home size={18} /> 返回首页</button>
        <div className="workspace-project-title"><Folder size={24} /><strong>{project.title}</strong><button type="button" aria-label="重命名项目" onClick={() => setRenameOpen(true)}><Pencil size={17} /></button></div>
        <div className="workspace-top-actions">
          <button type="button" className="workspace-project-config-button" aria-label="项目配置" onClick={() => setProjectConfigOpen(true)}><SlidersHorizontal size={16} /><span>项目配置</span></button>
          <div className="workspace-view-switch" aria-label="任务视图"><button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")}><List size={15} /> 表格</button><span>/</span><button type="button" className={viewMode === "card" ? "is-active" : ""} onClick={() => setViewMode("card")}><Grid2X2 size={15} /> 卡片</button></div>
        </div>
      </header>

      <div className="project-workspace-body">
        <section className="project-task-area" aria-label="任务区域">
          {viewMode === "list" ? (
            <div className="task-list-view">
              <button type="button" className="task-list-row" style={{ borderStyle: "dashed" }} onClick={openNewTask} aria-label="新建任务卡"><div className="task-preview is-compact"><Plus size={24} /></div><div className="task-list-copy"><strong>新建任务卡</strong><span>点击创建新的生成任务</span></div><div className="task-list-stats"><span>当前 {tasks.length} 个任务</span><span>创建后进入任务编辑</span></div><div className="task-list-status"><Plus size={14} />新建</div></button>
              {tasks.map((task, index) => {
                const status = displayTaskStatus(task);
                const versions = resultCount(project.snapshot, task.id);
                const batchSelected = batchSelectedTaskIds.has(task.id);
                const reviewed = reviews.get(task.id)?.promptReviewStatus === "approved";
                return <ContextMenu key={task.id} actions={[{ label: "编辑任务", onSelect: () => openExistingEditor(task.id) }]}><button type="button" className={`task-list-row ${selectedTaskId === task.id ? "is-selected" : ""} ${batchSelected ? "is-batch-selected" : ""}`} onClick={(event) => handleTaskSelection(event, task.id, index)} onDoubleClick={() => openExistingEditor(task.id)}><TaskPreview previewUrl={taskPreview(project.snapshot, task)} compact /><div className="task-list-copy"><strong>#{index + 1} {task.title}</strong><span>提示词 {promptSummary(task)}</span></div><div className="task-list-stats"><span>使用{task.assetBindings.length}个资产</span><span>{reviewed ? "已检查" : "待检查"} · {versions > 0 ? `${versions}个生成版本` : "无生成结果"}</span></div><div className={`task-list-status is-${status}`}><i />{taskStatusLabel[status]}</div></button></ContextMenu>;
              })}
            </div>
          ) : (
            <div className="task-card-view">
              <button type="button" className="task-create-card" onClick={openNewTask}><div><Plus size={46} /></div><strong>新建任务卡</strong></button>
              {tasks.map((task, index) => {
                const status = displayTaskStatus(task);
                const versions = resultCount(project.snapshot, task.id);
                const batchSelected = batchSelectedTaskIds.has(task.id);
                const reviewed = reviews.get(task.id)?.promptReviewStatus === "approved";
                return <ContextMenu key={task.id} actions={[{ label: "编辑任务", onSelect: () => openExistingEditor(task.id) }]}><button type="button" className={`task-card-item ${selectedTaskId === task.id ? "is-selected" : ""} ${batchSelected ? "is-batch-selected" : ""}`} onClick={(event) => handleTaskSelection(event, task.id, index)} onDoubleClick={() => openExistingEditor(task.id)}><div className="task-card-preview-wrap"><TaskPreview previewUrl={taskPreview(project.snapshot, task)} /><span className={`task-card-status is-${status}`}><i />{taskStatusLabel[status]}</span></div><strong>#{index + 1} {task.title}</strong><p>提示词 {promptSummary(task)}</p><footer>{reviewed ? "已检查" : "待检查"} · 使用{task.assetBindings.length}个资产 · {versions > 0 ? `${versions}个生成版本` : "无生成结果"}</footer></button></ContextMenu>;
              })}
            </div>
          )}
          <BatchActionBar selectedCount={batchSelectedTaskIds.size} onEnhance={() => setBatchPromptOpen(true)} onGenerate={() => void openVideoBatch()} onClear={clearBatchSelection} enhanceDisabled={batchPromptBusy} />
        </section>

        <TaskInfoPanel snapshot={project.snapshot} task={selectedTask} review={selectedTask ? reviews.get(selectedTask.id) : undefined} onPlayResult={(result, task) => setPlaying({ result, task })} />
      </div>

      <footer className="project-workspace-statusbar"><button type="button" onClick={() => setSettingsOpen(true)}><Settings size={16} /> 设置</button><div>{runningTask ? <><span className="workspace-running-dot" />当前运行：{project.title} · 任务名：{runningTask.title}</> : <><span className="workspace-idle-dot" />当前没有正在运行的任务</>}</div></footer>

      <TaskEditorDialog
        open={Boolean(editingTask)} task={editingTask ?? undefined} assets={project.snapshot.assets}
        previousTaskDurationSeconds={previousTaskDurationSeconds} previousTaskId={previousEditingTask?.id} previousTaskSummary={previousTaskSummary}
        isNewTask={Boolean(draftTask)} reviewStatus={editingTaskId ? reviews.get(editingTaskId)?.promptReviewStatus ?? "pending" : "pending"}
        projectContext={{ description: project.description, useDescriptionForAiPrompt: project.useDescriptionForAiPrompt }}
        reviewNavigation={draftTask ? undefined : { index: editingTaskIndex, total: tasks.length, canPrevious: editingTaskIndex > 0, canNext: editingTaskIndex >= 0 && editingTaskIndex < tasks.length - 1, onPrevious: () => { if (editingTaskIndex > 0) void openExistingEditor(tasks[editingTaskIndex - 1].id); }, onNext: () => { if (editingTaskIndex >= 0 && editingTaskIndex < tasks.length - 1) void openExistingEditor(tasks[editingTaskIndex + 1].id); } }}
        onEnhancePrompt={onEnhancePrompt} onApproveAndNext={draftTask ? undefined : approveAndNext} onClose={closeEditor} onSave={saveTask}
      />

      <BatchPromptDialog open={batchPromptOpen} taskCount={batchSelectedTaskIds.size} projectBackgroundAvailable={project.useDescriptionForAiPrompt && Boolean(project.description.trim())} busy={batchPromptBusy} onClose={() => setBatchPromptOpen(false)} onConfirm={(options) => void submitBatchPromptEnhancement(options)} />
      <BatchVideoDialog open={batchVideoOpen} selectedCount={batchSelectedTaskIds.size} eligibility={batchVideoEligibility} loading={batchVideoLoading} submitting={batchVideoSubmitting} onClose={() => setBatchVideoOpen(false)} onConfirm={() => void submitVideoBatch()} />

      <ProjectConfigPanel open={projectConfigOpen} project={project} onClose={() => setProjectConfigOpen(false)} onSave={(settings, assets) => { void onSaveProjectConfiguration(settings, assets).catch((error) => console.error("Failed to save project configuration", error)); }} />

      <Dialog open={renameOpen} title="重命名项目" onClose={() => setRenameOpen(false)}><div className="project-simple-dialog"><label><span>项目名称</span><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} /></label><footer><Button onClick={() => setRenameOpen(false)}>取消</Button><Button variant="accent" onClick={() => { const next = renameValue.trim(); if (next) void onRenameProject(next).catch((error) => console.error("Failed to rename project", error)); setRenameOpen(false); }}>保存</Button></footer></div></Dialog>
      <Dialog open={Boolean(playing)} title={playing ? `播放结果 · ${playing.task.title}` : "播放结果"} onClose={() => setPlaying(null)}>{playing && <div className="task-playback-dialog"><video controls autoPlay={false} poster={playing.result.previewUrl} src={playing.result.videoUrl} /><footer><span>{playing.task.number}</span><Button onClick={() => setPlaying(null)}>关闭</Button></footer></div>}</Dialog>
      <Dialog open={settingsOpen} title="设置" onClose={() => setSettingsOpen(false)}><div className="project-settings-placeholder"><Settings size={22} /><h3>应用设置</h3><p>生成服务与应用级低频设置从这里进入；项目自身的信息和资产请使用右上角“项目配置”。</p><Button onClick={() => setSettingsOpen(false)}>关闭</Button></div></Dialog>
    </main>
  );
}
