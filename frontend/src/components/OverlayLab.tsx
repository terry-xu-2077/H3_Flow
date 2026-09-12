import { Expand, Info, MessageSquareText, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "terry-react-ui-library";

import {
  ContextMenu,
  Dialog,
  FullscreenPreview,
  Popover,
  PortalSelect,
  Tooltip,
  useToast,
} from "../ui/overlay";

const options = [
  { value: "semantic", label: "Semantic only", detail: "所有 Provider 可用" },
  { value: "visual", label: "Visual + Semantic", detail: "图像上下文" },
  { value: "native", label: "Native Context", detail: "Provider 原生状态" },
  { value: "fallback", label: "Frame fallback", detail: "降级为末帧续接" },
  { value: "none", label: "No context", detail: "不传递生成上下文" },
];

export function OverlayLab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [topValue, setTopValue] = useState("visual");
  const [bottomValue, setBottomValue] = useState("native");
  const [transformedValue, setTransformedValue] = useState("fallback");
  const [previewOpen, setPreviewOpen] = useState(false);
  const pushToast = useToast();

  return (
    <>
      <Dialog
        open={open}
        title="浮层边界实验室"
        description="统一 Portal、自动方向、嵌套层级与 Esc 顺序的可复现场景。"
        onClose={onClose}
        size="wide"
      >
        <div className="overlay-lab">
          <section className="overlay-lab-card top-edge-case">
            <header><strong>Top Edge Dropdown</strong><span>默认向下</span></header>
            <PortalSelect
              value={topValue}
              options={options}
              onChange={setTopValue}
              ariaLabel="顶部边缘上下文"
              testId="top-edge-select"
            />
          </section>

          <section className="overlay-lab-card overlay-transform-case">
            <header><strong>Transformed Ancestor</strong><span>Portal 脱离 stacking context</span></header>
            <div className="transformed-host">
              <PortalSelect
                value={transformedValue}
                options={options}
                onChange={setTransformedValue}
                ariaLabel="变换容器上下文"
                testId="transformed-select"
              />
            </div>
          </section>

          <section className="overlay-lab-card primitive-case">
            <header><strong>Popover / Tooltip</strong><span>统一浮层根节点</span></header>
            <div className="primitive-actions">
              <Popover label="上下文说明" trigger={<><Info size={15} /> 查看降级规则</>}>
                <strong>上下文降级</strong>
                <p>Native → Visual / Audio → Semantic。跨 Provider 时自动选择双方共同支持的最高能力。</p>
              </Popover>
              <Tooltip text="后台更新不会抢走当前焦点">
                <button type="button" className="sm-inline-trigger"><MessageSquareText size={15} /> 悬停提示</button>
              </Tooltip>
            </div>
          </section>

          <section className="overlay-lab-card scroll-case-card">
            <header><strong>Scroll Container / Bottom Edge</strong><span>空间不足时向上</span></header>
            <div className="overlay-scroll-case" data-testid="overlay-scroll-container">
              <p>这个容器拥有独立滚动与裁切。菜单通过 Portal 渲染，因此不受容器边界影响。</p>
              <div className="scroll-filler">
                <span>Context capabilities</span>
                <i>Semantic</i><i>Visual</i><i>Audio</i><i>Native</i>
              </div>
              <PortalSelect
                value={bottomValue}
                options={options}
                onChange={setBottomValue}
                ariaLabel="底部边缘上下文"
                testId="bottom-edge-select"
              />
            </div>
          </section>

          <ContextMenu
            actions={[
              { label: "复制场景", onSelect: () => pushToast("已复制浮层场景", "success") },
              { label: "重置状态", onSelect: () => setBottomValue("native") },
              { label: "删除场景", onSelect: () => pushToast("开发场景不会被删除", "danger"), danger: true },
            ]}
          >
            <section className="overlay-lab-card context-case">
              <header><strong>Context Menu</strong><span>右键是增强入口</span></header>
              <div><MoreHorizontal size={18} /><span>在此区域右键测试菜单</span></div>
            </section>
          </ContextMenu>

          <section className="overlay-lab-actions">
            <Button onClick={() => pushToast("场景状态已保存", "success")}>显示 Toast</Button>
            <Button onClick={() => setPreviewOpen(true)}><Expand size={15} /> 全屏预览</Button>
            <Button variant="accent" onClick={onClose}>完成检查</Button>
          </section>
        </div>
      </Dialog>
      <FullscreenPreview open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}
