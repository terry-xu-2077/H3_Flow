import { useLayoutEffect, useMemo, useRef } from "react";

import { PromptAssetEditor, type PromptAsset } from "./PromptAssetEditor";

export type H3PromptViewMode = "visual" | "text";

type H3PromptEditorProps = {
  value: string;
  onChange: (value: string) => void;
  assets: PromptAsset[];
  ariaLabel: string;
  viewMode: H3PromptViewMode;
};

const cameraLabels = new Map<string, string>([
  ["the camera pushes in", "推进"],
  ["the camera pulls out", "拉远"],
  ["the camera pans left", "左摇"],
  ["the camera pans right", "右摇"],
  ["the camera trucks left", "左移"],
  ["the camera trucks right", "右移"],
  ["the camera tilts up", "上摇"],
  ["the camera tilts down", "下摇"],
  ["the camera moves upward", "升镜"],
  ["the camera moves downward", "降镜"],
  ["the camera moves in an arc around the subject", "环绕"],
  ["the camera follows the moving subject in a tracking shot", "跟拍"],
  ["the camera holds a static shot", "固定镜头"],
  ["the camera zooms in", "变焦推近"],
  ["the camera zooms out", "变焦拉远"],
  ["the camera shakes slightly", "轻微晃动"],
  ["the camera shakes strongly", "强烈晃动"],
]);

const sectionLabels: Record<string, string> = {
  subject_definitions: "主体定义",
  summary: "摘要",
  retention_analysis: "保留关系分析",
  detailed_description: "详细描述",
  integrated_multimodal_description: "综合多模态描述",
  overall_soundscape: "整体声景",
  non_diegetic_music: "非剧情音乐",
};

const exactLabels: Record<string, string> = {
  fully_preserved: "完整保留",
  partially_preserved: "部分保留",
  attribute_transfer: "属性迁移",
  weak_reference: "弱参考",
  fully_copy: "完整复制",
  partially_copy: "部分复制",
  reference: "参考",
  "<scenetrans>": "跨镜头连续",
  "<cutoff>": "结尾截断",
  "[reference generation]": "参考生成",
  "[keyframe completion]": "关键帧补全",
  "[video editing]": "视频编辑",
  "[video continuation]": "视频续写",
  "[audio reuse]": "音频复用",
  "[audio reference]": "音频参考",
};

const H3_TOKEN_PATTERN = /<d>\[[^\]]+\][\s\S]*?<\/d>|<(?:Subject|Picture|Video|Audio)\s+\d+>|\[Shot\s+\d+\]|\(S\d+\)|<scenetrans>|<cutoff>|\b(?:fully_preserved|partially_preserved|attribute_transfer|weak_reference|fully_copy|partially_copy|reference)\b|\[\d{2}:\d{2}\]|^(?:subject_definitions|summary|retention_analysis|detailed_description|integrated_multimodal_description|overall_soundscape|non_diegetic_music):|\[(?:reference generation|keyframe completion|video editing|video continuation|audio reuse|audio reference)(?:\s*\+[^\]]+)?\]|The camera (?:pushes in|pulls out|pans left|pans right|trucks left|trucks right|tilts up|tilts down|moves upward|moves downward|moves in an arc around the subject|follows the moving subject in a tracking shot|holds a static shot|zooms in|zooms out|shakes slightly|shakes strongly)/gmi;

function tokenType(raw: string) {
  const value = raw.trim();
  if (/^(?:subject_definitions|summary|retention_analysis|detailed_description|integrated_multimodal_description|overall_soundscape|non_diegetic_music):$/i.test(value)) return "section";
  if (/^<Subject\s+\d+>$/i.test(value)) return "subject";
  if (/^<Picture\s+\d+>$/i.test(value)) return "picture";
  if (/^<Video\s+\d+>$/i.test(value)) return "video";
  if (/^<Audio\s+\d+>$/i.test(value)) return "audio";
  if (/^\[Shot\s+\d+\]$/i.test(value)) return "shot";
  if (/^\(S\d+\)$/i.test(value)) return "speaker";
  if (/^<d>\[/i.test(value)) return "dialogue";
  if (/^\[\d{2}:\d{2}\]$/.test(value)) return "time";
  if (/^<(scenetrans|cutoff)>$/i.test(value)) return "transition";
  if (/^\[(reference generation|keyframe completion|video editing|video continuation|audio reuse|audio reference)/i.test(value)) return "task";
  if (cameraLabels.has(value.toLowerCase())) return "camera";
  return "retention";
}

function visibleLabel(raw: string) {
  const value = raw.trim();
  const section = value.match(/^([a-z_]+):$/i);
  if (section && sectionLabels[section[1].toLowerCase()]) return sectionLabels[section[1].toLowerCase()];
  if (exactLabels[value.toLowerCase()]) return exactLabels[value.toLowerCase()];
  const camera = cameraLabels.get(value.toLowerCase());
  if (camera) return camera;
  let match = value.match(/^<Subject\s+(\d+)>$/i);
  if (match) return `主体 ${match[1]}`;
  match = value.match(/^<Picture\s+(\d+)>$/i);
  if (match) return `图片 ${match[1]}`;
  match = value.match(/^<Video\s+(\d+)>$/i);
  if (match) return `视频 ${match[1]}`;
  match = value.match(/^<Audio\s+(\d+)>$/i);
  if (match) return `音频 ${match[1]}`;
  match = value.match(/^\[Shot\s+(\d+)\]$/i);
  if (match) return `镜头 ${match[1]}`;
  match = value.match(/^\(S(\d+)\)$/i);
  if (match) return `说话人 S${match[1]}`;
  match = value.match(/^\[(\d{2}:\d{2})\]$/);
  if (match) return `时间 ${match[1]}`;
  return value;
}

function appendText(container: HTMLElement, text: string) {
  text.split("\n").forEach((part, index) => {
    if (index) container.append(document.createElement("br"));
    if (part) container.append(document.createTextNode(part));
  });
}

function mediaGlyph(asset: PromptAsset) {
  if (asset.kind === "subject") return "人";
  if (asset.kind === "video") return "▶";
  if (asset.kind === "audio") return "♪";
  return "图";
}

function createDialogueChip(raw: string, notifyChange: () => void) {
  const match = raw.match(/^<d>\[([^\]]+)\]\s*([\s\S]*?)<\/d>$/i);
  const chip = document.createElement("span");
  chip.className = "h3-visual-chip is-dialogue";
  chip.contentEditable = "false";
  chip.dataset.raw = raw;
  if (!match) {
    chip.textContent = raw;
    return chip;
  }

  const language = document.createElement("select");
  language.className = "h3-dialogue-language";
  language.setAttribute("aria-label", "对白语言");
  const languages = ["English", "Chinese", "Cantonese", "Japanese", "Korean", "Spanish", "French", "German", "Russian", "Other"];
  const current = match[1] || "English";
  for (const value of languages.includes(current) ? languages : [current, ...languages]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === current;
    language.append(option);
  }

  const body = document.createElement("span");
  body.className = "h3-dialogue-text";
  body.contentEditable = "true";
  body.spellcheck = false;
  body.textContent = match[2] || "";

  const update = () => {
    const text = String(body.innerText || body.textContent || "").replace(/\r?\n/g, " ");
    chip.dataset.raw = `<d>[${language.value || "English"}] ${text}</d>`;
    notifyChange();
  };
  language.addEventListener("change", update);
  language.addEventListener("pointerdown", (event) => event.stopPropagation());
  body.addEventListener("input", update);
  body.addEventListener("pointerdown", (event) => event.stopPropagation());
  body.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") event.preventDefault();
  });
  chip.append(language, body);
  return chip;
}

function createTokenChip(raw: string, assets: PromptAsset[], notifyChange: () => void) {
  const type = tokenType(raw);
  if (type === "dialogue") return createDialogueChip(raw, notifyChange);

  const chip = document.createElement("span");
  chip.className = `h3-visual-chip is-${type}`;
  chip.contentEditable = "false";
  chip.dataset.raw = raw;

  const asset = assets.find((item) => item.reference.toLowerCase() === raw.trim().toLowerCase());
  if (asset) {
    chip.classList.add("is-media");
    if (asset.previewUrl && asset.kind !== "audio") {
      const image = document.createElement("img");
      image.src = asset.previewUrl;
      image.alt = asset.name;
      chip.append(image);
    } else {
      const glyph = document.createElement("span");
      glyph.className = "h3-visual-chip-glyph";
      glyph.textContent = mediaGlyph(asset);
      chip.append(glyph);
    }
    const label = document.createElement("span");
    label.textContent = asset.name || visibleLabel(raw);
    chip.append(label);
    chip.title = `${visibleLabel(raw)} · ${asset.detail}`;
    return chip;
  }

  chip.textContent = visibleLabel(raw);
  chip.title = raw;
  return chip;
}

function serializeVisual(root: HTMLElement) {
  const visit = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    if (node.tagName === "BR") return "\n";
    if (node.dataset.raw != null) return node.dataset.raw;
    return Array.from(node.childNodes).map(visit).join("");
  };
  return Array.from(root.childNodes).map(visit).join("");
}

function renderVisual(root: HTMLElement, value: string, assets: PromptAsset[], notifyChange: () => void) {
  root.replaceChildren();
  H3_TOKEN_PATTERN.lastIndex = 0;
  let cursor = 0;
  for (const match of value.matchAll(H3_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) appendText(root, value.slice(cursor, index));
    root.append(createTokenChip(match[0], assets, notifyChange));
    cursor = index + match[0].length;
  }
  if (cursor < value.length) appendText(root, value.slice(cursor));
  if (!value) root.append(document.createElement("br"));
}

export function H3PromptEditor({ value, onChange, assets, ariaLabel, viewMode }: H3PromptEditorProps) {
  const visualRef = useRef<HTMLDivElement>(null);
  const latestValue = useRef(value);
  latestValue.current = value;

  const assetKey = useMemo(() => assets.map((asset) => `${asset.id}:${asset.previewUrl || ""}:${asset.name}`).join("|"), [assets]);

  useLayoutEffect(() => {
    if (viewMode !== "visual") return;
    const root = visualRef.current;
    if (!root) return;
    const current = serializeVisual(root);
    if (current === value && root.childNodes.length > 0) return;
    renderVisual(root, value, assets, () => {
      const next = serializeVisual(root);
      latestValue.current = next;
      onChange(next);
    });
  }, [assetKey, assets, onChange, value, viewMode]);

  if (viewMode === "text") {
    return <PromptAssetEditor value={value} onChange={onChange} assets={assets} ariaLabel={ariaLabel} rows={18} />;
  }

  return (
    <div className="h3-visual-editor-shell">
      <div
        ref={visualRef}
        className="h3-visual-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={`${ariaLabel}可视化`}
        aria-multiline="true"
        data-placeholder="在这里编写 H3 提示词。标签、镜头、对白和素材引用会以可视化组件显示。"
        onInput={(event) => {
          const next = serializeVisual(event.currentTarget);
          latestValue.current = next;
          onChange(next);
        }}
        onBlur={(event) => {
          const next = serializeVisual(event.currentTarget);
          if (next !== latestValue.current) onChange(next);
          renderVisual(event.currentTarget, next, assets, () => onChange(serializeVisual(event.currentTarget)));
        }}
      />
      <div className="h3-visual-editor-hint">可视化模式会将 H3 标签、素材引用、镜头标记与对白格式化显示；切回“文本”可查看原始提示词。</div>
    </div>
  );
}
