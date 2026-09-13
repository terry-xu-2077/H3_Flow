import { Check, Clock3, ImageOff, Layers3, Rows3, TriangleAlert } from "lucide-react";
import { StatusPill } from "terry-react-ui-library";

import type { GenerationTaskCardView, GenerationTaskState } from "../types";

const statusLabels: Record<GenerationTaskState, string> = {
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

const statusTones: Record<GenerationTaskState, "normal" | "active" | "warning" | "danger"> = {
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

type TaskCardProps = {
  task: GenerationTaskCardView;
  selected: boolean;
  onSelect: (task: GenerationTaskCardView, event: React.MouseEvent) => void;
  onOpen: (task: GenerationTaskCardView) => void;
};

export function TaskCard({ task, selected, onSelect, onOpen }: TaskCardProps) {
  return (
    <article
      className={`task-card status-${task.state} ${selected ? "is-selected" : ""}`}
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
        {task.assetCount === 0 ? <ImageOff size={28} /> : <div className="preview-haze" />}
        <span className="task-number">{task.number}</span>
        {task.state === "completed" && <span className="preview-result"><Check size={13} /> Result 02</span>}
      </div>
      <div className="task-content">
        <div className="task-heading">
          <h3 title={task.title}>{task.title}</h3>
          <StatusPill tone={statusTones[task.state]}>{statusLabels[task.state]}</StatusPill>
        </div>
        <p>{task.summary}</p>
        {task.state === "running" && (
          <div className="task-progress" aria-label={`生成进度 ${task.progress}%`}>
            <div style={{ width: `${task.progress}%` }} />
            <span>{task.progress}%</span>
          </div>
        )}
        <footer>
          <span><Rows3 size={14} /> {task.visualBeatCount > 1 ? `${task.visualBeatCount} 个视觉节拍` : task.visualBeatCount === 1 ? "单镜头" : "待规划"}</span>
          <span><Layers3 size={14} /> {task.assetCount} 个资产</span>
          <span><Clock3 size={14} /> {task.plannedDurationLabel}</span>
          {task.state === "failed" && <span className="task-warning"><TriangleAlert size={14} /> 可重试</span>}
        </footer>
      </div>
    </article>
  );
}
