export type TaskStatus =
  | "draft"
  | "prompt-generating"
  | "prompt-ready"
  | "ready"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "context-stale";

export type ShotTask = {
  id: string;
  number: string;
  title: string;
  summary: string;
  status: TaskStatus;
  assets: number;
  duration: string;
  progress?: number;
};
