import { Boxes, Clock3, GripVertical } from "lucide-react";
import { StatusPill } from "terry-react-ui-library";

import type { GenerationTask, GenerationTaskState } from "../../domain/storyboard";

const stateTone: Record<GenerationTaskState, "normal" | "active" | "warning" | "danger"> = {
  draft: "normal",
  "prompt-generating": "active",
  "prompt-ready": "active",
  ready: "active",
  queued: "normal",
  running: "active",
  completed: "normal",
  failed: "danger",
  cancelled: "normal",
  blocked: "warning",
  "context-stale": "warning",
};

const stateLabel: Record<GenerationTaskState, string> = {
  draft: "草稿",
  "prompt-generating": "生成 Prompt",
  "prompt-ready": "Prompt 就绪",
  ready: "可生成",
  queued: "排队中",
  running: "生成中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  blocked: "等待上游",
  "context-stale": "上下文已过期",
};

export function taskBeatLabel(task: GenerationTask) {
  if (task.visualBeats.length === 0) return "镜头描述待规划";
  if (task.visualBeats.length === 1) return "单镜头 Task";
  return `多镜头 Task · ${task.visualBeats.length} Beats`;
}

type StoryboardTaskCardProps = {
  task: GenerationTask;
  primaryResultPreviewUrl?: string;
  selected: boolean;
  onSelect: (task: GenerationTask, event: React.MouseEvent) => void;
  onOpen?: (task: GenerationTask) => void;
  onDragStart?: (task: GenerationTask, event: React.DragEvent) => void;
  onDragOver?: (task: GenerationTask, event: React.DragEvent) => void;
  onDrop?: (task: GenerationTask, event: React.DragEvent) => void;
  onDragEnd?: () => void;
  dropTarget?: boolean;
};

export function StoryboardTaskCard({
  task,
  primaryResultPreviewUrl,
  selected,
  onSelect,
  onOpen,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropTarget = false,
}: StoryboardTaskCardProps) {
  const previewUrl = primaryResultPreviewUrl ?? task.storyboardFrame.previewUrl;
  const frameStyle = previewUrl
    ? { backgroundImage: `linear-gradient(to top, rgba(7,9,11,.72), transparent 58%), url("${previewUrl}")` }
    : undefined;
  const running = task.state === "running";

  return (
    <article
      className={`storyboard-task-card status-${task.state} ${selected ? "is-selected" : ""} ${dropTarget ? "is-drop-target" : ""}`}
      data-testid="storyboard-task-card"
      data-task-id={task.id}
      data-state={task.state}
      role="option"
      aria-selected={selected}
      aria-label={`${task.number} ${task.title} ${taskBeatLabel(task)}`}
      tabIndex={0}
      draggable
      onClick={(event) => onSelect(task, event)}
      onDoubleClick={() => onOpen?.(task)}
      onDragStart={(event) => onDragStart?.(task, event)}
      onDragOver={(event) => onDragOver?.(task, event)}
      onDrop={(event) => onDrop?.(task, event)}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen?.(task);
      }}
    >
      <div className="storyboard-task-frame" style={frameStyle} data-frame-source={primaryResultPreviewUrl ? "primary-result" : task.storyboardFrame.sourceType}>
        <span>{taskBeatLabel(task)}</span>
        {task.primaryResultId && <em>PRIMARY RESULT</em>}
      </div>
      <div className="storyboard-task-content">
        <div className="storyboard-task-meta">
          <span><GripVertical size={11} aria-hidden="true" />{task.number}</span>
          <StatusPill tone={stateTone[task.state]}>{stateLabel[task.state]}</StatusPill>
        </div>
        <h3 title={task.title}>{task.title}</h3>
        <p title={task.summary}>{task.summary}</p>
        <div
          className={`storyboard-task-progress ${running ? "is-running" : "is-idle"}`}
          data-testid="storyboard-task-progress"
          aria-label={running ? `生成进度 ${task.progress ?? 0}%` : "当前无生成进度"}
        >
          <i style={{ width: `${running ? task.progress ?? 0 : 0}%` }} />
          <span>{running ? `${task.progress ?? 0}%` : "—"}</span>
        </div>
        <footer>
          <span><Clock3 size={12} /> {task.plannedDurationSeconds ? `${task.plannedDurationSeconds}s` : "—"}</span>
          <span><Boxes size={12} /> {task.assetBindings.length}</span>
          <strong title={task.generationProfileLabel}>{task.generationProfileLabel}</strong>
        </footer>
      </div>
    </article>
  );
}
