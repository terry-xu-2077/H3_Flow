import { FileImage, Film, Info, Music2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { AssetCategory, AssetMediaType, ProjectAsset } from "../../domain/storyboard";
import { PortalSelect } from "../../ui/overlay";

function icon(type: AssetMediaType) {
  if (type === "video") return <Film size={24} />;
  if (type === "audio") return <Music2 size={24} />;
  return <FileImage size={24} />;
}

function mediaLabel(type: AssetMediaType) {
  if (type === "video") return "视频";
  if (type === "audio") return "音频";
  return "图片";
}

function categoryLabel(category: AssetCategory) {
  if (category === "character") return "角色";
  if (category === "scene") return "场景";
  if (category === "prop") return "道具";
  return "参考";
}

export function AssetLibraryWorkspace({ assets }: { assets: ProjectAsset[] }) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<"all" | AssetMediaType>("all");
  const [category, setCategory] = useState<"all" | AssetCategory>("all");
  const [previewId, setPreviewId] = useState(assets[0]?.id ?? "");
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return assets.filter((asset) =>
      (mediaType === "all" || asset.mediaType === mediaType)
      && (category === "all" || asset.category === category)
      && (!needle || [asset.name, ...asset.tags].join(" ").toLocaleLowerCase().includes(needle)),
    );
  }, [assets, category, mediaType, query]);
  const preview = assets.find((asset) => asset.id === previewId) ?? filtered[0];

  return (
    <section className="asset-library-workspace" aria-label="素材库">
      <header>
        <div><span className="eyebrow">项目素材</span><h1>素材</h1><p>集中整理角色、场景、道具和参考素材。</p></div>
        <strong>{filtered.length} / {assets.length}</strong>
      </header>
      <div className="asset-library-filters">
        <label className="asset-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或标签" aria-label="素材搜索" /></label>
        <PortalSelect value={mediaType} onChange={(value) => setMediaType(value as typeof mediaType)} ariaLabel="素材媒体类型" options={[
          { value: "all", label: "全部媒体" }, { value: "image", label: "图片" }, { value: "video", label: "视频" }, { value: "audio", label: "音频" },
        ]} />
        <PortalSelect value={category} onChange={(value) => setCategory(value as typeof category)} ariaLabel="素材分类" options={[
          { value: "all", label: "全部分类" }, { value: "character", label: "角色" }, { value: "scene", label: "场景" }, { value: "prop", label: "道具" }, { value: "reference", label: "参考" },
        ]} />
      </div>
      <div className="asset-library-body">
        <div className="asset-library-grid" role="list" aria-label="素材列表">
          {filtered.map((asset) => (
            <button key={asset.id} type="button" className={preview?.id === asset.id ? "is-selected" : ""} onClick={() => {
              setPreviewId(asset.id);
              setTechnicalOpen(false);
            }}>
              <span style={asset.previewUrl ? { backgroundImage: `url("${asset.previewUrl}")` } : undefined}>{icon(asset.mediaType)}</span>
              <strong>{asset.name}</strong>
              <small>{mediaLabel(asset.mediaType)} · {categoryLabel(asset.category)}</small>
              <em>{asset.tags.join(" · ")}</em>
            </button>
          ))}
        </div>
        <aside className="asset-library-preview" aria-label="素材详情">
          {preview && <>
            <div style={preview.previewUrl ? { backgroundImage: `url("${preview.previewUrl}")` } : undefined}>{icon(preview.mediaType)}</div>
            <span>{mediaLabel(preview.mediaType)} · {categoryLabel(preview.category)}</span>
            <h2>{preview.name}</h2>
            <small>{preview.tags.map((tag) => <em key={tag}>{tag}</em>)}</small>
            <button className="asset-technical-toggle" type="button" onClick={() => setTechnicalOpen((open) => !open)}>
              <Info size={13} /> {technicalOpen ? "隐藏技术信息" : "技术信息"}
            </button>
            {technicalOpen && (
              <div className="asset-technical-info" aria-label="素材技术信息">
                <p><strong>项目路径：</strong>{preview.projectRelativePath}</p>
                <code>素材 ID：{preview.id}</code>
              </div>
            )}
          </>}
        </aside>
      </div>
    </section>
  );
}