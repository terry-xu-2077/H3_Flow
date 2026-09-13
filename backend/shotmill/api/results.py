from fastapi import APIRouter

from shotmill.api.dependencies import ContainerDep
from shotmill.api.schemas import PrimaryResultRequest
from shotmill.frontend_adapter.mapper import map_result
from shotmill.frontend_adapter.models import ResultListResponse, ResultView

router = APIRouter(prefix="/projects/{project_id}/tasks/{task_id}", tags=["results"])


@router.get("/results", response_model=ResultListResponse)
def list_results(
    project_id: str,
    task_id: str,
    container: ContainerDep,
) -> ResultListResponse:
    return ResultListResponse(
        items=[map_result(item) for item in container.result_service.list(project_id, task_id)]
    )


@router.patch("/primary-result", response_model=ResultView)
def select_primary_result(
    project_id: str,
    task_id: str,
    payload: PrimaryResultRequest,
    container: ContainerDep,
) -> ResultView:
    return map_result(
        container.result_service.select_primary(project_id, task_id, payload.result_id)
    )
