import {
  resolveTaskAssetSnapshots,
  type GenerationContextLink,
  type GenerationProfileCapability,
  type GenerationTask,
  type Job,
  type Result,
  type Scene,
  type StoryboardDomainSnapshot,
  type TaskAssetBinding,
  type TaskStoryboardPlacement,
  type TaskVisualBeat,
} from "../domain/storyboard";
import {
  cloneTaskAsDraft,
  deleteTasksWithoutHistory,
  insertTaskAfter,
  moveTasksInStoryOrder,
} from "../features/storyboard/storyboardMutations";
import { setTaskPrimaryResult } from "../features/storyboard/storyboardExecution";

type MutableTaskPatch = Partial<Pick<GenerationTask,
  | "number"
  | "title"
  | "summary"
  | "scriptSource"
  | "userIntent"
  | "storyboardFrame"
  | "visualBeats"
  | "assetBindings"
  | "plannedDurationSeconds"
  | "generationProfileId"
  | "generationProfileLabel"
  | "aiPrompt"
  | "finalPrompt"
  | "promptRevisions"
  | "generationParams"
>>;
type TaskPromptPatch = Partial<Pick<GenerationTask, "aiPrompt" | "finalPrompt" | "promptRevisions">>;

export type SubmitJobInput = {
  id: string;
  taskId: string;
  providerId: string;
  profile: {
    id: string;
    capability: GenerationProfileCapability;
  };
  createdAt: string;
};

export type StoryOrderMutationResult = {
  changed: boolean;
  staleContextLinkIds: string[];
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertUniqueIds(ids: string[], kind: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`${kind} contains duplicate ids.`);
}

function sameMembers(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function markConnectedContextStale(snapshot: StoryboardDomainSnapshot, taskIds: string[]) {
  const touched = new Set(taskIds);
  const staleContextLinkIds = snapshot.generationContextLinks
    .filter((link) => touched.has(link.sourceTaskId) || touched.has(link.targetTaskId))
    .map((link) => link.id);
  const stale = new Set(staleContextLinkIds);
  const staleTargets = new Set(snapshot.generationContextLinks
    .filter((link) => stale.has(link.id))
    .map((link) => link.targetTaskId));
  return {
    snapshot: {
      ...snapshot,
      generationContextLinks: snapshot.generationContextLinks.map((link) => stale.has(link.id) ? { ...link, stale: true } : link),
      tasks: snapshot.tasks.map((task) => staleTargets.has(task.id) && !["queued", "running"].includes(task.state)
        ? { ...task, state: "context-stale" as const }
        : task),
    },
    staleContextLinkIds,
  };
}

export interface StoryboardRepository {
  getSnapshot(): StoryboardDomainSnapshot;
  listScenes(): Scene[];
  createScene(scene: Scene): Scene;
  updateScene(sceneId: string, patch: Partial<Omit<Scene, "id">>): Scene;
  reorderScenes(orderedSceneIds: string[]): Scene[];
  listTaskPlacements(): TaskStoryboardPlacement[];
  moveTask(taskId: string, targetSceneId: string, beforeTaskId?: string): StoryOrderMutationResult;
  reorderTasks(sceneId: string, orderedTaskIds: string[]): StoryOrderMutationResult;
  listTasks(): GenerationTask[];
  createTask(task: GenerationTask, sceneId: string, afterTaskId?: string): GenerationTask;
  updateTask(taskId: string, patch: MutableTaskPatch): GenerationTask;
  duplicateTask(sourceTaskId: string, id: string, number: string): GenerationTask;
  deleteTask(taskId: string): { deleted: boolean; protectedByHistory: boolean };
  updateTaskVisualBeats(taskId: string, beats: TaskVisualBeat[]): GenerationTask;
  updateTaskAssets(taskId: string, bindings: TaskAssetBinding[]): GenerationTask;
  updateTaskPrompt(taskId: string, patch: TaskPromptPatch): GenerationTask;
  updateContextLink(link: GenerationContextLink): GenerationContextLink;
  submitJob(input: SubmitJobInput): Job;
  addResult(result: Result): Result;
  setPrimaryResult(taskId: string, resultId: string): StoryOrderMutationResult;
}

export class MockStoryboardRepository implements StoryboardRepository {
  private snapshot: StoryboardDomainSnapshot;

  constructor(seed: StoryboardDomainSnapshot) {
    this.snapshot = clone(seed);
  }

  getSnapshot() {
    return clone(this.snapshot);
  }

  listScenes() {
    return clone(this.snapshot.scenes.slice().sort((left, right) => left.orderKey.localeCompare(right.orderKey)));
  }

  createScene(scene: Scene) {
    if (this.snapshot.scenes.some((item) => item.id === scene.id)) throw new Error(`Scene already exists: ${scene.id}`);
    const created = clone(scene);
    this.snapshot = { ...this.snapshot, scenes: [...this.snapshot.scenes, created] };
    return clone(created);
  }

  updateScene(sceneId: string, patch: Partial<Omit<Scene, "id">>) {
    const current = this.requireScene(sceneId);
    const updated = { ...current, ...clone(patch), id: current.id };
    this.snapshot = { ...this.snapshot, scenes: this.snapshot.scenes.map((scene) => scene.id === sceneId ? updated : scene) };
    return clone(updated);
  }

  reorderScenes(orderedSceneIds: string[]) {
    assertUniqueIds(orderedSceneIds, "Scene order");
    const currentIds = this.snapshot.scenes.map((scene) => scene.id);
    if (!sameMembers(orderedSceneIds, currentIds)) throw new Error("Scene order must contain every Scene exactly once.");
    const rank = new Map(orderedSceneIds.map((id, index) => [id, String(index + 1).padStart(6, "0")]));
    this.snapshot = {
      ...this.snapshot,
      scenes: this.snapshot.scenes.map((scene) => ({ ...scene, orderKey: rank.get(scene.id)! })),
    };
    return this.listScenes();
  }

  listTaskPlacements() {
    return clone(this.snapshot.taskPlacements);
  }

  moveTask(taskId: string, targetSceneId: string, beforeTaskId?: string) {
    this.requireTask(taskId);
    this.requireScene(targetSceneId);
    if (beforeTaskId && this.requirePlacement(beforeTaskId).sceneId !== targetSceneId) {
      throw new Error("The beforeTaskId anchor must belong to the target Scene.");
    }
    const moved = moveTasksInStoryOrder(this.snapshot, [taskId], targetSceneId, beforeTaskId);
    this.snapshot = moved.snapshot;
    return { changed: moved.changed, staleContextLinkIds: clone(moved.staleContextLinkIds) };
  }

  reorderTasks(sceneId: string, orderedTaskIds: string[]) {
    this.requireScene(sceneId);
    assertUniqueIds(orderedTaskIds, "Task order");
    const currentTaskIds = this.snapshot.taskPlacements
      .filter((placement) => placement.sceneId === sceneId)
      .map((placement) => placement.taskId);
    if (!sameMembers(orderedTaskIds, currentTaskIds)) throw new Error("Task order must contain every Task in the Scene exactly once.");
    const before = currentTaskIds
      .slice()
      .sort((left, right) => this.requirePlacement(left).orderKey.localeCompare(this.requirePlacement(right).orderKey));
    if (before.every((id, index) => id === orderedTaskIds[index])) return { changed: false, staleContextLinkIds: [] };

    const nextPlacements = [
      ...this.snapshot.taskPlacements.filter((placement) => placement.sceneId !== sceneId),
      ...orderedTaskIds.map((taskId, index) => ({ taskId, sceneId, orderKey: String(index + 1).padStart(6, "0") })),
    ];
    const marked = markConnectedContextStale({ ...this.snapshot, taskPlacements: nextPlacements }, orderedTaskIds);
    this.snapshot = marked.snapshot;
    return { changed: true, staleContextLinkIds: marked.staleContextLinkIds };
  }

  listTasks() {
    return clone(this.snapshot.tasks);
  }

  createTask(task: GenerationTask, sceneId: string, afterTaskId?: string) {
    if (this.snapshot.tasks.some((item) => item.id === task.id)) throw new Error(`GenerationTask already exists: ${task.id}`);
    this.requireScene(sceneId);
    if (afterTaskId && this.requirePlacement(afterTaskId).sceneId !== sceneId) {
      throw new Error("The afterTaskId anchor must belong to the target Scene.");
    }
    const created = clone(task);
    this.snapshot = insertTaskAfter(this.snapshot, created, sceneId, afterTaskId);
    return clone(created);
  }

  updateTask(taskId: string, patch: MutableTaskPatch) {
    const current = this.requireTask(taskId);
    const updated: GenerationTask = {
      ...current,
      ...clone(patch),
      id: current.id,
      jobIds: current.jobIds,
      primaryResultId: current.primaryResultId,
      contextLinkIds: current.contextLinkIds,
    };
    const marked = markConnectedContextStale({
      ...this.snapshot,
      tasks: this.snapshot.tasks.map((task) => task.id === taskId ? updated : task),
    }, [taskId]);
    this.snapshot = marked.snapshot;
    return clone(this.requireTask(taskId));
  }

  duplicateTask(sourceTaskId: string, id: string, number: string) {
    if (this.snapshot.tasks.some((task) => task.id === id)) throw new Error(`GenerationTask already exists: ${id}`);
    const source = this.requireTask(sourceTaskId);
    const placement = this.requirePlacement(sourceTaskId);
    const duplicate = cloneTaskAsDraft(source, id, number);
    this.snapshot = insertTaskAfter(this.snapshot, duplicate, placement.sceneId, sourceTaskId);
    return clone(duplicate);
  }

  deleteTask(taskId: string) {
    this.requireTask(taskId);
    const result = deleteTasksWithoutHistory(this.snapshot, [taskId]);
    this.snapshot = result.snapshot;
    return { deleted: result.deletedIds.includes(taskId), protectedByHistory: result.protectedIds.includes(taskId) };
  }

  updateTaskVisualBeats(taskId: string, beats: TaskVisualBeat[]) {
    return this.updateTask(taskId, { visualBeats: clone(beats) });
  }

  updateTaskAssets(taskId: string, bindings: TaskAssetBinding[]) {
    return this.updateTask(taskId, { assetBindings: clone(bindings) });
  }

  updateTaskPrompt(taskId: string, patch: TaskPromptPatch) {
    return this.updateTask(taskId, clone(patch));
  }

  updateContextLink(link: GenerationContextLink) {
    this.requireTask(link.sourceTaskId);
    this.requireTask(link.targetTaskId);
    const next = clone(link);
    const exists = this.snapshot.generationContextLinks.some((item) => item.id === link.id);
    this.snapshot = {
      ...this.snapshot,
      generationContextLinks: exists
        ? this.snapshot.generationContextLinks.map((item) => item.id === link.id ? next : item)
        : [...this.snapshot.generationContextLinks, next],
      tasks: this.snapshot.tasks.map((task) => {
        const withoutPrevious = task.contextLinkIds.filter((id) => id !== link.id);
        return [link.sourceTaskId, link.targetTaskId].includes(task.id)
          ? { ...task, contextLinkIds: [...withoutPrevious, link.id] }
          : withoutPrevious.length === task.contextLinkIds.length ? task : { ...task, contextLinkIds: withoutPrevious };
      }),
    };
    return clone(next);
  }

  submitJob(input: SubmitJobInput) {
    if (this.snapshot.jobs.some((job) => job.id === input.id)) throw new Error(`Job already exists: ${input.id}`);
    const task = this.requireTask(input.taskId);
    const job: Job = {
      id: input.id,
      taskId: task.id,
      providerId: input.providerId,
      state: "queued",
      progress: 0,
      taskContentSnapshot: {
        title: task.title,
        summary: task.summary,
        scriptSource: task.scriptSource,
        userIntent: task.userIntent,
        visualBeats: task.visualBeats.map((beat) => ({ ...beat })),
        plannedDurationSeconds: task.plannedDurationSeconds,
      },
      finalPromptSnapshot: task.finalPrompt,
      assetsSnapshot: resolveTaskAssetSnapshots(this.snapshot, task.id),
      generationProfileSnapshot: { id: input.profile.id, capability: clone(input.profile.capability) },
      paramsSnapshot: clone(task.generationParams),
      contextSnapshot: this.snapshot.generationContextLinks
        .filter((link) => link.targetTaskId === task.id)
        .map((link) => clone(link)),
      createdAt: input.createdAt,
    };
    this.snapshot = {
      ...this.snapshot,
      jobs: [...this.snapshot.jobs, job],
      tasks: this.snapshot.tasks.map((item) => item.id === task.id
        ? { ...item, state: "queued", jobIds: [...item.jobIds, job.id] }
        : item),
    };
    return clone(job);
  }

  addResult(result: Result) {
    if (this.snapshot.results.some((item) => item.id === result.id)) throw new Error(`Result already exists: ${result.id}`);
    const job = this.snapshot.jobs.find((item) => item.id === result.jobId);
    if (!job) throw new Error(`Unknown Job: ${result.jobId}`);
    const added = clone(result);
    this.snapshot = {
      ...this.snapshot,
      results: [...this.snapshot.results, added],
      jobs: this.snapshot.jobs.map((item) => item.id === job.id ? { ...item, state: "completed", progress: 100 } : item),
      tasks: this.snapshot.tasks.map((task) => task.id === job.taskId ? { ...task, state: "completed" } : task),
    };
    return clone(added);
  }

  setPrimaryResult(taskId: string, resultId: string) {
    this.requireTask(taskId);
    const changed = setTaskPrimaryResult(this.snapshot, taskId, resultId);
    this.snapshot = changed.snapshot;
    return { changed: changed.changed, staleContextLinkIds: clone(changed.staleContextLinkIds) };
  }

  private requireScene(sceneId: string) {
    const scene = this.snapshot.scenes.find((item) => item.id === sceneId);
    if (!scene) throw new Error(`Unknown Scene: ${sceneId}`);
    return scene;
  }

  private requireTask(taskId: string) {
    const task = this.snapshot.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`Unknown GenerationTask: ${taskId}`);
    return task;
  }

  private requirePlacement(taskId: string) {
    const placement = this.snapshot.taskPlacements.find((item) => item.taskId === taskId);
    if (!placement) throw new Error(`GenerationTask has no Storyboard placement: ${taskId}`);
    return placement;
  }
}
