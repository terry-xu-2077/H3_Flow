from __future__ import annotations

from shotmill.prompt_skills.base import SkillInput, SkillMessage


class MiniMaxH3PromptSkill:
    id = "minimax-h3"
    version = "1.0"

    def build(self, data: SkillInput) -> SkillMessage:
        system = (
            "You are a prompt compiler for MiniMax H3 video generation. "
            "Preserve the user's explicit subject, action, dialogue, visible text "
            "and hard constraints. "
            "Return only a clean H3-compatible prompt. Use the media reference labels "
            "exactly as supplied. "
            "Do not invent observations about media you were not given."
        )
        sections = [f"User intent:\n{data.user_prompt.strip()}"]
        sections.append(
            f"Generation constraints:\nduration={data.duration_seconds:g}s; mode={data.mode}; "
            f"contextMode={data.context_mode or 'none'}"
        )
        if data.project_background:
            sections.append(
                "Optional project background (facts only):\n"
                + data.project_background.strip()
            )
        if data.previous_task_summary:
            sections.append(
                "Optional previous task summary:\n" + data.previous_task_summary.strip()
            )
        if data.media:
            lines = [
                f"{item.reference}: role={item.role or 'reference'}; mediaType={item.media_type}"
                for item in data.media
            ]
            sections.append("Attached media references:\n" + "\n".join(lines))
        return SkillMessage(system_prompt=system, user_text="\n\n".join(sections))
