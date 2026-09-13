import type { GenerationTaskState, TaskVisualBeat } from "./domain/storyboard";

export * from "./domain/storyboard";

export type GenerationTaskCardView = {
  id: string;
  number: string;
  title: string;
  summary: string;
  state: GenerationTaskState;
  assetCount: number;
  plannedDurationLabel: string;
  visualBeatCount: number;
  progress?: number;
  assetBindings?: Array<{ assetId: string; role: "character" | "scene" | "prop" | "reference" | "audio" }>;
  scriptSource?: string;
  userIntent?: string;
  aiPrompt?: string;
  finalPrompt?: string;
  visualBeats?: TaskVisualBeat[];
  generationProfileId?: string;
  generationProfileLabel?: string;
};
