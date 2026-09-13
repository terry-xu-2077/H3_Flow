from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class PromptAIProviderCapability:
    image_input: bool = True
    native_video_input: bool = False
    sampled_video_frames: bool = False
    audio_understanding: bool = False
    system_prompt: bool = True
    structured_output: bool = False


@dataclass(frozen=True, slots=True)
class ResolvedMedia:
    asset_id: str
    reference: str
    role: str | None
    media_type: str
    path: Path
    mime_type: str | None = None


@dataclass(frozen=True, slots=True)
class PromptAIRequest:
    system_prompt: str
    user_text: str
    media: tuple[ResolvedMedia, ...] = ()


@dataclass(frozen=True, slots=True)
class PromptAIResponse:
    text: str
    provider_id: str
    model_id: str | None = None


class PromptAIProvider(Protocol):
    id: str
    capability: PromptAIProviderCapability

    async def enhance(self, request: PromptAIRequest) -> PromptAIResponse: ...


@dataclass(frozen=True, slots=True)
class VideoGenerationCapability:
    text: bool = True
    image: bool = True
    first_frame: bool = True
    last_frame: bool = True
    reference_images: bool = True
    reference_videos: bool = True
    max_duration_seconds: float | None = None
    continuation: bool = True
    progress_reporting: bool = True
    batch: bool = False
    max_concurrency: int = 1


@dataclass(frozen=True, slots=True)
class VideoGenerationRequest:
    job_id: str
    project_id: str
    task_id: str
    final_prompt: str
    assets: tuple[ResolvedMedia, ...]
    params: dict[str, Any]
    seed: int | None = None


@dataclass(frozen=True, slots=True)
class GeneratedOutput:
    filename: str
    content: bytes
    content_type: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class VideoGenerationResponse:
    provider_job_id: str
    outputs: tuple[GeneratedOutput, ...]


class VideoGenerationProvider(Protocol):
    id: str
    capability: VideoGenerationCapability

    async def generate(self, request: VideoGenerationRequest) -> VideoGenerationResponse: ...
