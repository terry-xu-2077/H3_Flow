import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "terry-react-ui-library";

import { listTasksInStoryOrder, type StoryboardDomainSnapshot } from "../../domain/storyboard";

export function StoryReel({ snapshot, onClose }: { snapshot: StoryboardDomainSnapshot; onClose: () => void }) {
  const orderedTasks = useMemo(() => snapshot.scenes
    .slice()
    .sort((left, right) => left.orderKey.localeCompare(right.orderKey))
    .flatMap((scene) => listTasksInStoryOrder(snapshot, scene.id)), [snapshot]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const task = orderedTasks[currentIndex];
  const primaryResult = task?.primaryResultId ? snapshot.results.find((result) => result.id === task.primaryResultId) : undefined;
  const previewUrl = primaryResult?.previewUrl ?? task?.storyboardFrame.previewUrl;
  const sourceLabel = primaryResult ? "主要生成结果" : task?.storyboardFrame.previewUrl ? "分镜参考画面" : "暂无画面";

  useEffect(() => {
    if (!playing || orderedTasks.length <= 1) return;
    const timer = window.setInterval(() => setCurrentIndex((index) => index >= orderedTasks.length - 1 ? 0 : index + 1), 1200);
    return () => window.clearInterval(timer);
  }, [orderedTasks.length, playing]);

  useEffect(() => {
    if (currentIndex >= orderedTasks.length) setCurrentIndex(Math.max(0, orderedTasks.length - 1));
  }, [currentIndex, orderedTasks.length]);

  if (!task) return <section className="story-reel" aria-label="连续预览"><header><Button onClick={onClose}><ArrowLeft size={14} /> 返回故事板</Button></header><div className="story-reel-empty">当前故事顺序中还没有分镜。</div></section>;

  return (
    <section className="story-reel" aria-label="连续预览">
      <header className="story-reel-head">
        <Button onClick={onClose}><ArrowLeft size={14} /> 返回故事板</Button>
        <div><span className="eyebrow">故事顺序预览</span><h1>连续预览</h1><p>按分镜顺序感受素材节奏，不提供剪辑时间线。</p></div>
        <strong>{currentIndex + 1} / {orderedTasks.length}</strong>
      </header>
      <div className="story-reel-stage" data-source={sourceLabel} style={previewUrl ? { backgroundImage: `linear-gradient(to top, rgba(5,7,9,.86), transparent 62%), url("${previewUrl}")` } : undefined}>
        <span>{sourceLabel}</span>
        <div><small>{task.number}</small><h2>{task.title}</h2><p>{task.summary}</p><em>{task.visualBeats.length > 1 ? `包含 ${task.visualBeats.length} 个内部镜头` : "单镜头"}</em></div>
      </div>
      <div className="story-reel-controls" aria-label="连续预览控制">
        <Button onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}><SkipBack size={15} /> 上一个</Button>
        <Button variant="accent" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "暂停" : "播放"}</Button>
        <Button onClick={() => setCurrentIndex((index) => Math.min(orderedTasks.length - 1, index + 1))} disabled={currentIndex === orderedTasks.length - 1}>下一个 <SkipForward size={15} /></Button>
        <span>计划时长 <strong>{task.plannedDurationSeconds} 秒</strong></span>
      </div>
      <nav className="story-reel-jump" aria-label="跳转分镜">
        {orderedTasks.map((item, index) => <button key={item.id} type="button" className={index === currentIndex ? "is-current" : ""} onClick={() => { setCurrentIndex(index); setPlaying(false); }}><span>{item.number}</span><strong>{item.title}</strong><small>{item.plannedDurationSeconds} 秒</small></button>)}
      </nav>
    </section>
  );
}