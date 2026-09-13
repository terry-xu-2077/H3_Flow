from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from shotmill.domain.providers import ResolvedMedia


@dataclass(frozen=True, slots=True)
class SkillInput:
    user_prompt: str
    project_background: str | None
    previous_task_summary: str | None
    duration_seconds: float
    mode: str
    context_mode: str | None
    media: tuple[ResolvedMedia, ...]


@dataclass(frozen=True, slots=True)
class SkillMessage:
    system_prompt: str
    user_text: str


class PromptSkill(Protocol):
    id: str
    version: str

    def build(self, data: SkillInput) -> SkillMessage: ...
