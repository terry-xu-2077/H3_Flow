from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from shotmill.application.asset_service import AssetService
from shotmill.application.event_bus import ProjectEventBus
from shotmill.application.generation_service import GenerationQueue, GenerationService
from shotmill.application.project_service import ProjectService
from shotmill.application.prompt_enhancement_service import PromptEnhancementService
from shotmill.application.result_service import ResultService
from shotmill.application.task_service import TaskService
from shotmill.application.workspace_query import WorkspaceQuery
from shotmill.config import Settings
from shotmill.domain.providers import PromptAIProvider, VideoGenerationProvider
from shotmill.media.resolver import MediaResolver
from shotmill.media.storage import MediaStorage
from shotmill.persistence.database import create_database_engine, create_session_factory
from shotmill.persistence.repositories import SqlAlchemyUnitOfWork
from shotmill.prompt_skills.registry import PromptSkillRegistry
from shotmill.providers.prompt_ai.openai_compatible import (
    OpenAICompatiblePromptAIProvider,
    UnavailablePromptAIProvider,
)
from shotmill.providers.video_generation.comfyui import ComfyUIVideoGenerationProvider


@dataclass(slots=True)
class ApplicationContainer:
    settings: Settings
    engine: Engine
    session_factory: sessionmaker[Session]
    storage: MediaStorage
    events: ProjectEventBus
    project_service: ProjectService
    asset_service: AssetService
    task_service: TaskService
    workspace_query: WorkspaceQuery
    prompt_enhancement_service: PromptEnhancementService
    generation_service: GenerationService
    generation_queue: GenerationQueue
    result_service: ResultService


def build_container(
    settings: Settings,
    *,
    prompt_provider: PromptAIProvider | None = None,
    video_provider: VideoGenerationProvider | None = None,
) -> ApplicationContainer:
    engine = create_database_engine(settings.database_url)
    session_factory = create_session_factory(engine)

    def uow_factory() -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(session_factory)

    storage = MediaStorage(settings.projects_root)
    resolver = MediaResolver(storage)
    events = ProjectEventBus()
    if prompt_provider is None:
        if settings.prompt_ai_base_url and settings.prompt_ai_model:
            prompt_provider = OpenAICompatiblePromptAIProvider(
                settings.prompt_ai_base_url,
                settings.prompt_ai_model,
                settings.prompt_ai_api_key,
                supports_native_video=settings.prompt_ai_supports_native_video,
            )
        else:
            prompt_provider = UnavailablePromptAIProvider()
    if video_provider is None:
        video_provider = ComfyUIVideoGenerationProvider(
            settings.comfyui_base_url,
            settings.comfyui_workflow_template,
            poll_interval_seconds=settings.provider_poll_interval_seconds,
            timeout_seconds=settings.provider_timeout_seconds,
        )

    project_service = ProjectService(uow_factory, storage)
    asset_service = AssetService(uow_factory, storage)
    task_service = TaskService(uow_factory)
    workspace_query = WorkspaceQuery(uow_factory, storage)
    prompt_enhancement_service = PromptEnhancementService(
        uow_factory,
        prompt_provider,
        PromptSkillRegistry(),
        resolver,
    )
    generation_service = GenerationService(uow_factory, video_provider, storage, events)
    generation_queue = GenerationQueue(generation_service, settings.generation_workers)
    generation_service.attach_queue(generation_queue)
    result_service = ResultService(uow_factory)
    return ApplicationContainer(
        settings=settings,
        engine=engine,
        session_factory=session_factory,
        storage=storage,
        events=events,
        project_service=project_service,
        asset_service=asset_service,
        task_service=task_service,
        workspace_query=workspace_query,
        prompt_enhancement_service=prompt_enhancement_service,
        generation_service=generation_service,
        generation_queue=generation_queue,
        result_service=result_service,
    )
