import type { ProjectAsset } from "../domain/storyboard";

export const mockProjectAssets: ProjectAsset[] = [
  { id: "asset-character-linlan", name: "林澜 · 雨夜造型", mediaType: "image", category: "character", projectRelativePath: "assets/characters/linlan-rain.webp", previewUrl: "assets/storyboard/warehouse.webp", tags: ["林澜", "雨夜", "主角"], checksum: "mock-sha256-linlan" },
  { id: "asset-warehouse-exterior", name: "旧港口仓库外景", mediaType: "image", category: "scene", projectRelativePath: "assets/scenes/warehouse-exterior.webp", previewUrl: "assets/storyboard/warehouse.webp", tags: ["仓库", "港口", "夜景"], checksum: "mock-sha256-warehouse" },
  { id: "asset-projector", name: "旧式放映机", mediaType: "image", category: "prop", projectRelativePath: "assets/props/projector.webp", previewUrl: "assets/storyboard/projector.webp", tags: ["放映机", "旧物", "道具"], checksum: "mock-sha256-projector" },
  { id: "asset-umbrella-motion", name: "撑伞收伞动作参考", mediaType: "video", category: "reference", projectRelativePath: "assets/references/umbrella-motion.mp4", previewUrl: "assets/storyboard/rain.webp", tags: ["动作", "雨伞", "参考"], durationSeconds: 6, checksum: "mock-sha256-umbrella" },
  { id: "asset-rain-audio", name: "雨声与远处汽笛", mediaType: "audio", category: "reference", projectRelativePath: "assets/audio/harbor-rain.wav", tags: ["雨声", "汽笛", "环境声"], durationSeconds: 24, checksum: "mock-sha256-rain" },
  { id: "asset-corridor-reference", name: "空走廊运镜参考", mediaType: "video", category: "scene", projectRelativePath: "assets/references/corridor-dolly.mp4", previewUrl: "assets/storyboard/corridor.webp", tags: ["走廊", "运镜", "悬疑"], durationSeconds: 8, checksum: "mock-sha256-corridor" },
  { id: "asset-film-grain", name: "旧胶片颗粒参考", mediaType: "image", category: "reference", projectRelativePath: "assets/references/film-grain.webp", previewUrl: "assets/storyboard/projector.webp", tags: ["胶片", "质感", "年代感"], checksum: "mock-sha256-grain" },
  { id: "asset-door-creak", name: "仓库木门吱呀声", mediaType: "audio", category: "prop", projectRelativePath: "assets/audio/door-creak.wav", tags: ["木门", "拟音", "仓库"], durationSeconds: 4, checksum: "mock-sha256-door" },
];
