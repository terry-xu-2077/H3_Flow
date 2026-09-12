import { useState } from "react";
import { ChevronLeft, Layers, SlidersHorizontal } from "lucide-react";
import { Button } from "terry-react-ui-library";

import { PortalSelect } from "../ui/overlay";

type ScenarioPanelProps = {
  providerOnline: boolean;
  onProviderChange: (online: boolean) => void;
  taskDensity: string;
  onTaskDensityChange: (value: string) => void;
  onOpenOverlayLab: () => void;
};

export function ScenarioPanel({
  providerOnline,
  onProviderChange,
  taskDensity,
  onTaskDensityChange,
  onOpenOverlayLab,
}: ScenarioPanelProps) {
  const [open, setOpen] = useState(() => window.innerWidth > 760);

  return (
    <aside className={`scenario-panel ${open ? "is-open" : ""}`} aria-label="UI 场景控制器">
      <button className="scenario-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? <ChevronLeft size={16} /> : <SlidersHorizontal size={16} />}
        <span>{open ? "收起场景" : "场景"}</span>
      </button>
      {open && (
        <div className="scenario-body">
          <div>
            <span className="eyebrow">DEVELOPMENT MODE</span>
            <h2>界面场景</h2>
            <p>固定 Mock 数据，不连接真实 Provider。</p>
          </div>
          <label>
            <span>Provider 状态</span>
            <PortalSelect
              value={providerOnline ? "online" : "offline"}
              options={[
                { value: "online", label: "在线" },
                { value: "offline", label: "离线" },
              ]}
              onChange={(value) => onProviderChange(value === "online")}
              ariaLabel="Provider 状态"
            />
          </label>
          <label>
            <span>任务数量</span>
            <PortalSelect
              value={taskDensity}
              options={[
                { value: "empty", label: "空数据" },
                { value: "normal", label: "6 个任务" },
                { value: "dense", label: "24 个任务" },
              ]}
              onChange={onTaskDensityChange}
              ariaLabel="任务数量"
            />
          </label>
          <Button onClick={onOpenOverlayLab}><Layers size={15} /> 浮层实验室</Button>
          <Button onClick={() => window.location.reload()}>重置场景</Button>
        </div>
      )}
    </aside>
  );
}
