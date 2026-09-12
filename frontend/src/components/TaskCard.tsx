import { Check, Clock3, ImageOff, Layers3, TriangleAlert } from "lucide-react";
import { StatusPill } from "terry-react-ui-library";

import type { ShotTask, TaskStatus } from "../types";

const statusLabels: Record<TaskStatus, string> = {
  draft: "草稿",
  "prompt-generating": "生成 Prompt",
  "prompt-ready": "Prompt 就绪",
  ready: "可生成",
  queued: "排队中",
  running: "生成中",
  completed: "已完成",
  failed: "失败",
  blocked: "等待上游",
  "context-stale": "上下文已过期",
};

const statusTones: Record<TaskStatus, "normal" | "active" | "warning" | "danger"> = {
  draft: "normal",
  "prompt-generating": "active",
  "prompt-ready": "active",
  ready: "active",
  queued: "normal",
  running: "active",
  completed: "normal",
  failed: "danger",
  blocked: "warning",
  "context-stale": "warning",
};

type TaskCardProps = {
  task: ShotTask;
  selected: boolean;
  onSelect: (task: ShotTask, event: React.MouseEvent) => void;
  onOpen: (task: ShotTask) => void;
};

export function TaskCard({ task, selected, onSelect, onOpen }: TaskCardProps) {
  return (
    <article
      className={`task-card status-${task.status} ${selected ? "is-selected" : ""}`}
      onClick={(event) => onSelect(task, event)}
      onDoubleClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(task);
      }}
      data-testid={`task-card-${task.id}`}
      tabIndex={0}
      aria-selected={selected}
      aria-label={`${task.number} ${task.title}`}
    >
      <div className="task-preview" aria-label="任务预览">
        {task.assets === 0 ? <ImageOff size={28} /> : <div className="preview-haze" />}
        <span className="task-number">{task.number}</span>
        {task.status === "completed" && <span className="preview-result"><Check size={13} /> Result 02</span>}
      </div>
      <div className="task-content">
        <div className="task-heading">
          <h3 title={task.title}>{task.title}</h3>
          <StatusPill tone={statusTones[task.status]}>{statusLabels[task.status]}</StatusPill>
        </div>
        <p>{task.summary}</p>
        {task.status === "running" && (
          <div className="task-progress" aria-label={`生成进度 ${task.progress}%`}>
            <div style={{ width: `${task.progress}%` }} />
            <span>{task.progress}%</span>
          </div>
        )}
        <footer>
          <span><Layers3 size={14} /> {task.assets} 个资产</span>
          <span><Clock3 size={14} /> {task.duration}</span>
          {task.status === "failed" && <span className="task-warning"><TriangleAlert size={14} /> 可重试</span>}
        </footer>
      </div>
    </article>
  );
}
