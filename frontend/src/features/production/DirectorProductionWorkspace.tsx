import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "terry-react-ui-library";

import type { JobState, StoryboardDomainSnapshot } from "../../domain/storyboard";

const jobLabel: Record<JobState, string> = {
  queued: "等待生成",
  running: "生成中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export function DirectorProductionWorkspace({ snapshot }: { snapshot: StoryboardDomainSnapshot }) {
  const ordered = snapshot.jobs.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const running = ordered.filter((job) => job.state === "running");
  const queued = ordered.filter((job) => job.state === "queued");
  const needsAttention = ordered.filter((job) => job.state === "failed");
  const completed = ordered.filter((job) => job.state === "completed");

  return (
    <section className="director-production" aria-label="生成队列">
      <header className="director-production-head">
        <div>
          <span className="director-kicker">PRODUCTION</span>
          <h1>生成</h1>
          <p>这里只看进度和异常。分镜内容请回到故事板编辑。</p>
        </div>
        <div className="director-production-summary">
          <span><LoaderCircle size={14} /> {running.length} 生成中</span>
          <span><Clock3 size={14} /> {queued.length} 等待</span>
          <span><AlertTriangle size={14} /> {needsAttention.length} 需处理</span>
        </div>
      </header>

      {ordered.length === 0 ? (
        <div className="director-empty-production">
          <CheckCircle2 size={28} />
          <h2>当前没有生成任务</h2>
          <p>在故事板中确认分镜后，点击“生成视频”或“批量生成”。</p>
        </div>
      ) : (
        <div className="director-queue-list">
          {ordered.map((job) => {
            const task = snapshot.tasks.find((item) => item.id === job.taskId);
            return (
              <article key={job.id} className={`director-queue-item is-${job.state}`}>
                <div className="director-queue-icon">
                  {job.state === "running" ? <LoaderCircle size={17} /> : job.state === "failed" ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
                </div>
                <div className="director-queue-copy">
                  <span>{task?.number ?? "分镜"}</span>
                  <strong>{task?.title ?? "未知分镜"}</strong>
                  <small>{jobLabel[job.state]}</small>
                </div>
                <div className="director-queue-progress">
                  <i style={{ width: `${job.state === "completed" ? 100 : job.progress ?? 0}%` }} />
                </div>
                <em>{job.state === "running" ? `${job.progress ?? 0}%` : jobLabel[job.state]}</em>
                {job.state === "failed" && <Button><RotateCcw size={14} /> 重试</Button>}
              </article>
            );
          })}
        </div>
      )}

      {completed.length > 0 && <footer className="director-production-foot">最近已完成 {completed.length} 个生成任务</footer>}
    </section>
  );
}
