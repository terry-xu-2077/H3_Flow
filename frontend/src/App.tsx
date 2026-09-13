import { useEffect, useState } from "react";
import {
  Boxes,
  ChevronDown,
  CircleGauge,
  FolderKanban,
  Settings2,
  Sparkles,
} from "lucide-react";
import { StatusPill } from "terry-react-ui-library";

import { OverlayLab } from "./components/OverlayLab";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { AssetLibraryWorkspace } from "./features/assets/AssetLibraryWorkspace";
import { DirectorProductionWorkspace } from "./features/production/DirectorProductionWorkspace";
import { DirectorStoryboardWorkspace } from "./features/storyboard/DirectorStoryboardWorkspace";
import { mockProjectAssets } from "./mock/assets";
import { storyboardForDensity, type StoryboardDensity } from "./mock/storyboardScenarios";

const navigation = [
  { label: "故事板", icon: FolderKanban },
  { label: "生成", icon: CircleGauge },
  { label: "素材", icon: Boxes },
] as const;

type NavigationLabel = typeof navigation[number]["label"];

export function App() {
  const [activeNav, setActiveNav] = useState<NavigationLabel>("故事板");
  const [providerOnline, setProviderOnline] = useState(true);
  const [taskDensity, setTaskDensity] = useState<StoryboardDensity>("normal");
  const [storyboardSnapshot, setStoryboardSnapshot] = useState(() => storyboardForDensity("normal"));
  const [storyboardFocusTaskId, setStoryboardFocusTaskId] = useState<string | null>(null);
  const [overlayLabOpen, setOverlayLabOpen] = useState(false);
  const isDevUi = window.location.pathname.startsWith("/dev/ui");

  useEffect(() => {
    setStoryboardSnapshot(storyboardForDensity(taskDensity));
    setStoryboardFocusTaskId(null);
  }, [taskDensity]);

  return (
    <div className="app-frame director-app-frame">
      <header className="topbar director-topbar">
        <a className="brand" href="/" aria-label="ShotMill 首页">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <strong>ShotMill</strong>
          {isDevUi && <span className="dev-badge">界面开发</span>}
        </a>

        <button className="project-switcher" type="button">
          <span className="project-dot" />
          <span><small>当前项目</small><strong>雾港来信 · EP01</strong></span>
          <ChevronDown size={16} />
        </button>

        <div className="director-topbar-spacer" />

        <div className="system-status director-system-status">
          <span className={`status-dot ${providerOnline ? "is-online" : "is-offline"}`} />
          <span><small>生成服务</small><strong>{providerOnline ? "已连接" : "未连接"}</strong></span>
          <StatusPill tone={providerOnline ? "active" : "danger"}>{providerOnline ? "正常" : "离线"}</StatusPill>
        </div>

        <button className="director-settings-button" type="button" aria-label="项目设置" title="项目设置">
          <Settings2 size={18} />
        </button>
      </header>

      <div className="app-body director-app-body">
        <nav className="sidebar director-sidebar" aria-label="主导航">
          <div className="nav-items">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className={activeNav === label ? "is-active" : ""}
                onClick={() => setActiveNav(label)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {label === "生成" && storyboardSnapshot.jobs.some((job) => ["queued", "running", "failed"].includes(job.state)) && (
                  <em>{storyboardSnapshot.jobs.filter((job) => ["queued", "running", "failed"].includes(job.state)).length}</em>
                )}
              </button>
            ))}
          </div>
          <div className="sidebar-foot">
            <div className="storage-ring"><span>68%</span></div>
            <span><strong>工作盘</strong><small>1.4 TB 可用</small></span>
          </div>
        </nav>

        <main className="workspace director-workspace">
          {activeNav === "故事板" && (
            <DirectorStoryboardWorkspace
              density={taskDensity}
              providerOnline={providerOnline}
              value={storyboardSnapshot}
              onChange={setStoryboardSnapshot}
              focusTaskId={storyboardFocusTaskId}
            />
          )}

          {activeNav === "生成" && (
            <DirectorProductionWorkspace snapshot={storyboardSnapshot} />
          )}

          {activeNav === "素材" && (
            <AssetLibraryWorkspace assets={mockProjectAssets} />
          )}
        </main>
      </div>

      {isDevUi && (
        <ScenarioPanel
          providerOnline={providerOnline}
          onProviderChange={setProviderOnline}
          taskDensity={taskDensity}
          onTaskDensityChange={setTaskDensity}
          onOpenOverlayLab={() => setOverlayLabOpen(true)}
        />
      )}
      <OverlayLab open={overlayLabOpen} onClose={() => setOverlayLabOpen(false)} />
    </div>
  );
}