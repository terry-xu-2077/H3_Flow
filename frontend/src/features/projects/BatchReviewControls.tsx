import { Sparkles, Video, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Checkbox } from "terry-react-ui-library";

import { Dialog } from "../../ui/overlay";

export type PromptBatchOptions = {
  includeProjectBackground: boolean;
  includePreviousTaskSummary: boolean;
};

export function BatchActionBar({
  selectedCount,
  onEnhance,
  onGenerate,
  onClear,
}: {
  selectedCount: number;
  onEnhance: () => void;
  onGenerate: () => void;
  onClear: () => void;
}) {
  if (selectedCount < 1) return null;

  return (
    <div className="batch-action-bar" role="region" aria-label="批量操作">
      <strong>已选择 {selectedCount} 项</strong>
      <div className="batch-action-bar-actions">
        <Button onClick={onEnhance}><Sparkles size={14} /> AI 增强</Button>
        <Button onClick={onGenerate}><Video size={14} /> 生成视频</Button>
        <Button onClick={onClear}><X size={14} /> 取消选择</Button>
      </div>
    </div>
  );
}

export function BatchPromptDialog({
  open,
  taskCount,
  projectBackgroundAvailable,
  onClose,
  onConfirm,
}: {
  open: boolean;
  taskCount: number;
  projectBackgroundAvailable: boolean;
  onClose: () => void;
  onConfirm?: (options: PromptBatchOptions) => void;
}) {
  const [includeProjectBackground, setIncludeProjectBackground] = useState(projectBackgroundAvailable);
  const [includePreviousTaskSummary, setIncludePreviousTaskSummary] = useState(true);

  useEffect(() => {
    if (!open) return;
    setIncludeProjectBackground(projectBackgroundAvailable);
    setIncludePreviousTaskSummary(true);
  }, [open, projectBackgroundAvailable]);

  return (
    <Dialog open={open} title="批量 AI 增强" onClose={onClose}>
      <div className="batch-prompt-dialog">
        <div className="batch-prompt-summary">
          <strong>将处理 {taskCount} 个任务</strong>
          <span>AI：Qwen3.8</span>
        </div>

        <div className="batch-prompt-options" aria-label="增强上下文">
          <label>
            <span>项目背景</span>
            <Checkbox
              checked={includeProjectBackground}
              disabled={!projectBackgroundAvailable}
              onChange={setIncludeProjectBackground}
              ariaLabel="项目背景"
            />
          </label>
          <label>
            <span>上一任务摘要</span>
            <Checkbox
              checked={includePreviousTaskSummary}
              onChange={setIncludePreviousTaskSummary}
              ariaLabel="上一任务摘要"
            />
          </label>
        </div>

        <div className="batch-prompt-order">
          <span>执行顺序</span>
          <strong>按当前任务顺序</strong>
        </div>

        <footer>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="accent"
            disabled={!onConfirm || taskCount < 1}
            onClick={() => onConfirm?.({ includeProjectBackground, includePreviousTaskSummary })}
          >
            开始增强
          </Button>
        </footer>
      </div>
    </Dialog>
  );
}
