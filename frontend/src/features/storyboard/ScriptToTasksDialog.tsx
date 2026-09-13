import { ArrowDown, ArrowUp, GitMerge, Plus, Scissors, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "terry-react-ui-library";

import type { Scene, TaskProposal } from "../../domain/storyboard";
import { Dialog, PortalSelect } from "../../ui/overlay";
import {
  mergeTaskProposals,
  proposalFromExcerpt,
  proposeTasksFromScript,
  splitTaskProposal,
} from "./scriptTaskProposals";

const sampleScript = `雨声渐密。林澜停在仓库门前，收起雨伞，伸手触碰生锈的门把。

门后的放映机自行启动。灰尘中的光束亮起，墙面出现不属于这个年代的旧影像。`;

type ScriptToTasksDialogProps = {
  open: boolean;
  scenes: Scene[];
  defaultSceneId: string;
  onClose: () => void;
  onAccept: (proposals: TaskProposal[]) => void;
};

export function ScriptToTasksDialog({ open, scenes, defaultSceneId, onClose, onAccept }: ScriptToTasksDialogProps) {
  const [script, setScript] = useState(sampleScript);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [message, setMessage] = useState("粘贴剧本后，可手动选段或生成 Mock AI Proposal。");
  const sequence = useRef(100);
  const scriptRef = useRef<HTMLTextAreaElement>(null);

  const nextTempId = () => {
    sequence.current += 1;
    return `proposal-local-${sequence.current}`;
  };
  const updateProposal = (tempId: string, patch: Partial<TaskProposal>) => {
    setProposals((current) => current.map((proposal) => proposal.tempId === tempId ? { ...proposal, ...patch } : proposal));
  };
  const createFromSelection = () => {
    const textarea = scriptRef.current;
    const selected = textarea?.value.slice(textarea.selectionStart, textarea.selectionEnd).trim() ?? "";
    if (!selected) {
      setMessage("请先在剧本文本中选中一段内容。");
      return;
    }
    setProposals((current) => [...current, proposalFromExcerpt(selected, nextTempId(), defaultSceneId)]);
    setMessage("已从选中文本创建一个待确认 Proposal。");
  };
  const generateMockProposals = () => {
    const generated = proposeTasksFromScript(script, defaultSceneId).map((proposal) => ({ ...proposal, tempId: nextTempId() }));
    setProposals(generated);
    setMessage(generated.length > 0 ? `Mock AI 已建议 ${generated.length} 个 Task 边界。` : "请先粘贴剧本内容。");
  };
  const moveProposal = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= proposals.length) return;
    setProposals((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const mergeWithNext = (index: number) => {
    if (!proposals[index + 1]) return;
    setProposals((current) => [
      ...current.slice(0, index),
      mergeTaskProposals(current[index], current[index + 1]),
      ...current.slice(index + 2),
    ]);
  };
  const splitProposal = (index: number) => {
    const split = splitTaskProposal(proposals[index]);
    if (!split) {
      setMessage("这个 Proposal 没有足够的句子或 Visual Beats 可拆分。");
      return;
    }
    setProposals((current) => [...current.slice(0, index), ...split, ...current.slice(index + 1)]);
  };
  const acceptOne = (proposal: TaskProposal) => {
    onAccept([proposal]);
    setProposals((current) => current.filter((item) => item.tempId !== proposal.tempId));
    setMessage("已显式接受 1 个 Proposal，并创建正式 GenerationTask。");
  };

  return (
    <Dialog
      open={open}
      size="wide"
      title="从剧本创建 Task Cards"
      description="Proposal 只是待确认建议；接受前不会创建正式 Task。"
      onClose={onClose}
    >
      <div className="script-task-dialog">
        <section className="script-task-source">
          <label htmlFor="script-task-source">剧本文本</label>
          <textarea
            id="script-task-source"
            ref={scriptRef}
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={8}
          />
          <div>
            <Button onClick={createFromSelection}><Plus size={14} /> 从选中段落创建 Proposal</Button>
            <Button variant="accent" onClick={generateMockProposals}><Sparkles size={14} /> 生成 Mock AI Proposal</Button>
          </div>
          <p role="status">{message}</p>
        </section>

        <section className="script-task-proposals" aria-label="Task Proposals">
          <header><strong>待确认 Proposal</strong><span>{proposals.length}</span></header>
          {proposals.length === 0 ? (
            <div className="script-task-empty">尚未生成 Proposal。</div>
          ) : proposals.map((proposal, index) => (
            <article key={proposal.tempId} aria-label={`Task Proposal ${index + 1}`}>
              <header>
                <span>P{String(index + 1).padStart(2, "0")}</span>
                <strong>{proposal.visualBeats.length} Visual Beats · {proposal.plannedDurationSeconds}s</strong>
                <button type="button" aria-label={`上移 Proposal ${index + 1}`} onClick={() => moveProposal(index, -1)} disabled={index === 0}><ArrowUp size={13} /></button>
                <button type="button" aria-label={`下移 Proposal ${index + 1}`} onClick={() => moveProposal(index, 1)} disabled={index === proposals.length - 1}><ArrowDown size={13} /></button>
              </header>
              <label><span>Title</span><input value={proposal.title} onChange={(event) => updateProposal(proposal.tempId, { title: event.target.value })} /></label>
              <label><span>Script Excerpt</span><textarea rows={2} value={proposal.scriptExcerpt} onChange={(event) => updateProposal(proposal.tempId, { scriptExcerpt: event.target.value })} /></label>
              <label><span>User Intent</span><textarea rows={2} value={proposal.userIntent} onChange={(event) => updateProposal(proposal.tempId, { userIntent: event.target.value })} /></label>
              <label>
                <span>Visual Beats · 每行一个镜头描述</span>
                <textarea
                  aria-label={`Proposal ${index + 1} Visual Beats`}
                  rows={Math.max(2, proposal.visualBeats.length)}
                  value={proposal.visualBeats.map((beat) => beat.description).join("\n")}
                  onChange={(event) => updateProposal(proposal.tempId, {
                    visualBeats: event.target.value.split("\n").filter(Boolean).map((description, beatIndex) => ({
                      id: `${proposal.tempId}-beat-${beatIndex + 1}`,
                      label: `Beat ${beatIndex + 1}`,
                      description,
                    })),
                  })}
                />
              </label>
              <div className="script-task-proposal-row">
                <label><span>Duration</span><input type="number" min="1" value={proposal.plannedDurationSeconds} onChange={(event) => updateProposal(proposal.tempId, { plannedDurationSeconds: Math.max(1, Number(event.target.value) || 1) })} /></label>
                <label>
                  <span>Target Scene</span>
                  <PortalSelect
                    value={proposal.targetSceneId}
                    onChange={(targetSceneId) => updateProposal(proposal.tempId, { targetSceneId })}
                    ariaLabel={`Proposal ${index + 1} Target Scene`}
                    options={scenes.map((scene) => ({ value: scene.id, label: `${scene.number} · ${scene.title}` }))}
                  />
                </label>
              </div>
              <footer>
                <button type="button" onClick={() => splitProposal(index)}><Scissors size={13} /> 拆分</button>
                <button type="button" onClick={() => mergeWithNext(index)} disabled={index === proposals.length - 1}><GitMerge size={13} /> 与下一个合并</button>
                <button type="button" onClick={() => setProposals((current) => current.filter((item) => item.tempId !== proposal.tempId))}><Trash2 size={13} /> 删除</button>
                <Button variant="accent" onClick={() => acceptOne(proposal)}>接受并创建</Button>
              </footer>
            </article>
          ))}
        </section>

        <footer className="script-task-dialog-actions">
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="accent"
            disabled={proposals.length === 0}
            onClick={() => {
              onAccept(proposals);
              setProposals([]);
              onClose();
            }}
          >接受全部并创建 {proposals.length} 个 Task</Button>
        </footer>
      </div>
    </Dialog>
  );
}
