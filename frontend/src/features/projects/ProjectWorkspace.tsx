import {
  Check,
  Folder,
  Grid2X2,
  List,
  Pencil,
  Play,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "terry-react-ui-library";

import {
  listTasksInStoryOrder,
  type GenerationTask,
  type StoryboardDomainSnapshot,
} from "../../domain/storyboard";
import type { DirectorProject } from "../../mock/projects";
import { ContextMenu, Dialog } from "../../ui/overlay";
import { TaskEditorDialog } from "../storyboard/TaskEditorDialog";
import { insertTaskAfter, updateTaskComposerFields } from "../storyboard/storyboardMutations";

type TaskViewMode = "list" | "card";
type DisplayStatus = "idle" | "running" | "completed" | "failed";

type TaskEditorPatch = Partial<Pick<GenerationTask,
  "aiPrompt" | "finalPrompt" | "generationParams" | "plannedDurationSeconds"
>>;

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

function projectStatus(project: DirectorProject): DisplayStatus {
  const tasks = project.snapshot.tasks;
  if (tasks.some((task) => ["running", "queued"].includes(task.state))) return "running";
  if (tasks.length > 0 && tasks.every((task) => task.state === "completed")) return "completed";
  if (tasks.some((task) => task.state === "failed")) return "failed";
  return "idle";
}

function projectStatusLabel(status: DisplayStatus) {
  if (status === "running") return "正在生成中";
  return taskStatusLabel[status];
}

function orderedTasks(snapshot: StoryboardDomainSnapshot) {
  return snapshot.scenes
    .slice()
    .sort((left, right) => left.orderKey.localeCompare(right.orderKey))
    .flatMap((scene) => listTasksInStoryOrder(snapshot, scene.id));
}

function taskPreview(snapshot: StoryboardDomainSnapshot, task: GenerationTask) {
  const primary = task.primaryResultId
    ? snapshot.results.find((result) => result.id === task.primaryResultId)
    : undefined;
  const taskJobIds = new Set(snapshot.jobs.filter((job) => job.taskId === task.id).map((job) => job.id));
  const latest = snapshot.results.slice().reverse().find((result) => taskJobIds.has(result.jobId));
  return primary?.previewUrl ?? latest?.previewUrl ?? task.storyboardFrame.previewUrl;
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
      contextMode: "自动承接",
    },
    contextLinkIds: [],
    state: "draft",
    jobIds: [],
  };
}

export function ProjectHome({
  projects,
  onOpenProject,
  onCreateProject,
}: {
  projects: DirectorProject[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
}) {
  return (
    <main className="project-home" aria-label="项目首页">
      <header className="project-home-title">
        <span />
        <h1>Terry导演工作台</h1>
        <span />
      </header>

      <section className="project-folder-grid" aria-label="项目列表">
        {projects.map((project, index) => {
          const status = projectStatus(project);
          return (
            <button
              key={project.id}
              type="button"
              className={`project-folder-card is-${status}`}
              onClick={() => onOpenProject(project.id)}
              aria-label={`打开项目 ${project.title}`}
            >
              <div className="project-folder-tab">
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <span><i />{projectStatusLabel(status)}</span>
              </div>
              <div
                className="project-folder-cover"
                style={project.coverUrl ? { backgroundImage: `url("${project.coverUrl}")` } : undefined}
              >
                {!project.coverUrl && <span>封面区域</span>}
              </div>
              <h2>{project.title}</h2>
              <footer>{project.snapshot.tasks.length}个任务 {project.snapshot.assets.length}个资产</footer>
            </button>
          );
        })}

        <button type="button" className="project-folder-card project-create-card" onClick={onCreateProject}>
          <div><Plus size={30} /><span>新建项目</span></div>
        </button>
      </section>

      <div className="project-home-bottom-line" />
    </main>
  );
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

function TaskInfoPanel({ snapshot, task }: { snapshot: StoryboardDomainSnapshot; task?: GenerationTask }) {
  if (!task) {
    return (
      <aside className="project-task-info" aria-label="任务信息">
        <div className="project-task-info-empty">选择一个任务查看信息</div>
      </aside>
    );
  }

  const params = task.generationParams ?? {};
  const status = displayTaskStatus(task);
  const prompt = promptSummary(task);
  return (
    <aside className="project-task-info" aria-label="任务信息">
      <TaskPreview previewUrl={taskPreview(snapshot, task)} />
      <h2>任务名：{task.title}</h2>

      <section className="project-info-block">
        <h3>提示词</h3>
        <p>{prompt}</p>
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
  onSnapshotChange,
}: {
  project: DirectorProject;
  onBack: () => void;
  onRenameProject: (title: string) => void;
  onSnapshotChange: (snapshot: StoryboardDomainSnapshot) => void;
}) {
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draftTask, setDraftTask] = useState<GenerationTask | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    const task = makeDraftTask(project.snapshot);
    setDraftTask(task);
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
    const { plannedDurationSeconds, ...composerPatch } = patch;
    let next = updateTaskComposerFields(project.snapshot, editingTaskId, composerPatch);
    if (typeof plannedDurationSeconds === "number") {
      next = {
        ...next,
        tasks: next.tasks.map((task) => task.id === editingTaskId
          ? { ...task, plannedDurationSeconds }
          : task),
      };
    }
    onSnapshotChange(next);
    closeEditor();
  };

  return (
    <main className="project-workspace-page" aria-label="项目工作台">
      <header className="project-workspace-topbar">
        <button type="button" className="workspace-brand" onClick={onBack}>Terry导演工作台</button>
        <div className="workspace-project-title">
          <Folder size={24} />
          <strong>{project.title}</strong>
          <button type="button" aria-label="重命名项目" onClick={() => setRenameOpen(true)}><Pencil size={17} /></button>
        </div>
        <div className="workspace-view-switch" aria-label="任务视图">
          <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")}><List size={15} /> 表格</button>
          <span>/</span>
          <button type="button" className={viewMode === "card" ? "is-active" : ""} onClick={() => setViewMode("card")}><Grid2X2 size={15} /> 卡片</button>
        </div>
      </header>

      <div className="project-workspace-body">
        <section className="project-task-area" aria-label="任务区域">
          {viewMode === "list" ? (
            <div className="task-list-view">
              <header className="task-list-toolbar">
                <Button variant="accent" onClick={openNewTask}><Plus size={15} /> 新建任务</Button>
                <span>{tasks.length} 个任务</span>
              </header>

              {tasks.length === 0 ? (
                <div className="task-list-empty"><p>当前项目还没有任务。</p></div>
              ) : tasks.map((task, index) => {
                const status = displayTaskStatus(task);
                const versions = resultCount(project.snapshot, task.id);
                return (
                  <ContextMenu key={task.id} actions={[{ label: "编辑任务", onSelect: () => openExistingEditor(task.id) }]}>
                    <button
                      type="button"
                      className={`task-list-row ${selectedTaskId === task.id ? "is-selected" : ""}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      onDoubleClick={() => openExistingEditor(task.id)}
                    >
                      <TaskPreview previewUrl={taskPreview(project.snapshot, task)} compact />
                      <div className="task-list-copy">
                        <strong>#{index + 1} {task.title}</strong>
                        <span>提示词 {promptSummary(task)}</span>
                      </div>
                      <div className="task-list-stats">
                        <span>使用{task.assetBindings.length}个资产</span>
                        <span>{versions > 0 ? `${versions}个生成版本` : "无生成结果"}</span>
                      </div>
                      <div className={`task-list-status is-${status}`}><i />{taskStatusLabel[status]}</div>
                    </button>
                  </ContextMenu>
                );
              })}
            </div>
          ) : (
            <div className="task-card-view">
              <button type="button" className="task-create-card" onClick={openNewTask}>
                <div><Plus size={46} /></div>
                <strong>新建任务卡</strong>
              </button>

              {tasks.map((task, index) => {
                const status = displayTaskStatus(task);
                const versions = resultCount(project.snapshot, task.id);
                return (
                  <ContextMenu key={task.id} actions={[{ label: "编辑任务", onSelect: () => openExistingEditor(task.id) }]}>
                    <button
                      type="button"
                      className={`task-card-item ${selectedTaskId === task.id ? "is-selected" : ""}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      onDoubleClick={() => openExistingEditor(task.id)}
                    >
                      <div className="task-card-preview-wrap">
                        <TaskPreview previewUrl={taskPreview(project.snapshot, task)} />
                        <span className={`task-card-status is-${status}`}><i />{taskStatusLabel[status]}</span>
                      </div>
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

        <TaskInfoPanel snapshot={project.snapshot} task={selectedTask} />
      </div>

      <footer className="project-workspace-statusbar">
        <button type="button" onClick={() => setSettingsOpen(true)}><Settings size={16} /> 设置</button>
        <div>
          {runningTask ? (
            <><span className="workspace-running-dot" />当前运行：{project.title} · 任务名：{runningTask.title}</>
          ) : (
            <><span className="workspace-idle-dot" />当前没有正在运行的任务</>
          )}
        </div>
      </footer>

      <TaskEditorDialog
        open={Boolean(editingTask)}
        task={editingTask}
        assets={project.snapshot.assets}
        onClose={closeEditor}
        onSave={saveTask}
      />

      <Dialog open={renameOpen} title="重命名项目" onClose={() => setRenameOpen(false)}>
        <div className="project-simple-dialog">
          <label><span>项目名称</span><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} /></label>
          <footer>
            <Button onClick={() => setRenameOpen(false)}>取消</Button>
            <Button variant="accent" onClick={() => {
              const next = renameValue.trim();
              if (next) onRenameProject(next);
              setRenameOpen(false);
            }}>保存</Button>
          </footer>
        </div>
      </Dialog>

      <Dialog open={settingsOpen} title="设置" onClose={() => setSettingsOpen(false)}>
        <div className="project-settings-placeholder">
          <Settings size={22} />
          <h3>项目设置</h3>
          <p>生成服务、项目素材管理和其他低频设置统一从这里进入，不再占用一级导航。</p>
          <Button onClick={() => setSettingsOpen(false)}>关闭</Button>
        </div>
      </Dialog>
    </main>
  );
}

export function CreateProjectDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  return (
    <Dialog open={open} title="新建项目" description="创建后进入项目工作台。" onClose={onClose}>
      <div className="project-simple-dialog">
        <label><span>项目名称</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：异星边境 初到基地" /></label>
        <footer>
          <Button onClick={onClose}>取消</Button>
          <Button variant="accent" disabled={!title.trim()} onClick={() => onCreate(title.trim())}><Check size={14} /> 创建项目</Button>
        </footer>
      </div>
    </Dialog>
  );
}
