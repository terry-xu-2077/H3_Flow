import type { GenerationContextLink, GenerationTask, StoryboardDomainSnapshot, TaskVisualBeat } from "../domain/storyboard";
import { mockStoryboard } from "./storyboard";

export type StoryboardDensity = "empty" | "normal" | "dense";

const denseTasksPerScene = 12;
const updatedAt = "2026-09-12T00:00:00.000Z";

function makeBeat(taskId: string, beatIndex: number, beatCount: number): TaskVisualBeat {
  const duration = 12 / beatCount;
  return {
    id: `${taskId}-beat-${beatIndex + 1}`,
    label: `视觉节拍 ${beatIndex + 1}`,
    description: `Task 内第 ${beatIndex + 1} 段镜头描述`,
    plannedStart: beatIndex * duration,
    plannedEnd: (beatIndex + 1) * duration,
    shotSize: (["WS", "MCU", "CU"] as const)[beatIndex % 3],
  };
}

function makeDenseTask(sceneIndex: number, taskIndex: number): GenerationTask {
  const id = `dense-task-${sceneIndex + 1}-${taskIndex + 1}`;
  const beatCount = taskIndex % 3 === 0 ? 3 : 1;
  const state = (["draft", "ready", "running", "completed", "context-stale", "failed"] as const)[taskIndex % 6];
  const title = taskIndex === 10
    ? "用于验证极长标题在高密度卡片中仍保持稳定布局的生成任务"
    : beatCount > 1 ? `多镜头生成任务 ${taskIndex + 1}` : `单镜头生成任务 ${taskIndex + 1}`;

  return {
    id,
    number: `T${String(sceneIndex + 1).padStart(2, "0")}-${String(taskIndex + 1).padStart(3, "0")}`,
    title,
    summary: beatCount > 1 ? "同一次生成中包含建立、动作与收束三个视觉节拍。" : "单一镜头意图的生成任务。",
    scriptSource: `Scene ${sceneIndex + 1} 的剧本片段 ${taskIndex + 1}`,
    userIntent: "保持前后任务的视觉连续性。",
    storyboardFrame: { sourceType: "placeholder", updatedAt },
    visualBeats: Array.from({ length: beatCount }, (_, beatIndex) => makeBeat(id, beatIndex, beatCount)),
    assetBindings: taskIndex % 4 === 0 ? [{ assetId: "asset-character-linlan", role: "character" }] : [],
    plannedDurationSeconds: beatCount > 1 ? 12 : 6,
    generationProfileId: "profile-h3-multi-shot",
    generationProfileLabel: "H3 · Multi-shot",
    aiPrompt: "",
    finalPrompt: "",
    promptRevisions: [],
    generationParams: { aspectRatio: "16:9" },
    contextLinkIds: [],
    state,
    progress: state === "running" ? 43 : undefined,
    jobIds: [],
  };
}

function makeDenseScenario(): StoryboardDomainSnapshot {
  const scenes = mockStoryboard.scenes.map((scene) => ({ ...scene }));
  const tasks = scenes.flatMap((_, sceneIndex) =>
    Array.from({ length: denseTasksPerScene }, (_, taskIndex) => makeDenseTask(sceneIndex, taskIndex)),
  );
  const taskPlacements = scenes.flatMap((scene, sceneIndex) =>
    tasks
      .filter((task) => task.id.startsWith(`dense-task-${sceneIndex + 1}-`))
      .map((task, taskIndex) => ({ taskId: task.id, sceneId: scene.id, orderKey: String(taskIndex + 1).padStart(3, "0") })),
  );
  const generationContextLinks: GenerationContextLink[] = tasks.slice(1).map((task, index) => ({
    id: `dense-context-${index + 1}`,
    sourceTaskId: tasks[index].id,
    targetTaskId: task.id,
    kind: "semantic",
    stale: false,
  }));

  tasks.forEach((task) => {
    task.contextLinkIds = generationContextLinks
      .filter((link) => link.sourceTaskId === task.id || link.targetTaskId === task.id)
      .map((link) => link.id);
  });

  return { scenes, assets: mockStoryboard.assets, tasks, taskPlacements, generationContextLinks, jobs: [], results: [] };
}

export function storyboardForDensity(density: StoryboardDensity): StoryboardDomainSnapshot {
  if (density === "dense") return makeDenseScenario();
  if (density === "empty") {
    return {
      scenes: mockStoryboard.scenes.map((scene) => ({ ...scene })),
      assets: mockStoryboard.assets,
      tasks: [],
      taskPlacements: [],
      generationContextLinks: [],
      jobs: [],
      results: [],
    };
  }
  return mockStoryboard;
}
