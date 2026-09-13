import type { TaskProposal, TaskVisualBeat } from "../../domain/storyboard";

function cleanExcerpt(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function beatsFromExcerpt(excerpt: string, tempId: string): TaskVisualBeat[] {
  const clauses = excerpt
    .split(/[，；;。！？!?]/)
    .map(cleanExcerpt)
    .filter(Boolean)
    .slice(0, 3);
  const beatDescriptions = clauses.length > 0 ? clauses : [excerpt];
  const duration = Math.max(3, beatDescriptions.length * 3);
  return beatDescriptions.map((description, index) => ({
    id: `${tempId}-beat-${index + 1}`,
    label: index === 0 ? "建立" : index === beatDescriptions.length - 1 ? "收束" : `发展 ${index}`,
    description,
    plannedStart: Math.round(index * duration / beatDescriptions.length),
    plannedEnd: Math.round((index + 1) * duration / beatDescriptions.length),
  }));
}

export function proposalFromExcerpt(excerpt: string, tempId: string, targetSceneId: string): TaskProposal {
  const normalized = cleanExcerpt(excerpt);
  const visualBeats = beatsFromExcerpt(normalized, tempId);
  return {
    tempId,
    scriptExcerpt: normalized,
    title: normalized.slice(0, 18) || "未命名剧本任务",
    summary: normalized || "等待补充剧本内容。",
    userIntent: "保持叙事动作清晰，并延续相邻 Task 的视觉连续性。",
    visualBeats,
    plannedDurationSeconds: Math.max(4, visualBeats.length * 3),
    suggestedAssetIds: [],
    suggestedProfileId: "profile-h3-multi-shot",
    suggestedProfileLabel: "H3 · Multi-shot",
    notes: "Mock AI Proposal；创建前可继续修改。",
    targetSceneId,
  };
}

export function proposeTasksFromScript(script: string, targetSceneId: string): TaskProposal[] {
  const normalized = script.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n\s*\n/).map(cleanExcerpt).filter(Boolean);
  const excerpts = paragraphs.length > 1
    ? paragraphs
    : normalized.split(/(?<=[。！？!?])\s*/).map(cleanExcerpt).filter(Boolean);
  return excerpts.map((excerpt, index) => proposalFromExcerpt(excerpt, `proposal-${index + 1}`, targetSceneId));
}

export function mergeTaskProposals(first: TaskProposal, second: TaskProposal): TaskProposal {
  const tempId = `${first.tempId}-merged`;
  return {
    ...first,
    tempId,
    scriptExcerpt: `${first.scriptExcerpt}\n${second.scriptExcerpt}`,
    title: `${first.title} / ${second.title}`,
    summary: `${first.summary} ${second.summary}`,
    visualBeats: [...first.visualBeats, ...second.visualBeats].map((beat, index) => ({
      ...beat,
      id: `${tempId}-beat-${index + 1}`,
    })),
    plannedDurationSeconds: first.plannedDurationSeconds + second.plannedDurationSeconds,
    suggestedAssetIds: [...new Set([...first.suggestedAssetIds, ...second.suggestedAssetIds])],
    notes: "由两个 Proposal 合并；创建前可继续修改。",
  };
}

export function splitTaskProposal(proposal: TaskProposal): [TaskProposal, TaskProposal] | null {
  const sentences = proposal.scriptExcerpt.split(/(?<=[。！？!?])\s*/).map(cleanExcerpt).filter(Boolean);
  if (sentences.length < 2 && proposal.visualBeats.length < 2) return null;
  const midpoint = sentences.length >= 2 ? Math.ceil(sentences.length / 2) : Math.ceil(proposal.visualBeats.length / 2);
  const firstExcerpt = sentences.length >= 2
    ? sentences.slice(0, midpoint).join("")
    : proposal.visualBeats.slice(0, midpoint).map((beat) => beat.description).join("，");
  const secondExcerpt = sentences.length >= 2
    ? sentences.slice(midpoint).join("")
    : proposal.visualBeats.slice(midpoint).map((beat) => beat.description).join("，");
  return [
    proposalFromExcerpt(firstExcerpt, `${proposal.tempId}-a`, proposal.targetSceneId),
    proposalFromExcerpt(secondExcerpt, `${proposal.tempId}-b`, proposal.targetSceneId),
  ];
}
