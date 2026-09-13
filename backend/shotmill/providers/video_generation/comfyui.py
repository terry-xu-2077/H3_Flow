from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from shotmill.domain.providers import (
    GeneratedOutput,
    VideoGenerationCapability,
    VideoGenerationRequest,
    VideoGenerationResponse,
)
from shotmill.errors import ProviderUnavailableError, ShotMillError


def _replace_placeholders(value: Any, request: VideoGenerationRequest) -> Any:
    if isinstance(value, dict):
        return {key: _replace_placeholders(item, request) for key, item in value.items()}
    if isinstance(value, list):
        return [_replace_placeholders(item, request) for item in value]
    if not isinstance(value, str):
        return value

    assets = {item.reference: item for item in request.assets}
    if value == "{{final_prompt}}":
        return request.final_prompt
    if value == "{{seed}}":
        return request.seed if request.seed is not None else 0
    if value.startswith("{{asset:") and value.endswith("}}"):
        reference = value[len("{{asset:") : -2]
        media = assets.get(reference)
        if media is None:
            raise ShotMillError(
                "GENERATION_ASSET_REFERENCE_NOT_FOUND",
                f"Workflow requires missing asset reference: {reference}",
                422,
            )
        return str(media.path)
    if value.startswith("{{param:") and value.endswith("}}"):
        key = value[len("{{param:") : -2]
        return request.params.get(key)

    replaced = value.replace("{{final_prompt}}", request.final_prompt)
    if request.seed is not None:
        replaced = replaced.replace("{{seed}}", str(request.seed))
    for reference, media in assets.items():
        replaced = replaced.replace(f"{{{{asset:{reference}}}}}", str(media.path))
    for key, item in request.params.items():
        replaced = replaced.replace(f"{{{{param:{key}}}}}", str(item))
    return replaced


class ComfyUIVideoGenerationProvider:
    id = "comfyui"
    capability = VideoGenerationCapability(
        text=True,
        image=True,
        first_frame=True,
        last_frame=True,
        reference_images=True,
        reference_videos=True,
        max_duration_seconds=None,
        continuation=True,
        progress_reporting=True,
        batch=False,
        max_concurrency=1,
    )

    def __init__(
        self,
        base_url: str | None,
        workflow_template: Path | None,
        *,
        poll_interval_seconds: float = 1.0,
        timeout_seconds: float = 600.0,
    ) -> None:
        self.base_url = base_url.rstrip("/") if base_url else None
        self.workflow_template = workflow_template
        self.poll_interval_seconds = max(0.1, poll_interval_seconds)
        self.timeout_seconds = timeout_seconds

    def _load_workflow(self, request: VideoGenerationRequest) -> dict[str, Any]:
        if self.workflow_template is None:
            raise ProviderUnavailableError(
                "ComfyUI workflow template is not configured. Set "
                "SHOTMILL_COMFYUI_WORKFLOW_TEMPLATE."
            )
        if not self.workflow_template.exists():
            raise ProviderUnavailableError(
                f"ComfyUI workflow template not found: {self.workflow_template}"
            )
        raw = json.loads(self.workflow_template.read_text(encoding="utf-8"))
        workflow = raw.get("prompt", raw) if isinstance(raw, dict) else raw
        if not isinstance(workflow, dict):
            raise ShotMillError(
                "COMFYUI_WORKFLOW_INVALID",
                "ComfyUI workflow template must contain an API prompt object",
                500,
            )
        return _replace_placeholders(workflow, request)

    async def generate(self, request: VideoGenerationRequest) -> VideoGenerationResponse:
        if not self.base_url:
            raise ProviderUnavailableError(
                "ComfyUI endpoint is not configured. Set SHOTMILL_COMFYUI_BASE_URL "
                "or SHOTMILL_COMFYUI_ENDPOINT."
            )
        workflow = self._load_workflow(request)
        client_id = f"shotmill-{uuid4().hex}"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                submit = await client.post(
                    f"{self.base_url}/prompt",
                    json={"prompt": workflow, "client_id": client_id},
                )
                submit.raise_for_status()
                prompt_id = submit.json().get("prompt_id")
                if not prompt_id:
                    raise ShotMillError(
                        "COMFYUI_INVALID_RESPONSE",
                        "ComfyUI did not return prompt_id",
                        502,
                    )

                started = time.monotonic()
                history_entry: dict[str, Any] | None = None
                while time.monotonic() - started < self.timeout_seconds:
                    history_response = await client.get(f"{self.base_url}/history/{prompt_id}")
                    history_response.raise_for_status()
                    history = history_response.json()
                    entry = history.get(prompt_id) if isinstance(history, dict) else None
                    if isinstance(entry, dict) and entry.get("outputs") is not None:
                        history_entry = entry
                        break
                    await asyncio.sleep(self.poll_interval_seconds)
                if history_entry is None:
                    raise ShotMillError(
                        "COMFYUI_TIMEOUT",
                        "Timed out waiting for ComfyUI generation",
                        504,
                    )

                outputs: list[GeneratedOutput] = []
                for node_output in history_entry.get("outputs", {}).values():
                    if not isinstance(node_output, dict):
                        continue
                    for key in ("videos", "gifs", "images", "audio"):
                        for item in node_output.get(key, []) or []:
                            if not isinstance(item, dict) or not item.get("filename"):
                                continue
                            params = {
                                "filename": item["filename"],
                                "subfolder": item.get("subfolder", ""),
                                "type": item.get("type", "output"),
                            }
                            media_response = await client.get(
                                f"{self.base_url}/view", params=params
                            )
                            media_response.raise_for_status()
                            outputs.append(
                                GeneratedOutput(
                                    filename=str(item["filename"]),
                                    content=media_response.content,
                                    content_type=media_response.headers.get("content-type"),
                                    metadata={"nodeOutputType": key, **params},
                                )
                            )
                if not outputs:
                    raise ShotMillError(
                        "COMFYUI_NO_OUTPUT",
                        "ComfyUI completed without downloadable outputs",
                        502,
                    )
                return VideoGenerationResponse(
                    provider_job_id=str(prompt_id),
                    outputs=tuple(outputs),
                )
        except ShotMillError:
            raise
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(f"ComfyUI request failed: {exc}") from exc
