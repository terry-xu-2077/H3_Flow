from __future__ import annotations

from collections.abc import Callable

from shotmill.domain.entities import Project, new_id, utcnow
from shotmill.domain.repositories import UnitOfWork
from shotmill.errors import NotFoundError, ShotMillError
from shotmill.media.storage import MediaStorage


class ProjectService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork], storage: MediaStorage) -> None:
        self.uow_factory = uow_factory
        self.storage = storage

    def create(
        self,
        title: str,
        description: str = "",
        use_description_for_ai_prompt: bool = False,
    ) -> Project:
        clean_title = title.strip()
        if not clean_title:
            raise ShotMillError("PROJECT_TITLE_REQUIRED", "Project title is required", 422)
        now = utcnow()
        project = Project(
            id=new_id("project"),
            title=clean_title,
            description=description.strip(),
            use_description_for_ai_prompt=use_description_for_ai_prompt,
            created_at=now,
            updated_at=now,
        )
        with self.uow_factory() as uow:
            uow.projects.add(project)
        self.storage.ensure_project_layout(project.id)
        return project

    def update(
        self,
        project_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        use_description_for_ai_prompt: bool | None = None,
    ) -> Project:
        with self.uow_factory() as uow:
            project = uow.projects.get(project_id)
            if project is None:
                raise NotFoundError("PROJECT_NOT_FOUND", "Project not found")
            if title is not None:
                clean_title = title.strip()
                if not clean_title:
                    raise ShotMillError("PROJECT_TITLE_REQUIRED", "Project title is required", 422)
                project.title = clean_title
            if description is not None:
                project.description = description.strip()
            if use_description_for_ai_prompt is not None:
                project.use_description_for_ai_prompt = use_description_for_ai_prompt
            project.updated_at = utcnow()
            uow.projects.update(project)
            return project
