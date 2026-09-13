from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part[:1].upper() + part[1:] for part in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


ProjectStatus = Literal["idle", "running", "completed", "failed"]
TaskStatus = Literal["idle", "running", "completed", "failed"]
RuntimeState = Literal["idle", "queued", "running", "failed"]


class ProjectSummary(ApiModel):
    id: str
    title: str
    status: ProjectStatus
    cover_url: str | None = None
    task_count: int
    asset_count: int
    updated_at: datetime


class ProjectSettingsView(ApiModel):
    id: str
    title: str
    description: str
    use_description_for_ai_prompt: bool


class PrimaryResultView(ApiModel):
    id: str
    preview_url: str | None
    video_url: str


class GenerationSummary(ApiModel):
    resolution: str
    quality: str


class TaskSummary(ApiModel):
    id: str
    display_number: int
    title: str
    prompt_excerpt: str
    preview_url: str | None
    status: TaskStatus
    progress: float | None
    asset_count: int
    result_count: int
    duration_seconds: float
    generation_summary: GenerationSummary
    primary_result: PrimaryResultView | None = None


class ProjectRuntimeSummary(ApiModel):
    active_task_id: str | None = None
    active_task_title: str | None = None
    state: RuntimeState = "idle"
    progress: float | None = None


class WorkspaceProject(ApiModel):
    id: str
    title: str


class ProjectWorkspaceView(ApiModel):
    project: WorkspaceProject
    tasks: list[TaskSummary]
    runtime: ProjectRuntimeSummary


class TaskAssetRef(ApiModel):
    asset_id: str
    reference: str
    role: str | None = None


class GenerationSettings(ApiModel):
    resolution: str = "1080p"
    quality: str = "标准"
    mode: str = "全能参考"
    context_mode: str = "不承接"
    context_start_seconds: float | None = None
    context_end_seconds: float | None = None
    context_duration_seconds: float | None = None


class EditorPreference(ApiModel):
    user_view_mode: Literal["visual", "text"] = "visual"
    ai_view_mode: Literal["visual", "text"] = "visual"


class TaskEditorView(ApiModel):
    id: str
    display_number: int
    title: str
    summary: str
    script_source: str
    user_intent: str
    prompt_source: Literal["user", "ai"]
    user_prompt: str
    ai_enhanced_prompt: str
    final_prompt: str
    editor_preference: EditorPreference
    duration_seconds: float
    previous_task_duration_seconds: float | None
    generation: GenerationSettings
    asset_bindings: list[TaskAssetRef]
    revision: int


class AssetReferenceItem(ApiModel):
    id: str
    name: str
    media_type: Literal["image", "video", "audio", "other"]
    category: str
    preview_url: str | None


class ProjectAssetView(ApiModel):
    id: str
    name: str
    original_filename: str = Field(alias="originalFileName")
    project_relative_path: str
    media_type: str
    category: str
    tags: list[str]
    width: int | None = None
    height: int | None = None
    duration: float | None = None
    thumbnail_url: str | None = None


class AiPromptRevisionView(ApiModel):
    id: str
    task_id: str
    created_at: datetime
    prompt: str
    source_user_prompt: str
    asset_ids: list[str]
    include_project_background: bool
    include_previous_task_summary: bool
    previous_task_summary_snapshot: str | None
    target_skill: str
    skill_version: str
    provider_id: str | None
    model_id: str | None


class PromptEnhancementPreviewView(ApiModel):
    preview_id: str
    created_at: datetime
    prompt: str
    target_skill: str
    skill_version: str
    provider_id: str | None
    model_id: str | None


class ResultView(ApiModel):
    id: str
    job_id: str
    video_url: str
    preview_url: str | None
    metadata: dict[str, Any]
    review_state: str
    created_at: datetime


class JobView(ApiModel):
    id: str
    task_id: str
    status: str
    provider_job_id: str | None
    submitted_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    error_code: str | None
    error_message: str | None


class ProjectListResponse(ApiModel):
    items: list[ProjectSummary]


class AssetListResponse(ApiModel):
    items: list[ProjectAssetView | AssetReferenceItem]


class PromptRevisionListResponse(ApiModel):
    items: list[AiPromptRevisionView]


class ResultListResponse(ApiModel):
    items: list[ResultView]
