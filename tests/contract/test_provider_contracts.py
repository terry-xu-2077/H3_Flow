from pathlib import Path

from shotmill.domain.providers import ResolvedMedia, VideoGenerationRequest
from shotmill.prompt_skills.base import SkillInput
from shotmill.prompt_skills.minimax_h3 import MiniMaxH3PromptSkill
from shotmill.prompt_skills.seedance_2 import Seedance2PromptSkill
from shotmill.providers.video_generation.comfyui import _replace_placeholders


def test_prompt_skills_remain_target_specific() -> None:
    data = SkillInput(
        user_prompt="角色奔跑",
        project_background=None,
        previous_task_summary=None,
        duration_seconds=6,
        mode="全能参考",
        context_mode="不承接",
        media=(),
    )
    h3 = MiniMaxH3PromptSkill().build(data)
    seedance = Seedance2PromptSkill().build(data)
    assert "H3" in h3.system_prompt
    assert "Seedance" in seedance.system_prompt
    assert h3.system_prompt != seedance.system_prompt


def test_comfyui_template_replacement_preserves_typed_values(tmp_path: Path) -> None:
    media_path = tmp_path / "frame.png"
    media_path.write_bytes(b"image")
    request = VideoGenerationRequest(
        job_id="job-1",
        project_id="project-1",
        task_id="task-1",
        final_prompt="cinematic prompt",
        assets=(
            ResolvedMedia(
                asset_id="asset-1",
                reference="<Picture 1>",
                role="first frame",
                media_type="image",
                path=media_path,
                mime_type="image/png",
            ),
        ),
        params={"steps": 12},
        seed=123,
    )
    rendered = _replace_placeholders(
        {
            "prompt": "{{final_prompt}}",
            "seed": "{{seed}}",
            "steps": "{{param:steps}}",
            "asset": "{{asset:<Picture 1>}}",
        },
        request,
    )
    assert rendered["prompt"] == "cinematic prompt"
    assert rendered["seed"] == 123
    assert rendered["steps"] == 12
    assert rendered["asset"] == str(media_path)
