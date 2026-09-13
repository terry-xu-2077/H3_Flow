from __future__ import annotations

from shotmill.errors import ShotMillError
from shotmill.prompt_skills.base import PromptSkill
from shotmill.prompt_skills.minimax_h3 import MiniMaxH3PromptSkill
from shotmill.prompt_skills.seedance_2 import Seedance2PromptSkill


class PromptSkillRegistry:
    def __init__(self, skills: list[PromptSkill] | None = None) -> None:
        values = skills or [MiniMaxH3PromptSkill(), Seedance2PromptSkill()]
        self._skills = {skill.id: skill for skill in values}

    def get(self, skill_id: str) -> PromptSkill:
        skill = self._skills.get(skill_id)
        if skill is None:
            raise ShotMillError("PROMPT_SKILL_NOT_FOUND", f"Unknown prompt skill: {skill_id}", 422)
        return skill
