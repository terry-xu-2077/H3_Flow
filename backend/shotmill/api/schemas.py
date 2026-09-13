from __future__ import annotations

from typing import Literal

from pydantic import Field

from shotmill.frontend_adapter.models import (
    ApiModel,
    EditorPreference,
    GenerationSettings,
    TaskAssetRef,
)


class ProjectCreateRequest(ApiModel):
    title: str
    description: str = ""
    use_description_for_ai_prompt: bool = False


class ProjectPatchRequest(ApiModel):
    title: str | None = None
    description: str | None = None
    use_description_for_ai_prompt: bool | None = None


class AssetPatchRequest(ApiModel):
    name: str | None = None
    category: str | None = None
    tags: list[str] | None = None


class TaskSaveRequest(ApiModel):
    title: str
    summary: str = ""
    script_source: str = ""
    user_intent: str = ""
    user_prompt: str = ""
    ai_enhanced_prompt: str = ""
    prompt_source: Literal["user", "ai"] = "user"
    duration_seconds: float = Field(default=6.0, gt=0)
    generation: GenerationSettings = GenerationSettings()
    asset_bindings: list[TaskAssetRef] = []
    editor_preference: EditorPreference = EditorPreference()
    revision: int | None = None


class TaskReorderRequest(ApiModel):
    task_ids: list[str]


class PromptEnhancementMediaRequest(ApiModel):
    asset_id: str
    reference: str
    role: str | None = None


class PromptEnhancementContextRequest(ApiModel):
    include_project_background: bool = False
    include_previous_task_summary: bool = False


class PromptEnhancementGenerationRequest(ApiModel):
    duration_seconds: float = Field(gt=0)
    mode: str
    context_mode: str | None = None


class PromptEnhancementRequest(ApiModel):
    target: str
    user_prompt: str
    media: list[PromptEnhancementMediaRequest] = []
    context: PromptEnhancementContextRequest = PromptEnhancementContextRequest()
    generation: PromptEnhancementGenerationRequest


class PromptEnhancementPreviewRequest(PromptEnhancementRequest):
    previous_task_id: str | None = None


class GenerationSubmitRequest(ApiModel):
    seed: int | None = None


class PrimaryResultRequest(ApiModel):
    result_id: str
