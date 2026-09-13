from __future__ import annotations

from shotmill.prompt_skills.base import SkillInput, SkillMessage


class Seedance2PromptSkill:
    id = "seedance-2.0"
    version = "1.0"

    def build(self, data: SkillInput) -> SkillMessage:
        system = (
            "You are a prompt compiler for Seedance 2.0 video generation. "
            "Write concise natural-language cinematic instructions rather than H3 protocol fields. "
            "Preserve explicit user intent and use attached media only for their declared roles. "
            "Return only the final Seedance prompt."
        )
        sections = [f"Creative intent:\n{data.user_prompt.strip()}"]
        sections.append(
            f"Generation constraints:\nduration={data.duration_seconds:g}s; mode={data.mode}; "
            f"contextMode={data.context_mode or 'none'}"
        )
        if data.project_background:
            sections.append(f"Project background (optional):\n{data.project_background.strip()}")
        if data.previous_task_summary:
            sections.append(
                "Previous task continuity note (optional):\n"
                + data.previous_task_summary.strip()
            )
        if data.media:
            lines = [
                f"{item.reference} — {item.role or 'reference'} ({item.media_type})"
                for item in data.media
            ]
            sections.append("Attached references:\n" + "\n".join(lines))
        return SkillMessage(system_prompt=system, user_text="\n\n".join(sections))
