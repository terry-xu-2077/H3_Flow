export type PromptEnhancementAsset = {
  id: string;
  name: string;
  reference: string;
  kind: "subject" | "picture" | "video" | "audio";
};

export type PromptEnhancementRequest = {
  taskId: string;
  userPrompt: string;
  previousTaskSummary?: string;
  projectBackground?: string;
  assets: PromptEnhancementAsset[];
  generation: {
    resolution: string;
    quality: string;
    mode: string;
    durationSeconds: number;
    contextMode: string;
    contextStartSeconds?: number;
    contextEndSeconds?: number;
  };
};

export type PromptEnhancementResponse = {
  id: string;
  createdAt: string;
  prompt: string;
};

function buildDevelopmentPreview(request: PromptEnhancementRequest): PromptEnhancementResponse {
  const continuity = request.previousTaskSummary?.trim()
    ? `\n\nsummary:\n延续上一任务摘要：${request.previousTaskSummary.trim()}`
    : "";
  const project = request.projectBackground?.trim()
    ? `\n项目背景参考：${request.projectBackground.trim()}`
    : "";
  const references = request.assets.length
    ? `\n参考资产：${request.assets.map((asset) => `${asset.name} ${asset.reference}`).join("、")}`
    : "";

  return {
    id: `dev-ai-${Date.now()}`,
    createdAt: new Date().toISOString(),
    prompt: `${request.userPrompt.trim()}${continuity}${project}${references}`.trim(),
  };
}

/**
 * Production should be backed by the Prompt Enhancement Adapter.
 * During the current frontend-only development phase, DEV mode falls back to a
 * deterministic preview so the version-history interaction can be exercised.
 */
export async function requestPromptEnhancement(
  projectId: string,
  request: PromptEnhancementRequest,
): Promise<PromptEnhancementResponse> {
  try {
    const response = await fetch(
      `/api/v1/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(request.taskId)}/prompt-enhancements`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
    );

    if (response.ok) {
      const payload = await response.json() as Partial<PromptEnhancementResponse>;
      if (typeof payload.prompt === "string" && payload.prompt.trim()) {
        return {
          id: typeof payload.id === "string" && payload.id ? payload.id : `ai-${Date.now()}`,
          createdAt: typeof payload.createdAt === "string" && payload.createdAt
            ? payload.createdAt
            : new Date().toISOString(),
          prompt: payload.prompt,
        };
      }
    }

    if (!import.meta.env.DEV) {
      throw new Error(`AI 增强请求失败（${response.status}）`);
    }
  } catch (error) {
    if (!import.meta.env.DEV) throw error;
  }

  return buildDevelopmentPreview(request);
}
