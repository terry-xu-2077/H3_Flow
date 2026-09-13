import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  CircleGauge,
  Copy,
  Film,
  FolderKanban,
  ListPlus,
  Plus,
  Search,
  Settings2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button, StatusPill } from "terry-react-ui-library";

import { OverlayLab } from "./components/OverlayLab";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { TaskCard } from "./components/TaskCard";
import { TaskComposer } from "./components/TaskComposer";
import { StoryboardWorkspace } from "./features/storyboard/StoryboardWorkspace";
import { AssetLibraryWorkspace } from "./features/assets/AssetLibraryWorkspace";
import { ResultReviewWorkspace } from "./features/results/ResultReviewWorkspace";
import { mockProjectAssets } from "./mock/assets";
import { storyboardForDensity, type StoryboardDensity } from "./mock/storyboardScenarios";
import { mockTasks } from "./mock/tasks";
import type { GenerationTaskCardView } from "./types";
import { useToast } from "./ui/overlay";

const navigation = [
  { label: "分镜", icon: FolderKanban },
  { label: "资产", icon: Boxes },
  { label: "生产", icon: CircleGauge },
  { label: "结果", icon: Film },
  { label: "项目设置", icon: Settings2 },
];

const taskStatusFilters = {
  all: () => true,
  attention: (task: GenerationTaskCardView) => ["failed", "blocked", "context-stale"].includes(task.state),
  running: (task: GenerationTaskCardView) => task.state === "running",
  completed: (task: GenerationTaskCardView) => task.state === "completed",
} satisfies Record<string, (task: GenerationTaskCardView) => boolean>;

function tasksForDensity(density: StoryboardDensity): GenerationTaskCardView[] {
  if (density === "empty") return [];
  if (density === "dense") {
    return Array.from({ length: 4 }, (_, index) =>
      mockTasks.map((task) => ({
        ...task,
        id: `${task.id}-${index}`,
        number: `S0${index + 1}-${task.number.slice(-3)}`,
      })),
    ).flat();
  }
  return mockTasks.map((task) => ({ ...task }));
}

export function App() {
  const [activeNav, setActiveNav] = useState("分镜");
  const [selectedIds, setSelectedIds] = useState<string[]>(["task-002"]);
  const [lastSelectedId, setLastSelectedId] = useState("task-002");
  const [providerOnline, setProviderOnline] = useState(true);
  const [taskDensity, setTaskDensity] = useState<StoryboardDensity>("normal");
  const [storyboardSnapshot, setStoryboardSnapshot] = useState(() => storyboardForDensity("normal"));
  const [storyboardFocusTaskId, setStoryboardFocusTaskId] = useState<string | null>(null);
  const [taskItems, setTaskItems] = useState<GenerationTaskCardView[]>(() => tasksForDensity("normal"));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<keyof typeof taskStatusFilters>("all");
  const [overlayLabOpen, setOverlayLabOpen] = useState(false);
  const [composerTask, setComposerTask] = useState<GenerationTaskCardView | null>(null);
  const isDevUi = window.location.pathname.startsWith("/dev/ui");
  const pushToast = useToast();

  useEffect(() => {
    const nextTasks = tasksForDensity(taskDensity);
    setTaskItems(nextTasks);
    setSelectedIds(nextTasks[1] ? [nextTasks[1].id] : []);
    setLastSelectedId(nextTasks[1]?.id ?? "");
    setComposerTask(null);
    setStoryboardSnapshot(storyboardForDensity(taskDensity));
    setStoryboardFocusTaskId(null);
  }, [taskDensity]);

  const selectedTask = taskItems.find((task) => selectedIds.includes(task.id)) ?? taskItems[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const tasks = useMemo(
    () => taskItems.filter((task) => {
      const matchesQuery = !normalizedQuery || `${task.number} ${task.title} ${task.summary}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && taskStatusFilters[statusFilter](task);
    }),
    [normalizedQuery, statusFilter, taskItems],
  );

  const counts = useMemo(() => ({
    all: taskItems.length,
    attention: taskItems.filter(taskStatusFilters.attention).length,
    running: taskItems.filter(taskStatusFilters.running).length,
    completed: taskItems.filter(taskStatusFilters.completed).length,
  }), [taskItems]);

  const selectTask = (task: GenerationTaskCardView, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedId) {
      const anchorIndex = tasks.findIndex((item) => item.id === lastSelectedId);
      const targetIndex = tasks.findIndex((item) => item.id === task.id);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] = [anchorIndex, targetIndex].sort((left, right) => left - right);
        const rangeIds = tasks.slice(start, end + 1).map((item) => item.id);
        setSelectedIds(event.ctrlKey || event.metaKey
          ? (current) => [...new Set([...current, ...rangeIds])]
          : rangeIds);
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((current) =>
        current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
      );
      setLastSelectedId(task.id);
      return;
    }
    setSelectedIds([task.id]);
    setLastSelectedId(task.id);
  };

  const createTask = (inheritCurrent: boolean) => {
    const current = taskItems.find((task) => selectedIds.includes(task.id));
    const sequence = taskItems.length + 1;
    const id = `task-local-${Date.now()}`;
    const task: GenerationTaskCardView = {
      id,
      number: `S01-${String(sequence).padStart(3, "0")}`,
      title: inheritCurrent ? `${current?.title ?? "新任务"} · 下一任务` : "未命名任务",
      summary: inheritCurrent ? "已继承上一任务的常用参数，等待粘贴下一段剧本。" : "等待补充剧本与创作意图。",
      state: "draft",
      assetCount: inheritCurrent ? current?.assetCount ?? 0 : 0,
      plannedDurationLabel: inheritCurrent ? current?.plannedDurationLabel ?? "6s" : "—",
      visualBeatCount: 0,
    };
    setTaskItems((items) => [...items, task]);
    setSelectedIds([id]);
    setLastSelectedId(id);
    pushToast(inheritCurrent ? "已新建下一个任务，并继承常用设置" : "已创建空白任务", "success");
  };

  const duplicateSelected = () => {
    const sources = taskItems.filter((task) => selectedIds.includes(task.id));
    if (sources.length === 0) return;
    const stamp = Date.now();
    const copies = sources.map((task, index) => ({
      ...task,
      id: `${task.id}-copy-${stamp}-${index}`,
      number: `S01-${String(taskItems.length + index + 1).padStart(3, "0")}`,
      title: `${task.title} · 副本`,
      state: "draft" as const,
      progress: undefined,
    }));
    setTaskItems((items) => [...items, ...copies]);
    setSelectedIds(copies.map((task) => task.id));
    setLastSelectedId(copies.at(-1)?.id ?? "");
    pushToast(`已复制 ${copies.length} 个任务`, "success");
  };

  return (
    <div className="app-frame">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ShotMill 首页">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <strong>ShotMill</strong>
          {isDevUi && <span className="dev-badge">DEV UI</span>}
        </a>
        <button className="project-switcher" type="button">
          <span className="project-dot" />
          <span><small>当前项目</small><strong>雾港来信 · EP01</strong></span>
          <ChevronDown size={16} />
        </button>
        <div className="system-status">
          <span className={`status-dot ${providerOnline ? "is-online" : "is-offline"}`} />
          <span><small>ComfyUI</small><strong>{providerOnline ? "本地在线" : "连接中断"}</strong></span>
          <StatusPill tone={providerOnline ? "active" : "danger"}>{providerOnline ? "READY" : "OFFLINE"}</StatusPill>
        </div>
      </header>

      <div className={`app-body ${composerTask ? "has-composer" : ""} ${activeNav === "生产" && !composerTask ? "has-inspector" : ""}`}>
        <nav className="sidebar" aria-label="主导航">
          <div className="nav-items">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className={activeNav === label ? "is-active" : ""}
                onClick={() => {
                  setActiveNav(label);
                  setComposerTask(null);
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
                {label === "生产" && <em>7</em>}
              </button>
            ))}
          </div>
          <div className="sidebar-foot">
            <div className="storage-ring"><span>68%</span></div>
            <span><strong>工作盘</strong><small>1.4 TB 可用</small></span>
          </div>
        </nav>

        <main className={`workspace ${composerTask ? "composer-workspace" : ""} ${activeNav === "分镜" && !composerTask ? "storyboard-workspace-host" : ""} ${activeNav === "结果" && !composerTask ? "result-review-host" : ""}`}>
          {composerTask ? (
            <TaskComposer task={composerTask} onClose={() => setComposerTask(null)} />
          ) : activeNav === "分镜" ? (
            <StoryboardWorkspace
              density={taskDensity}
              providerOnline={providerOnline}
              value={storyboardSnapshot}
              onChange={setStoryboardSnapshot}
              focusTaskId={storyboardFocusTaskId}
            />
          ) : activeNav === "资产" ? (
            <AssetLibraryWorkspace assets={mockProjectAssets} />
          ) : activeNav === "结果" ? (
            <ResultReviewWorkspace
              snapshot={storyboardSnapshot}
              onChange={setStoryboardSnapshot}
              onEditTask={(taskId) => {
                setStoryboardFocusTaskId(taskId);
                setActiveNav("分镜");
              }}
            />
          ) : activeNav === "生产" ? (
            <>
          <section className="workspace-head">
            <div>
              <span className="eyebrow">TASK PRODUCTION</span>
              <h1>任务生产区</h1>
              <p>按故事段落准备 Generation Task，确认后统一交给生成队列。</p>
            </div>
            <div className="workspace-actions">
              <Button onClick={duplicateSelected} disabled={selectedIds.length === 0}><Copy size={16} /> 复制任务</Button>
              <Button onClick={() => createTask(true)}><ListPlus size={16} /> 新建下一个</Button>
              <Button variant="accent" onClick={() => createTask(false)}><Plus size={16} /> 新建任务</Button>
            </div>
          </section>

          <section className="workspace-toolbar">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索任务编号、标题或剧本…"
                aria-label="搜索任务"
              />
            </label>
            <div className="filter-pills">
              <button className={statusFilter === "all" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("all")}>全部 <span>{counts.all}</span></button>
              <button className={statusFilter === "attention" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("attention")}>需要处理 <span>{counts.attention}</span></button>
              <button className={statusFilter === "running" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("running")}>生成中 <span>{counts.running}</span></button>
              <button className={statusFilter === "completed" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("completed")}>已完成 <span>{counts.completed}</span></button>
            </div>
            <button className="compact-button" type="button"><Settings2 size={16} /> 筛选</button>
          </section>

          {selectedIds.length > 1 && (
            <section className="batch-bar" aria-label="批量操作">
              <strong>已选择 {selectedIds.length} 个任务</strong>
              <span />
              <Button onClick={duplicateSelected}><Copy size={14} /> 复制</Button>
              <Button><WandSparkles size={14} /> 生成 Prompt</Button>
              <Button variant="accent">加入队列</Button>
              <button type="button" onClick={() => setSelectedIds([])}>取消选择</button>
            </section>
          )}

          {tasks.length > 0 ? (
            <section className="task-grid" aria-label="任务列表">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={selectedIds.includes(task.id)}
                  onSelect={selectTask}
                  onOpen={setComposerTask}
                />
              ))}
            </section>
          ) : (
            <section className="empty-state">
              <span><FolderKanban size={28} /></span>
              <h2>还没有任务</h2>
              <p>从一段剧本开始，建立第一张视频素材生产单。</p>
              <Button variant="accent"><Plus size={16} /> 新建第一个任务</Button>
            </section>
          )}
            </>
          ) : (
            <section className="empty-state section-placeholder">
              <span><FolderKanban size={28} /></span>
              <h1>{activeNav}</h1>
              <p>该工作区将在后续 V0.2 阶段接入。</p>
            </section>
          )}
        </main>

        {activeNav === "生产" && !composerTask && <aside className="inspector" aria-label="任务详情">
          <header>
            <span className="eyebrow">CURRENT TASK</span>
            <h2>S01-002</h2>
            <StatusPill tone="active">生成中 43%</StatusPill>
          </header>
          <div className="inspector-preview"><div /><span>00:04 / 00:06</span></div>
          <section>
            <label>镜头名称</label>
            <strong>仓库门前的短暂停顿</strong>
            <p>镜头贴近人物侧脸，她察觉门缝里有暖光。</p>
          </section>
          <section className="context-summary">
            <label>上下文连接</label>
            <div><span>S01-001</span><strong>Visual + Semantic</strong></div>
            <small>使用上游 Primary Result 02</small>
          </section>
          <section>
            <label>生成配置</label>
            <div className="key-value"><span>Profile</span><strong>H3 · Ref2V</strong></div>
            <div className="key-value"><span>尺寸</span><strong>16:9 · 1080p</strong></div>
            <div className="key-value"><span>时长</span><strong>6 秒</strong></div>
          </section>
          <Button onClick={() => selectedTask && setComposerTask(selectedTask)}>打开任务编辑器</Button>
        </aside>}
      </div>

      {isDevUi && (
        <ScenarioPanel
          providerOnline={providerOnline}
          onProviderChange={setProviderOnline}
          taskDensity={taskDensity}
          onTaskDensityChange={setTaskDensity}
          onOpenOverlayLab={() => setOverlayLabOpen(true)}
        />
      )}
      <OverlayLab open={overlayLabOpen} onClose={() => setOverlayLabOpen(false)} />
    </div>
  );
}
