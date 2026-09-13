import { describe, expect, it } from "vitest";

import { mockStoryboard } from "../mock/storyboard";
import { buildPromptRequest, getTaskPlacement, listContextForTask, listResultsForTask, listTasksInStoryOrder, resolveTaskAssetSnapshots } from "./storyboard";

describe("Storyboard-style Task domain contract", () => {
  it("uses GenerationTask as the identity of every storyboard card", () => {
    const task = mockStoryboard.tasks[0];
    const placement = getTaskPlacement(mockStoryboard, task.id)!;
    const renumbered = { ...task, number: "T09-099" };

    expect(renumbered.id).toBe(task.id);
    expect(placement.taskId).toBe(task.id);
    expect(mockStoryboard).not.toHaveProperty("shots");
    expect(mockStoryboard).not.toHaveProperty("taskShotBindings");
  });

  it("keeps multiple visual beats inside one Generation Task", () => {
    const task = mockStoryboard.tasks.find((item) => item.id === "task-harbor-arrival")!;

    expect(task.visualBeats).toHaveLength(3);
    expect(task.visualBeats.map((item) => item.label)).toEqual(["建立", "停顿", "推门"]);
    expect(task.visualBeats.map((item) => [item.plannedStart, item.plannedEnd])).toEqual([[0, 4], [4, 9], [9, 15]]);
    expect(task.visualBeats.every((item) => !("state" in item) && !("jobIds" in item))).toBe(true);
  });

  it("keeps Task Story Order independent from Generation Context", () => {
    const reordered = structuredClone(mockStoryboard);
    const beforeContext = structuredClone(mockStoryboard.generationContextLinks);
    getTaskPlacement(reordered, "task-wall-image")!.orderKey = "00";

    expect(listTasksInStoryOrder(reordered, "scene-harbor").map((task) => task.id)).toEqual([
      "task-wall-image",
      "task-harbor-arrival",
      "task-hall-projector",
    ]);
    expect(reordered.generationContextLinks).toEqual(beforeContext);
    expect(listContextForTask(reordered, "task-hall-projector")).toHaveLength(1);
  });

  it("stores an immutable Job snapshot of the complete multi-shot Task content", () => {
    const job = mockStoryboard.jobs.find((item) => item.id === "job-arrival-1")!;

    expect(job.taskContentSnapshot.visualBeats).toHaveLength(3);
    expect(job.taskContentSnapshot.plannedDurationSeconds).toBe(15);
    expect(job.finalPromptSnapshot).toBe("immutable multi-shot final prompt");
    expect(job.generationProfileSnapshot.capability.maxDurationSeconds).toBe(15);
  });

  it("keeps every active Job reference resolvable in the Mock snapshot", () => {
    const jobIds = new Set(mockStoryboard.jobs.map((job) => job.id));

    expect(mockStoryboard.tasks.flatMap((task) => task.jobIds).every((jobId) => jobIds.has(jobId))).toBe(true);
  });

  it("keeps Result identity at Job and Task level instead of fabricating Shot results", () => {
    const results = listResultsForTask(mockStoryboard, "task-harbor-arrival");

    expect(results.map((result) => result.id)).toEqual(["result-arrival-1", "result-arrival-2"]);
    expect(results.every((result) => !("shotSpanIds" in result))).toBe(true);
  });

  it("resolves Task asset_id bindings into immutable project-relative snapshots", () => {
    const snapshots = resolveTaskAssetSnapshots(mockStoryboard, "task-hall-projector");

    expect(snapshots).toEqual([{
      assetId: "asset-projector",
      role: "prop",
      mediaType: "image",
      projectRelativePath: "assets/props/projector.webp",
      checksum: "mock-sha256-projector",
    }]);
    expect(snapshots[0].projectRelativePath).not.toMatch(/^[A-Za-z]:\\/);
  });

  it("builds one provider-neutral PromptRequest from Task content, beats, assets, and both context axes", () => {
    const request = buildPromptRequest(mockStoryboard, "task-hall-projector", {
      id: "profile-h3-multi-shot",
      label: "H3 · Multi-shot",
      capability: { multiShotPrompt: true, maxDurationSeconds: 15, continuation: true },
    });

    expect(request.taskId).toBe("task-hall-projector");
    expect(request.taskContent.title).toBe("放映机自行启动");
    expect(request.visualBeats.map((beat) => beat.label)).toEqual(["启动"]);
    expect(request.assets[0].projectRelativePath).toBe("assets/props/projector.webp");
    expect(request.previousTaskContext.storyTask?.taskId).toBe("task-harbor-arrival");
    expect(request.previousTaskContext.generationSources).toMatchObject([{
      link: { sourceTaskId: "task-harbor-arrival", targetTaskId: "task-hall-projector", kind: "visual" },
      sourceTask: { taskId: "task-harbor-arrival", primaryResultId: "result-arrival-1" },
      sourceResult: { id: "result-arrival-1", reviewState: "approved" },
    }]);
    expect(request.nextStoryContext?.taskId).toBe("task-wall-image");
    expect(request.targetGenerationProfile.capability.multiShotPrompt).toBe(true);
    expect(request).not.toHaveProperty("shotId");
  });
});
