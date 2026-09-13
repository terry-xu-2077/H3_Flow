export type PromptEnhancementAsset = {
  id: string;
  name: string;
  reference: string;
  kind: "subject" | "picture" | "video" | "audio";
};

export type PromptEnhancementRequest = {
  taskId: string;
  isDraft: boolean;
  previousTaskId?: string;
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
  taskRevision?: number;
};
