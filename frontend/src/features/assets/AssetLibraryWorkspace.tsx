import { FileImage, Film, Music2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { AssetCategory, AssetMediaType, ProjectAsset } from "../../domain/storyboard";
import { PortalSelect } from "../../ui/overlay";

function icon(type: AssetMediaType) {
  if (type === "video") return <Film size={24} />;
  if (type === "audio") return <Music2 size={24} />;
  return <FileImage size={24} />;
}

export function AssetLibraryWorkspace({ assets }: { assets: ProjectAsset[] }) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<"all" | AssetMediaType>("all");
  const [category, setCategory] = useState<"all" | AssetCategory>("all");
  const [previewId, setPreviewId] = useState(assets[0]?.id ?? "");
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
    <section className="asset-library-workspace" aria-label="Asset Library">
      <header>
        <div><span className="eyebrow">PROJECT ASSETS</span><h1>资产库</h1><p>项目资产只保存 project-relative path，通过 asset_id 绑定到 Task。</p></div>
        <strong>{filtered.length} / {assets.length}</strong>
      </header>
      <div className="asset-library-filters">
        <label className="asset-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或 Tag" aria-label="资产库搜索" /></label>
        <PortalSelect value={mediaType} onChange={(value) => setMediaType(value as typeof mediaType)} ariaLabel="资产库媒体类型" options={[
          { value: "all", label: "全部媒体" }, { value: "image", label: "Image" }, { value: "video", label: "Video" }, { value: "audio", label: "Audio" },
        ]} />
        <PortalSelect value={category} onChange={(value) => setCategory(value as typeof category)} ariaLabel="资产库分类" options={[
          { value: "all", label: "全部分类" }, { value: "character", label: "Character" }, { value: "scene", label: "Scene" }, { value: "prop", label: "Prop" }, { value: "reference", label: "Reference" },
        ]} />
      </div>
      <div className="asset-library-body">
        <div className="asset-library-grid" role="list" aria-label="资产列表">
          {filtered.map((asset) => (
            <button key={asset.id} type="button" className={preview?.id === asset.id ? "is-selected" : ""} onClick={() => setPreviewId(asset.id)}>
              <span style={asset.previewUrl ? { backgroundImage: `url("${asset.previewUrl}")` } : undefined}>{icon(asset.mediaType)}</span>
              <strong>{asset.name}</strong>
              <small>{asset.mediaType} · {asset.category}</small>
              <em>{asset.tags.join(" · ")}</em>
            </button>
          ))}
        </div>
        <aside className="asset-library-preview" aria-label="资产详情">
          {preview && <>
            <div style={preview.previewUrl ? { backgroundImage: `url("${preview.previewUrl}")` } : undefined}>{icon(preview.mediaType)}</div>
            <span>{preview.mediaType} · {preview.category}</span>
            <h2>{preview.name}</h2>
            <p>{preview.projectRelativePath}</p>
            <code>asset_id: {preview.id}</code>
            <small>{preview.tags.map((tag) => <em key={tag}>{tag}</em>)}</small>
          </>}
        </aside>
      </div>
    </section>
  );
}
