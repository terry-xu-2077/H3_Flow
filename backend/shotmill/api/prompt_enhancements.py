from fastapi import APIRouter, Depends

from shotmill.api.dependencies import get_container
from shotmill.api.schemas import PromptEnhancementRequest
from shotmill.application.container import ApplicationContainer
from shotmill.application.prompt_enhancement_service import (
    EnhancementContextOptions,
    EnhancementMedia,
)
from shotmill.frontend_adapter.mapper import map_revision
from shotmill.frontend_adapter.models import AiPromptRevisionView, PromptRevisionListResponse

router = APIRouter(prefix="/projects/{project_id}/tasks/{task_id}", tags=["prompt-enhancement"])


@router.post("/prompt-enhancements", response_model=AiPromptRevisionView, status_code=201)
async def enhance_prompt(
    project_id: str,
    task_id: str,
    payload: PromptEnhancementRequest,
    container: ApplicationContainer = Depends(get_container),
) -> AiPromptRevisionView:
    revision = await container.prompt_enhancement_service.enhance(
        project_id,
        task_id,
        target=payload.target,
        user_prompt=payload.user_prompt,
        media=tuple(
            EnhancementMedia(asset_id=item.asset_id, reference=item.reference, role=item.role)
            for item in payload.media
        ),
        context=EnhancementContextOptions(
            include_project_background=payload.context.include_project_background,
            include_previous_task_summary=payload.context.include_previous_task_summary,
        ),
        duration_seconds=payload.generation.duration_seconds,
        mode=payload.generation.mode,
        context_mode=payload.generation.context_mode,
    )
    return map_revision(revision)


@router.get("/prompt-revisions", response_model=PromptRevisionListResponse)
def list_prompt_revisions(
    project_id: str,
    task_id: str,
    container: ApplicationContainer = Depends(get_container),
) -> PromptRevisionListResponse:
    revisions = container.prompt_enhancement_service.list_revisions(project_id, task_id)
    return PromptRevisionListResponse(items=[map_revision(item) for item in revisions])


@router.post("/prompt-revisions/{revision_id}/select", response_model=AiPromptRevisionView)
def select_prompt_revision(
    project_id: str,
    task_id: str,
    revision_id: str,
    container: ApplicationContainer = Depends(get_container),
) -> AiPromptRevisionView:
    revision = container.prompt_enhancement_service.select_revision(
        project_id, task_id, revision_id
    )
    return map_revision(revision)
