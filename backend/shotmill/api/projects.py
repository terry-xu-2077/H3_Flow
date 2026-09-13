from fastapi import APIRouter

from shotmill.api.dependencies import ContainerDep
from shotmill.api.schemas import ProjectCreateRequest, ProjectPatchRequest
from shotmill.frontend_adapter.models import (
    ProjectListResponse,
    ProjectSettingsView,
    ProjectSummary,
    ProjectWorkspaceView,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
def list_projects(container: ContainerDep) -> ProjectListResponse:
    return ProjectListResponse(items=container.workspace_query.list_projects())


@router.post("", response_model=ProjectSummary, status_code=201)
def create_project(
    payload: ProjectCreateRequest,
    container: ContainerDep,
) -> ProjectSummary:
    project = container.project_service.create(
        payload.title,
        payload.description,
        payload.use_description_for_ai_prompt,
    )
    return container.workspace_query.project_summary(project.id)


@router.patch("/{project_id}", response_model=ProjectSummary)
def update_project(
    project_id: str,
    payload: ProjectPatchRequest,
    container: ContainerDep,
) -> ProjectSummary:
    container.project_service.update(
        project_id,
        title=payload.title,
        description=payload.description,
        use_description_for_ai_prompt=payload.use_description_for_ai_prompt,
    )
    return container.workspace_query.project_summary(project_id)


@router.get("/{project_id}/settings", response_model=ProjectSettingsView)
def get_project_settings(
    project_id: str,
    container: ContainerDep,
) -> ProjectSettingsView:
    return container.workspace_query.project_settings(project_id)


@router.get("/{project_id}/workspace", response_model=ProjectWorkspaceView)
def get_project_workspace(
    project_id: str,
    container: ContainerDep,
) -> ProjectWorkspaceView:
    return container.workspace_query.workspace(project_id)
