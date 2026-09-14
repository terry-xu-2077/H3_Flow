import type { ProjectAsset } from "../domain/storyboard";
import type {
  PromptEnhancementRequest,
  PromptEnhancementResponse,
} from "../services/promptEnhancement";

export type ProjectStatus = "idle" | "running" | "completed" | "failed";
export type TaskStatus = ProjectStatus;

export type ProjectSummary = {
  id: string;
  title: string;
  status: ProjectStatus;
  coverUrl?: string;
  taskCount: number;
  assetCount: number;
  updatedAt: string;
};

export type ProjectSettings = {
  id: string;
  title: string;
  description: string;
  useDescriptionForAiPrompt: boolean;
};

export type TaskSummary = {
  id: string;
  displayNumber: number;
  title: string;
  promptExcerpt: string;
  previewUrl?: string;
  status: TaskStatus;
  progress?: number;
  assetCount: number;
  resultCount: number;
  durationSeconds: number;
  generationSummary: {
    resolution: string;
    quality: string;
  };
  primaryResult?: {
    id: string;
    previewUrl?: string;
    videoUrl: string;
  };
};

export type ProjectWorkspaceView = {
  project: { id: string; title: string };
  tasks: TaskSummary[];
  runtime: {
    activeTaskId?: string;
    activeTaskTitle?: string;
    state: "idle" | "queued" | "running" | "failed";
    progress?: number;
  };
};

export type TaskAssetRef = {
  assetId: string;
  reference: string;
  role?: string;
};

export type TaskEditorView = {
  id: string;
  displayNumber: number;
  title: string;
  summary: string;
  scriptSource: string;
  userIntent: string;
  promptSource: "user" | "ai";
  userPrompt: string;
  aiEnhancedPrompt: string;
  finalPrompt: string;
  editorPreference: {
    userViewMode: "visual" | "text";
    aiViewMode: "visual" | "text";
  };
  durationSeconds: number;
  previousTaskDurationSeconds?: number;
  generation: {
    resolution: string;
    quality: string;
    mode: string;
    contextMode: string;
    contextStartSeconds?: number;
    contextEndSeconds?: number;
    contextDurationSeconds?: number;
  };
  assetBindings: TaskAssetRef[];
  revision: number;
};

export type PromptRevisionView = {
  id: string;
  taskId: string;
  createdAt: string;
  prompt: string;
  sourceUserPrompt: string;
  assetIds: string[];
  includeProjectBackground: boolean;
  includePreviousTaskSummary: boolean;
  previousTaskSummarySnapshot?: string;
  targetSkill: string;
  skillVersion: string;
  providerId?: string;
  modelId?: string;
};

type PromptEnhancementPreviewView = {
  previewId: string;
  createdAt: string;
  prompt: string;
  targetSkill: string;
  skillVersion: string;
  providerId?: string;
  modelId?: string;
};

export type BatchPromptEnhancementRequest = {
  taskIds: string[];
  includeProjectBackground: boolean;
  includePreviousTaskSummary: boolean;
};

export type BatchPromptEnhancementResponse = {
  batchId: string;
  state: "completed" | "partial" | "failed";
  items: Array<{
    taskId: string;
    state: "completed" | "failed";
    revisionId?: string;
    error?: string;
  }>;
};

export type SaveTaskInput = {
  title: string;
  summary: string;
  scriptSource: string;
  userIntent: string;
  userPrompt: string;
  aiEnhancedPrompt: string;
  promptSource: "user" | "ai";
  durationSeconds: number;
  generation: TaskEditorView["generation"];
  assetBindings: TaskAssetRef[];
  editorPreference: TaskEditorView["editorPreference"];
  revision?: number;
};

export type AssetPatch = Pick<ProjectAsset, "name" | "category" | "tags">;
export type ProjectEvent = {
  type: string;
  projectId: string;
  taskId?: string;
  status?: string;
  state?: string;
  progress?: number;
  resultId?: string;
};

export interface ProjectGateway {
  listProjects(): Promise<ProjectSummary[]>;
  createProject(input: { title: string }): Promise<ProjectSummary>;
  updateProject(
    projectId: string,
    input: Partial<Pick<ProjectSettings, "title" | "description" | "useDescriptionForAiPrompt">>,
  ): Promise<ProjectSummary>;
  getProjectSettings(projectId: string): Promise<ProjectSettings>;
  getWorkspace(projectId: string): Promise<ProjectWorkspaceView>;
  getTaskEditor(projectId: string, taskId: string): Promise<TaskEditorView>;
  createTask(projectId: string, input: SaveTaskInput): Promise<TaskSummary>;
  updateTask(projectId: string, taskId: string, input: SaveTaskInput): Promise<TaskSummary>;
  listAssets(projectId: string): Promise<ProjectAsset[]>;
  importAsset(projectId: string, file: File, input: AssetPatch): Promise<ProjectAsset>;
  updateAsset(projectId: string, assetId: string, input: AssetPatch): Promise<ProjectAsset>;
  deleteAsset(projectId: string, assetId: string): Promise<void>;
  listPromptRevisions(projectId: string, taskId: string): Promise<PromptRevisionView[]>;
  enhancePrompt(projectId: string, request: PromptEnhancementRequest): Promise<PromptEnhancementResponse>;
  batchEnhancePrompts(projectId: string, request: BatchPromptEnhancementRequest): Promise<BatchPromptEnhancementResponse>;
  subscribeProject(projectId: string, listener: (event: ProjectEvent) => void): () => void;
}

type BackendErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

const errorMessages: Record<string, string> = {
  PROJECT_NOT_FOUND: "找不到这个项目，可能已被删除。",
  TASK_NOT_FOUND: "找不到这个任务，可能已被删除。",
  TASK_CONFLICT: "任务已在别处更新，请重新打开后再保存。",
  TASK_BUSY: "任务正在运行，暂时不能修改。",
  ASSET_NOT_FOUND: "找不到引用的资产。",
  ASSET_IN_USE: "这个资产仍被任务使用，暂时不能删除。",
  GENERATION_SERVICE_OFFLINE: "生成服务当前不可用，请检查服务后重试。",
  PROVIDER_UNAVAILABLE: "生成服务当前不可用，请检查服务后重试。",
  PREVIOUS_TASK_REQUIRED: "当前承接方式需要一个上一任务。",
  INVALID_CONTEXT_RANGE: "承接区间超出了上一任务的时长。",
};

export class ProjectGatewayError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ProjectGatewayError";
  }
}

const configuredApiBase = import.meta.env.VITE_SHOTMILL_API_BASE_URL?.trim();
const API_BASE = (configuredApiBase || "/api/v1").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    let payload: BackendErrorPayload | undefined;
    try {
      payload = await response.json() as BackendErrorPayload;
    } catch {
      payload = undefined;
    }
    const code = payload?.error?.code || "REQUEST_FAILED";
    throw new ProjectGatewayError(
      errorMessages[code] || payload?.error?.message || `请求失败（${response.status}）`,
      code,
      response.status,
      payload?.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type ProjectListResponse = { items: ProjectSummary[] };
type AssetListResponse = { items: BackendAsset[] };
type PromptRevisionListResponse = { items: PromptRevisionView[] };
type BackendAsset = {
  id: string;
  name: string;
  originalFileName: string;
  projectRelativePath: string;
  mediaType: string;
  category: string;
  tags: string[];
  duration?: number;
  thumbnailUrl?: string;
};

function asMediaType(value: string): ProjectAsset["mediaType"] {
  if (value === "video" || value === "audio") return value;
  return "image";
}

function asCategory(value: string): ProjectAsset["category"] {
  if (value === "character" || value === "scene" || value === "prop") return value;
  return "reference";
}

function mediaUrl(projectId: string, projectRelativePath: string) {
  const path = `/media/${encodeURIComponent(projectId)}/${projectRelativePath.split("/").map(encodeURIComponent).join("/")}`;
  if (!configuredApiBase || configuredApiBase.startsWith("/")) return path;
  return `${new URL(configuredApiBase).origin}${path}`;
}

function mapAsset(projectId: string, asset: BackendAsset): ProjectAsset {
  return {
    id: asset.id,
    name: asset.name,
    mediaType: asMediaType(asset.mediaType),
    category: asCategory(asset.category),
    projectRelativePath: asset.projectRelativePath,
    mediaUrl: mediaUrl(projectId, asset.projectRelativePath),
    previewUrl: asset.thumbnailUrl,
    tags: asset.tags,
    durationSeconds: asset.duration,
    checksum: "",
    originalFilename: asset.originalFileName,
  };
}

export class HttpProjectGateway implements ProjectGateway {
  async listProjects() {
    return (await request<ProjectListResponse>("/projects")).items;
  }

  createProject(input: { title: string }) {
    return request<ProjectSummary>("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  updateProject(
    projectId: string,
    input: Partial<Pick<ProjectSettings, "title" | "description" | "useDescriptionForAiPrompt">>,
  ) {
    return request<ProjectSummary>(`/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  getProjectSettings(projectId: string) {
    return request<ProjectSettings>(`/projects/${encodeURIComponent(projectId)}/settings`);
  }

  getWorkspace(projectId: string) {
    return request<ProjectWorkspaceView>(`/projects/${encodeURIComponent(projectId)}/workspace`);
  }

  getTaskEditor(projectId: string, taskId: string) {
    return request<TaskEditorView>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/editor`,
    );
  }

  createTask(projectId: string, input: SaveTaskInput) {
    return request<TaskSummary>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  updateTask(projectId: string, taskId: string, input: SaveTaskInput) {
    return request<TaskSummary>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
  }

  async listAssets(projectId: string) {
    const response = await request<AssetListResponse>(
      `/projects/${encodeURIComponent(projectId)}/assets`,
    );
    return response.items.map((asset) => mapAsset(projectId, asset));
  }

  async importAsset(projectId: string, file: File, input: AssetPatch) {
    const body = new FormData();
    body.append("file", file);
    body.append("name", input.name);
    body.append("category", input.category);
    body.append("tags", JSON.stringify(input.tags));
    return mapAsset(projectId, await request<BackendAsset>(
      `/projects/${encodeURIComponent(projectId)}/assets`,
      { method: "POST", body },
    ));
  }

  async updateAsset(projectId: string, assetId: string, input: AssetPatch) {
    return mapAsset(projectId, await request<BackendAsset>(
      `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    ));
  }

  deleteAsset(projectId: string, assetId: string) {
    return request<void>(
      `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
      { method: "DELETE" },
    );
  }

  async listPromptRevisions(projectId: string, taskId: string) {
    const response = await request<PromptRevisionListResponse>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/prompt-revisions`,
    );
    return response.items;
  }

  async enhancePrompt(projectId: string, input: PromptEnhancementRequest) {
    const payload = {
      target: "minimax-h3",
      userPrompt: input.userPrompt,
      media: input.assets.map((asset) => ({
        assetId: asset.id,
        reference: asset.reference,
        role: asset.kind,
      })),
      context: {
        includeProjectBackground: Boolean(input.projectBackground?.trim()),
        includePreviousTaskSummary: Boolean(input.previousTaskSummary?.trim()),
      },
      generation: {
        durationSeconds: input.generation.durationSeconds,
        mode: input.generation.mode,
        contextMode: input.generation.contextMode,
      },
    };

    if (input.isDraft) {
      const preview = await request<PromptEnhancementPreviewView>(
        `/projects/${encodeURIComponent(projectId)}/prompt-enhancement-previews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, previousTaskId: input.previousTaskId }),
        },
      );
      return {
        id: preview.previewId,
        createdAt: preview.createdAt,
        prompt: preview.prompt,
      };
    }

    const revision = await request<PromptRevisionView>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(input.taskId)}/prompt-enhancements`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const editor = await this.getTaskEditor(projectId, input.taskId);
    return {
      id: revision.id,
      createdAt: revision.createdAt,
      prompt: revision.prompt,
      taskRevision: editor.revision,
    };
  }

  batchEnhancePrompts(projectId: string, input: BatchPromptEnhancementRequest) {
    return request<BatchPromptEnhancementResponse>(
      `/projects/${encodeURIComponent(projectId)}/prompt-enhancement-batches`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
  }

  subscribeProject(projectId: string, listener: (event: ProjectEvent) => void) {
    const source = new EventSource(
      `${API_BASE}/projects/${encodeURIComponent(projectId)}/events`,
    );
    const eventNames = [
      "task.status_changed",
      "task.progress_changed",
      "task.result_added",
      "project.runtime_changed",
      "project.summary_changed",
    ];
    const handleEvent = (event: Event) => {
      if (!(event instanceof MessageEvent)) return;
      try {
        listener(JSON.parse(event.data) as ProjectEvent);
      } catch {
        // Ignore malformed event payloads and keep the SSE connection alive.
      }
    };
    eventNames.forEach((name) => source.addEventListener(name, handleEvent));
    return () => source.close();
  }
}

export const httpProjectGateway = new HttpProjectGateway();
