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
import { useEffect, useMemo, useState } from "react";
import { Button } from "terry-react-ui-library";

import {
  listTasksInStoryOrder,
  type GenerationTask,
  type Result,
  type StoryboardDomainSnapshot,
} from "../../domain/storyboard";
import type { DirectorProject } from "../../mock/projects";
import { ContextMenu, Dialog } from "../../ui/overlay";
import { TaskEditorDialog } from "../storyboard/TaskEditorDialog";
import { insertTaskAfter, updateTaskComposerFields } from "../storyboard/storyboardMutations";
import { ProjectConfigPanel } from "./ProjectConfigPanel";

export { CreateProjectDialog, ProjectHome } from "./ProjectWorkspace";

type TaskViewMode = "list" | "card";
type DisplayStatus = "idle" | "running" | "completed" | "failed";
type TaskEditorPatch = Partial<Pick<GenerationTask,
  "title" | "aiPrompt" | "finalPrompt" | "generationParams" | "plannedDurationSeconds"
>>;
type ProjectSettingsPatch = Pick<DirectorProject, "title" | "description" | "useDescriptionForAiPrompt">;

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
  return snapshot.results.slice().reverse().find((result) => jobIds.has(result.jobId));
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
    <div
      className={`task-preview ${compact ? "is-compact" : ""}`}
      style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
    >
      {!previewUrl && <Play size={compact ? 22 : 44} />}
    </div>
  );
}

function TaskInfoPanel({
  snapshot,
  task,
  onPlayResult,
}: {
  snapshot: StoryboardDomainSnapshot;
  task?: GenerationTask;
  onPlayResult: (result: Result, task: GenerationTask) => void;
}) {
  if (!task) {
    return (
      <aside className="project-task-info" aria-label="任务信息">
        <div className="project-task-info-empty">选择一个任务查看信息</div>
      </aside>
    );
  }

  const params = task.generationParams ?? {};
  const status = displayTaskStatus(task);
  const result = taskResult(snapshot, task);
  const preview = taskPreview(snapshot, task);

  return (
    <aside className="project-task-info" aria-label="任务信息">
      {result ? (
        <button type="button" className="task-result-preview-button" onClick={() => onPlayResult(result, task)} aria-label={`播放任务 ${task.title} 的生成结果`}>
          <TaskPreview previewUrl={preview} />
          <span className="task-result-play"><Play size={25} fill="currentColor" /></span>
        </button>
      ) : (
        <TaskPreview previewUrl={preview} />
      )}
      <h2>任务名：{task.title}</h2>
      <section className="project-info-block">
        <h3>提示词</h3>
        <p>{promptSummary(task)}</p>
      </section>
      <section className="project-info-block">
        <h3>生成参数</h3>
        <dl>
          <div><dt>状态</dt><dd><span className={`workspace-status-dot is-${status}`} />{taskStatusLabel[status]}</dd></div>
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
  onBack,
  onRenameProject,
  onUpdateProjectSettings,
  onSnapshotChange,
}: {
  project: DirectorProject;
  onBack: () => void;
  onRenameProject: (title: string) => void;
  onUpdateProjectSettings: (settings: ProjectSettingsPatch) => void;
  onSnapshotChange: (snapshot: StoryboardDomainSnapshot) => void;
}) {
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draftTask, setDraftTask] = useState<GenerationTask | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectConfigOpen, setProjectConfigOpen] = useState(false);
  const [playing, setPlaying] = useState<{ result: Result; task: GenerationTask } | null>(null);

  const tasks = useMemo(() => orderedTasks(project.snapshot), [project.snapshot]);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const editingTask = draftTask ?? tasks.find((task) => task.id === editingTaskId);
  const runningTask = tasks.find((task) => ["running", "queued"].includes(task.state));

  useEffect(() => {
    if (selectedTaskId && tasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId(tasks[0]?.id ?? null);
  }, [selectedTaskId, tasks]);

  useEffect(() => setRenameValue(project.title), [project.title]);

  const openExistingEditor = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDraftTask(null);
    setEditingTaskId(taskId);
  };

  const openNewTask = () => {
    setDraftTask(makeDraftTask(project.snapshot));
    setEditingTaskId(null);
  };

  const closeEditor = () => {
    setDraftTask(null);
    setEditingTaskId(null);
  };

  const saveTask = (patch: TaskEditorPatch) => {
    if (draftTask) {
      const firstSceneId = project.snapshot.scenes.slice().sort((a, b) => a.orderKey.localeCompare(b.orderKey))[0]?.id;
      if (!firstSceneId) return;
      const finalPrompt = patch.finalPrompt ?? draftTask.finalPrompt;
      const savedTask: GenerationTask = {
        ...draftTask,
        ...patch,
        summary: finalPrompt.trim() || draftTask.summary,
        generationParams: { ...draftTask.generationParams, ...(patch.generationParams ?? {}) },
      };
      const next = insertTaskAfter(project.snapshot, savedTask, firstSceneId);
      onSnapshotChange(next);
      setSelectedTaskId(savedTask.id);
      closeEditor();
      return;
    }

    if (!editingTaskId) return;
    const { title, plannedDurationSeconds, ...composerPatch } = patch;
    let next = updateTaskComposerFields(project.snapshot, editingTaskId, composerPatch);
    next = {
      ...next,
      tasks: next.tasks.map((task) => task.id === editingTaskId
        ? {
            ...task,
            ...(typeof title === "string" && title.trim() ? { title: title.trim() } : {}),
            ...(typeof plannedDurationSeconds === "number" ? { plannedDurationSeconds } : {}),
          }
        : task),
    };
    onSnapshotChange(next);
    closeEditor();
  };

  return (
    <main className="project-workspace-page" aria-label="项目工作台">
      <header className="project-workspace-topbar">
        <button type="button" className="workspace-home-button" onClick={onBack} aria-label="返回项目首页"><Home size={18} /> 返回首页</button>
        <div className="workspace-project-title">
          <Folder size={24} />
          <strong>{project.title}</strong>
          <button type="button" aria-label="重命名项目" onClick={() => setRenameOpen(true)}><Pencil size={17} /></button>
        </div>
        <div className="workspace-top-actions">
          <button type="button" className="workspace-project-config-button" aria-label="项目配置" onClick={() => setProjectConfigOpen(true)}><SlidersHorizontal size={16} /><span>项目配置</span></button>
          <div className="workspace-view-switch" aria-label="任务视图">
            <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")}><List size={15} /> 表格</button>
            <span>/</span>
            <button type="button" className={viewMode === "card" ? "is-active" : ""} onClick={() => setViewMode("card")}><Grid2X2 size={15} /> 卡片</button>
          </div>
        </div>
      </header>

      <div className="project-workspace-body">
        <section className="project-task-area" aria-label="任务区域">
          <header className="task-workspace-toolbar">
            <Button variant="accent" onClick={openNewTask}><Plus size={15} /> 新建任务</Button>
            <span>{tasks.length} 个任务</span>
          </header>

          {viewMode === "list" ? (
            <div className="task-list-view">
              {tasks.length === 0 ? (
                <div className="task-list-empty"><p>当前项目还没有任务。</p></div>
              ) : tasks.map((task, index) => {
                const status = displayTaskStatus(task);
                const versions = resultCount(project.snapshot, task.id);
                return (
                  <ContextMenu key={task.id} actions={[{ label: "编辑任务", onSelect: () => openExistingEditor(task.id) }]}>
                    <button type="button" className={`task-list-row ${selectedTaskId === task.id ? "is-selected" : ""}`} onClick={() => setSelectedTaskId(task.id)} onDoubleClick={() => openExistingEditor(task.id)}>
                      <TaskPreview previewUrl={taskPreview(project.snapshot, task)} compact />
                      <div className="task-list-copy"><strong>#{index + 1} {task.title}</strong><span>提示词 {promptSummary(task)}</span></div>
                      <div className="task-list-stats"><span>使用{task.assetBindings.length}个资产</span><span>{versions > 0 ? `${versions}个生成版本` : "无生成结果"}</span></div>
                      <div className={`task-list-status is-${status}`}><i />{taskStatusLabel[status]}</div>
                    </button>
                  </ContextMenu>
                );
              })}
            </div>
          ) : (
            <div className="task-card-view">
              <button type="button" className="task-create-card" onClick={openNewTask}><div><Plus size={46} /></div><strong>新建任务卡</strong></button>
              {tasks.map((task, index) => {
                const status = displayTaskStatus(task);
                const versions = resultCount(project.snapshot, task.id);
                return (
                  <ContextMenu key={task.id} actions={[{ label: "编辑任务", onSelect: () => openExistingEditor(task.id) }]}>
                    <button type="button" className={`task-card-item ${selectedTaskId === task.id ? "is-selected" : ""}`} onClick={() => setSelectedTaskId(task.id)} onDoubleClick={() => openExistingEditor(task.id)}>
                      <div className="task-card-preview-wrap"><TaskPreview previewUrl={taskPreview(project.snapshot, task)} /><span className={`task-card-status is-${status}`}><i />{taskStatusLabel[status]}</span></div>
                      <strong>#{index + 1} {task.title}</strong>
                      <p>提示词 {promptSummary(task)}</p>
                      <footer>使用{task.assetBindings.length}个资产 · {versions > 0 ? `${versions}个生成版本` : "无生成结果"}</footer>
                    </button>
                  </ContextMenu>
                );
              })}
            </div>
          )}
        </section>

        <TaskInfoPanel snapshot={project.snapshot} task={selectedTask} onPlayResult={(result, task) => setPlaying({ result, task })} />
      </div>

      <footer className="project-workspace-statusbar">
        <button type="button" onClick={() => setSettingsOpen(true)}><Settings size={16} /> 设置</button>
        <div>{runningTask ? <><span className="workspace-running-dot" />当前运行：{project.title} · 任务名：{runningTask.title}</> : <><span className="workspace-idle-dot" />当前没有正在运行的任务</>}</div>
      </footer>

      <TaskEditorDialog
        open={Boolean(editingTask)}
        task={editingTask}
        assets={project.snapshot.assets}
        projectContext={{ description: project.description, useDescriptionForAiPrompt: project.useDescriptionForAiPrompt }}
        onClose={closeEditor}
        onSave={saveTask}
      />

      <ProjectConfigPanel
        open={projectConfigOpen}
        project={project}
        onClose={() => setProjectConfigOpen(false)}
        onSave={(settings, assets) => {
          onUpdateProjectSettings(settings);
          const keptAssetIds = new Set(assets.map((asset) => asset.id));
          onSnapshotChange({
            ...project.snapshot,
            assets,
            tasks: project.snapshot.tasks.map((task) => ({
              ...task,
              assetBindings: task.assetBindings.filter((binding) => keptAssetIds.has(binding.assetId)),
            })),
          });
        }}
      />

      <Dialog open={renameOpen} title="重命名项目" onClose={() => setRenameOpen(false)}>
        <div className="project-simple-dialog">
          <label><span>项目名称</span><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} /></label>
          <footer><Button onClick={() => setRenameOpen(false)}>取消</Button><Button variant="accent" onClick={() => { const next = renameValue.trim(); if (next) onRenameProject(next); setRenameOpen(false); }}>保存</Button></footer>
        </div>
      </Dialog>

      <Dialog open={Boolean(playing)} title={playing ? `播放结果 · ${playing.task.title}` : "播放结果"} onClose={() => setPlaying(null)}>
        {playing && <div className="task-playback-dialog"><video controls autoPlay={false} poster={playing.result.previewUrl} src={playing.result.videoUrl} /><footer><span>{playing.task.number}</span><Button onClick={() => setPlaying(null)}>关闭</Button></footer></div>}
      </Dialog>

      <Dialog open={settingsOpen} title="设置" onClose={() => setSettingsOpen(false)}>
        <div className="project-settings-placeholder"><Settings size={22} /><h3>应用设置</h3><p>生成服务与应用级低频设置从这里进入；项目自身的信息和资产请使用右上角“项目配置”。</p><Button onClick={() => setSettingsOpen(false)}>关闭</Button></div>
      </Dialog>
    </main>
  );
}
