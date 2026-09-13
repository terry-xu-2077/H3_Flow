import type { GenerationProfileCapability } from "../domain/storyboard";

export type MockGenerationProfile = {
  id: string;
  label: string;
  detail: string;
  capability: GenerationProfileCapability;
};

export const mockGenerationProfiles: MockGenerationProfile[] = [
  {
    id: "profile-h3-multi-shot",
    label: "H3 · Multi-shot",
    detail: "多镜头提示词 · 最长 15s",
    capability: { multiShotPrompt: true, maxDurationSeconds: 15, continuation: true },
  },
  {
    id: "profile-h3-fast",
    label: "H3 · Fast Preview",
    detail: "单镜头预览 · 最长 6s",
    capability: { multiShotPrompt: false, maxDurationSeconds: 6, continuation: false },
  },
  {
    id: "profile-fake-video",
    label: "Fake Video Provider",
    detail: "可预测测试输出",
    capability: { multiShotPrompt: true, maxDurationSeconds: 30, continuation: true },
  },
];

export function getMockGenerationProfile(id: string) {
  return mockGenerationProfiles.find((profile) => profile.id === id) ?? mockGenerationProfiles[0];
}
