from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status

from shotmill.api.dependencies import ContainerDep
from shotmill.api.schemas import AssetPatchRequest
from shotmill.frontend_adapter.mapper import map_asset
from shotmill.frontend_adapter.models import AssetListResponse, ProjectAssetView

router = APIRouter(prefix="/projects/{project_id}/assets", tags=["assets"])


def _parse_tags(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = [part.strip() for part in value.split(",")]
    if isinstance(parsed, list):
        return [str(item).strip() for item in parsed if str(item).strip()]
    return []


@router.get("", response_model=AssetListResponse)
def list_assets(
    project_id: str,
    container: ContainerDep,
    purpose: Annotated[str | None, Query()] = None,
) -> AssetListResponse:
    return AssetListResponse(items=container.workspace_query.list_assets(project_id, purpose))


@router.post("", response_model=ProjectAssetView, status_code=201)
async def import_asset(
    project_id: str,
    file: Annotated[UploadFile, File()],
    container: ContainerDep,
    name: Annotated[str | None, Form()] = None,
    category: Annotated[str, Form()] = "reference",
    tags: Annotated[str | None, Form()] = None,
) -> ProjectAssetView:
    content = await file.read()
    asset = container.asset_service.import_bytes(
        project_id,
        file.filename or "asset.bin",
        content,
        content_type=file.content_type,
        name=name,
        category=category,
        tags=_parse_tags(tags),
    )
    return map_asset(asset, container.storage)


@router.patch("/{asset_id}", response_model=ProjectAssetView)
def update_asset(
    project_id: str,
    asset_id: str,
    payload: AssetPatchRequest,
    container: ContainerDep,
) -> ProjectAssetView:
    asset = container.asset_service.update(
        project_id,
        asset_id,
        name=payload.name,
        category=payload.category,
        tags=payload.tags,
    )
    return map_asset(asset, container.storage)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    project_id: str,
    asset_id: str,
    container: ContainerDep,
) -> Response:
    container.asset_service.delete(project_id, asset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
