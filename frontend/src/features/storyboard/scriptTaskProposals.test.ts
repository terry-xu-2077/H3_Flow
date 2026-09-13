import { describe, expect, it } from "vitest";

import { mergeTaskProposals, proposalFromExcerpt, proposeTasksFromScript, splitTaskProposal } from "./scriptTaskProposals";

describe("script Task proposals", () => {
  it("turns script paragraphs into editable Task boundaries with internal visual beats", () => {
    const proposals = proposeTasksFromScript(
      "她抵达仓库，收起雨伞，推开大门。\n\n放映机启动，墙面出现旧影像。",
      "scene-harbor",
    );

    expect(proposals).toHaveLength(2);
    expect(proposals[0].targetSceneId).toBe("scene-harbor");
    expect(proposals[0].visualBeats).toHaveLength(3);
    expect(proposals[0].tempId).toMatch(/^proposal-/);
  });

  it("splits and merges Proposal boundaries before formal Task creation", () => {
    const proposal = proposalFromExcerpt("她停下。她回头。门自行打开。", "proposal-manual", "scene-harbor");
    const split = splitTaskProposal(proposal);

    expect(split).not.toBeNull();
    const merged = mergeTaskProposals(split![0], split![1]);
    expect(merged.scriptExcerpt).toContain("她停下");
    expect(merged.scriptExcerpt).toContain("门自行打开");
    expect(merged.plannedDurationSeconds).toBe(split![0].plannedDurationSeconds + split![1].plannedDurationSeconds);
  });
});
