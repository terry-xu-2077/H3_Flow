from fastapi import APIRouter, Depends, status

from shotmill.api.dependencies import get_container
from shotmill.api.schemas import TaskReorderRequest, TaskSaveRequest
from shotmill.application.container import ApplicationContainer
from shotmill.application.task_service import SaveTaskAsset, SaveTaskData
from shotmill.frontend_adapter.models import TaskEditorView, TaskSummary

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


def _command(payload: TaskSaveRequest) -> SaveTaskData:
    return SaveTaskData(
        title=payload.title,
        summary=payload.summary,
        script_source=payload.script_source,
        user_intent=payload.user_intent,
        user_prompt=payload.user_prompt,
        ai_prompt=payload.ai_enhanced_prompt,
        prompt_source=payload.prompt_source,
        duration_seconds=payload.duration_seconds,
        generation=payload.generation.model_dump(by_alias=True, exclude_none=False),
        asset_bindings=tuple(
            SaveTaskAsset(asset_id=item.asset_id, reference=item.reference, role=item.role)
            for item in payload.asset_bindings
        ),
        user_view_mode=payload.editor_preference.user_view_mode,
        ai_view_mode=payload.editor_preference.ai_view_mode,
        revision=payload.revision,
    )


@router.get("/{task_id}/editor", response_model=TaskEditorView)
def get_task_editor(
    project_id: str,
    task_id: str,
    container: ApplicationContainer = Depends(get_container),
) -> TaskEditorView:
    return container.workspace_query.task_editor(project_id, task_id)


@router.post("", response_model=TaskSummary, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: str,
    payload: TaskSaveRequest,
    container: ApplicationContainer = Depends(get_container),
) -> TaskSummary:
    task = container.task_service.create(project_id, _command(payload))
    return container.workspace_query.task_summary(project_id, task.id)


@router.patch("/{task_id}", response_model=TaskSummary)
def update_task(
    project_id: str,
    task_id: str,
    payload: TaskSaveRequest,
    container: ApplicationContainer = Depends(get_container),
) -> TaskSummary:
    container.task_service.update(project_id, task_id, _command(payload))
    return container.workspace_query.task_summary(project_id, task_id)


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_tasks(
    project_id: str,
    payload: TaskReorderRequest,
    container: ApplicationContainer = Depends(get_container),
) -> None:
    container.task_service.reorder(project_id, payload.task_ids)
