from __future__ import annotations

from shotmill.app import create_app
from shotmill.domain.providers import (
    PromptAIProviderCapability,
    PromptAIRequest,
    PromptAIResponse,
)


class E2EPromptProvider:
    id = "e2e-prompt"
    capability = PromptAIProviderCapability(
        image_input=True,
        native_video_input=True,
        audio_understanding=False,
    )

    async def enhance(self, request: PromptAIRequest) -> PromptAIResponse:
        user_prompt = next(
            (
                line.removeprefix("用户描述：").strip()
                for line in request.user_text.splitlines()
                if line.startswith("用户描述：")
            ),
            request.user_text.strip(),
        )
        return PromptAIResponse(
            text=f"AI增强预览：{user_prompt}",
            provider_id=self.id,
            model_id="deterministic-e2e",
        )


app = create_app(prompt_provider=E2EPromptProvider())
