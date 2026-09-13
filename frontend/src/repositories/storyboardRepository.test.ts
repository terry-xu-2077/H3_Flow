import { describe, expect, it } from "vitest";

import { listTasksInStoryOrder } from "../domain/storyboard";
import { mockStoryboard } from "../mock/storyboard";
import { MockStoryboardRepository } from "./storyboardRepository";

function repository() {
  return new MockStoryboardRepository(mockStoryboard);
}

describe("MockStoryboardRepository contract", () => {
  it("lists defensive copies and supports Scene create, update, and explicit reorder", () => {
    const repo = repository();
    const scenes = repo.listScenes();
    scenes[0].title = "leaked mutation";
    expect(repo.listScenes()[0].title).toBe("仓库外");

    repo.createScene({
      id: "scene-rooftop",
      number: "Scene 04",
      title: "屋顶",
      summary: "雨停后的尾声。",
      orderKey: "d0",
      location: "仓库屋顶",
      timeOfDay: "黎明",
      notes: "",
    });
    repo.updateScene("scene-rooftop", { title: "仓库屋顶" });
    const reordered = repo.reorderScenes(["scene-rooftop", "scene-harbor", "scene-hall", "scene-empty"]);

    expect(reordered.map((scene) => scene.id)).toEqual(["scene-rooftop", "scene-harbor", "scene-hall", "scene-empty"]);
    expect(reordered[0].title).toBe("仓库屋顶");
    expect(() => repo.reorderScenes(["scene-harbor"])).toThrow(/every Scene/);
  });

  it("keeps stable Task identity separate from display numbering across CRUD", () => {
    const repo = repository();
    const listed = repo.listTasks();
    listed[0].title = "leaked task mutation";
    expect(repo.listTasks()[0].title).toBe("抵达仓库并发现门内异常");
    const source = structuredClone(mockStoryboard.tasks.find((task) => task.id === "task-draft")!);
    source.id = "task-new";
    source.number = "LOCAL-001";
    source.title = "新任务";
    repo.createTask(source, "scene-empty");
    const renumbered = repo.updateTask("task-new", { number: "T03-001", title: "屋顶尾声" });

    expect(renumbered.id).toBe("task-new");
    expect(renumbered.number).toBe("T03-001");
    expect(repo.listTaskPlacements().find((item) => item.taskId === "task-new")?.sceneId).toBe("scene-empty");

    const duplicate = repo.duplicateTask("task-new", "task-new-copy", "T03-002");
    expect(duplicate).toMatchObject({ id: "task-new-copy", state: "draft", jobIds: [], contextLinkIds: [] });
    expect(repo.deleteTask("task-new-copy")).toEqual({ deleted: true, protectedByHistory: false });
    expect(repo.deleteTask("task-harbor-arrival")).toEqual({ deleted: false, protectedByHistory: true });
  });

  it("changes Story Order without rewriting Task, Job, Result, or Context endpoints", () => {
    const repo = repository();
    const before = repo.getSnapshot();
    const reordered = repo.reorderTasks("scene-harbor", ["task-wall-image", "task-hall-projector", "task-harbor-arrival"]);
    expect(reordered).toEqual({ changed: true, staleContextLinkIds: ["context-arrival-projector"] });
    const moved = repo.moveTask("task-harbor-arrival", "scene-hall", "task-voice");
    const after = repo.getSnapshot();

    expect(moved).toEqual({ changed: true, staleContextLinkIds: ["context-arrival-projector"] });
    expect(after.tasks.find((task) => task.id === "task-harbor-arrival")?.title).toBe(before.tasks[0].title);
    expect(after.jobs).toEqual(before.jobs);
    expect(after.results).toEqual(before.results);
    expect(after.generationContextLinks[0]).toMatchObject({
      sourceTaskId: "task-harbor-arrival",
      targetTaskId: "task-hall-projector",
      sourceResultId: "result-arrival-1",
      stale: true,
    });
    expect(listTasksInStoryOrder(after, "scene-hall")[0].id).toBe("task-harbor-arrival");
  });

  it("updates Task beats, assets, and prompts without mutating historical Job snapshots", () => {
    const repo = repository();
    const historicalJob = repo.getSnapshot().jobs.find((job) => job.id === "job-arrival-1")!;
    repo.updateTaskVisualBeats("task-harbor-arrival", [{
      id: "beat-replanned",
      label: "重新规划",
      description: "新的完整任务节拍",
      plannedStart: 0,
      plannedEnd: 15,
    }]);
    repo.updateTaskAssets("task-harbor-arrival", [{ assetId: "asset-rain-audio", role: "audio" }]);
    repo.updateTaskPrompt("task-harbor-arrival", { aiPrompt: "new ai", finalPrompt: "explicit manual final" });
    const snapshot = repo.getSnapshot();

    expect(snapshot.tasks[0].visualBeats).toHaveLength(1);
    expect(snapshot.tasks[0].assetBindings).toEqual([{ assetId: "asset-rain-audio", role: "audio" }]);
    expect(snapshot.tasks[0].finalPrompt).toBe("explicit manual final");
    expect(snapshot.jobs.find((job) => job.id === historicalJob.id)).toEqual(historicalJob);
  });

  it("creates and updates Generation Context independently from placement", () => {
    const repo = repository();
    const placementBefore = repo.listTaskPlacements();
    repo.updateContextLink({
      id: "context-wall-voice",
      sourceTaskId: "task-wall-image",
      targetTaskId: "task-voice",
      kind: "semantic",
      stale: false,
    });
    repo.updateContextLink({
      id: "context-wall-voice",
      sourceTaskId: "task-wall-image",
      targetTaskId: "task-voice",
      kind: "semantic",
      stale: true,
    });
    const snapshot = repo.getSnapshot();

    expect(repo.listTaskPlacements()).toEqual(placementBefore);
    expect(snapshot.generationContextLinks.find((link) => link.id === "context-wall-voice")?.stale).toBe(true);
    expect(snapshot.tasks.find((task) => task.id === "task-wall-image")?.contextLinkIds).toContain("context-wall-voice");
    expect(snapshot.tasks.find((task) => task.id === "task-voice")?.contextLinkIds).toContain("context-wall-voice");
  });

  it("submits an immutable Job snapshot, then adds a complete Task Result", () => {
    const repo = repository();
    const job = repo.submitJob({
      id: "job-wall-repository",
      taskId: "task-wall-image",
      providerId: "fake-video-provider",
      profile: {
        id: "profile-h3-multi-shot",
        capability: { multiShotPrompt: true, maxDurationSeconds: 15, continuation: true },
      },
      createdAt: "2026-09-12T13:00:00.000Z",
    });
    repo.updateTask("task-wall-image", { title: "生成后修改的意图" });

    expect(repo.getSnapshot().jobs.find((item) => item.id === job.id)?.taskContentSnapshot.title).toBe("墙面出现旧影像");
    repo.addResult({
      id: "result-wall-repository",
      jobId: job.id,
      videoUrl: "results/wall-repository.mp4",
      metadata: { durationSeconds: 8 },
      reviewState: "pending",
    });
    const snapshot = repo.getSnapshot();
    expect(snapshot.results.at(-1)).toMatchObject({ id: "result-wall-repository", jobId: job.id });
    expect(snapshot.jobs.find((item) => item.id === job.id)).toMatchObject({ state: "completed", progress: 100 });
    expect(snapshot.tasks.find((task) => task.id === "task-wall-image")?.state).toBe("completed");
  });

  it("sets Primary only for a Result owned by the Task and marks downstream Context stale", () => {
    const repo = repository();
    const changed = repo.setPrimaryResult("task-harbor-arrival", "result-arrival-2");
    const snapshot = repo.getSnapshot();

    expect(changed).toEqual({ changed: true, staleContextLinkIds: ["context-arrival-projector"] });
    expect(snapshot.tasks.find((task) => task.id === "task-harbor-arrival")?.primaryResultId).toBe("result-arrival-2");
    expect(snapshot.generationContextLinks[0]).toMatchObject({ sourceResultId: "result-arrival-1", stale: true });
    expect(repo.setPrimaryResult("task-wall-image", "result-arrival-2").changed).toBe(false);
  });
});
