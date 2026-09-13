from __future__ import annotations

import asyncio
import mimetypes
from collections.abc import Callable
from dataclasses import asdict

from shotmill.application.event_bus import ProjectEventBus
from shotmill.domain.entities import Job, Result, new_id, utcnow
from shotmill.domain.enums import JobStatus, TaskState
from shotmill.domain.providers import ResolvedMedia, VideoGenerationProvider, VideoGenerationRequest
from shotmill.domain.repositories import UnitOfWork
from shotmill.errors import ConflictError, NotFoundError, ShotMillError
from shotmill.media.storage import MediaStorage


class GenerationService:
    def __init__(
        self,
        uow_factory: Callable[[], UnitOfWork],
        provider: VideoGenerationProvider,
        storage: MediaStorage,
        events: ProjectEventBus,
    ) -> None:
        self.uow_factory = uow_factory
        self.provider = provider
        self.storage = storage
        self.events = events
        self.queue: GenerationQueue | None = None

    def attach_queue(self, queue: GenerationQueue) -> None:
        self.queue = queue

    def get_job(self, job_id: str) -> Job:
        with self.uow_factory() as uow:
            job = uow.jobs.get(job_id)
            if job is None:
                raise NotFoundError("JOB_NOT_FOUND", "Job not found")
            return job

    async def submit(self, project_id: str, task_id: str, *, seed: int | None = None) -> Job:
        with self.uow_factory() as uow:
            task = uow.tasks.get(task_id)
            if task is None or task.project_id != project_id:
                raise NotFoundError("TASK_NOT_FOUND", "Task not found")
            if task.state in {TaskState.QUEUED, TaskState.RUNNING}:
                raise ConflictError("TASK_BUSY", "Task is already queued or running")
            if not task.final_prompt.strip():
                raise ShotMillError("TASK_PROMPT_REQUIRED", "Task has no final prompt", 422)

            assets_snapshot: list[dict] = []
            for binding in task.asset_bindings:
                asset = uow.assets.get(binding.asset_id)
                if asset is None:
                    raise NotFoundError("ASSET_NOT_FOUND", f"Asset not found: {binding.asset_id}")
                assets_snapshot.append(
                    {
                        "assetId": asset.id,
                        "reference": binding.reference,
                        "role": binding.role,
                        "mediaType": asset.media_type,
                        "projectRelativePath": asset.project_relative_path,
                        "originalFilename": asset.original_filename,
                    }
                )
            context_links = uow.contexts.list_by_target(task.id)
            job = Job(
                id=new_id("job"),
                project_id=project_id,
                task_id=task.id,
                status=JobStatus.QUEUED,
                final_prompt_snapshot=task.final_prompt,
                task_content_snapshot={
                    "title": task.title,
                    "summary": task.summary,
                    "userIntent": task.user_intent,
                    "plannedDurationSeconds": task.planned_duration_seconds,
                    "promptSource": task.prompt_source.value,
                    "taskRevision": task.revision,
                },
                assets_snapshot=assets_snapshot,
                generation_profile_snapshot={
                    "profileId": task.generation_params.get("profileId", "default"),
                    "target": task.generation_params.get("target", "minimax-h3"),
                },
                provider_profile_snapshot={
                    "providerId": self.provider.id,
                    "capability": asdict(self.provider.capability),
                },
                params_snapshot=dict(task.generation_params),
                context_snapshot={
                    "links": [
                        {
                            "id": link.id,
                            "sourceTaskId": link.source_task_id,
                            "kind": link.kind,
                            "sourceResultId": link.source_result_id,
                            "stale": link.stale,
                        }
                        for link in context_links
                    ]
                },
                seed=seed,
            )
            uow.jobs.add(job)
            task.state = TaskState.QUEUED
            task.progress = 0.0
            task.updated_at = utcnow()
            uow.tasks.update(task)

        await self.events.publish(
            project_id,
            "task.status_changed",
            taskId=task_id,
            status="running",
            progress=0,
        )
        await self.events.publish(
            project_id, "project.runtime_changed", taskId=task_id, state="queued"
        )
        if self.queue is None:
            raise RuntimeError("Generation queue is not attached")
        await self.queue.enqueue(job.id)
        return job

    async def execute(self, job_id: str) -> None:
        project_id: str | None = None
        task_id: str | None = None
        try:
            with self.uow_factory() as uow:
                job = uow.jobs.get(job_id)
                if job is None:
                    return
                project_id = job.project_id
                task_id = job.task_id
                task = uow.tasks.get(job.task_id)
                if task is None:
                    raise NotFoundError("TASK_NOT_FOUND", "Task not found")
                job.status = JobStatus.RUNNING
                job.started_at = utcnow()
                uow.jobs.update_runtime(job)
                task.state = TaskState.RUNNING
                task.progress = 0.0
                task.updated_at = utcnow()
                uow.tasks.update(task)

            await self.events.publish(
                project_id,
                "task.status_changed",
                taskId=task_id,
                status="running",
                progress=0,
            )
            await self.events.publish(
                project_id, "project.runtime_changed", taskId=task_id, state="running"
            )

            resolved: list[ResolvedMedia] = []
            for snapshot in job.assets_snapshot:
                path = self.storage.resolve(project_id, snapshot["projectRelativePath"])
                if not path.exists():
                    raise ShotMillError(
                        "GENERATION_ASSET_FILE_MISSING",
                        f"Asset file missing for snapshot {snapshot['assetId']}",
                        409,
                    )
                mime, _ = mimetypes.guess_type(snapshot.get("originalFilename", ""))
                resolved.append(
                    ResolvedMedia(
                        asset_id=snapshot["assetId"],
                        reference=snapshot["reference"],
                        role=snapshot.get("role"),
                        media_type=snapshot["mediaType"],
                        path=path,
                        mime_type=mime,
                    )
                )

            provider_params = dict(job.params_snapshot)
            provider_params.setdefault(
                "durationSeconds",
                job.task_content_snapshot.get("plannedDurationSeconds", 6),
            )
            response = await self.provider.generate(
                VideoGenerationRequest(
                    job_id=job.id,
                    project_id=job.project_id,
                    task_id=job.task_id,
                    final_prompt=job.final_prompt_snapshot,
                    assets=tuple(resolved),
                    params=provider_params,
                    seed=job.seed,
                )
            )

            created_results: list[Result] = []
            for output in response.outputs:
                relative = self.storage.write_output(
                    project_id, job.id, output.filename, output.content
                )
                url = self.storage.media_url(project_id, relative)
                preview_url = url if (output.content_type or "").startswith("image/") else None
                created_results.append(
                    Result(
                        id=new_id("result"),
                        project_id=project_id,
                        task_id=task_id,
                        job_id=job.id,
                        video_url=url,
                        preview_url=preview_url,
                        metadata={"contentType": output.content_type, **output.metadata},
                    )
                )
            if not created_results:
                raise ShotMillError(
                    "GENERATION_NO_RESULT",
                    "Generation provider returned no outputs",
                    502,
                )

            with self.uow_factory() as uow:
                current_job = uow.jobs.get(job.id)
                current_task = uow.tasks.get(task_id)
                if current_job is None or current_task is None:
                    raise RuntimeError("Job or task disappeared during generation")
                for result in created_results:
                    uow.results.add(result)
                old_primary = current_task.primary_result_id
                current_task.primary_result_id = created_results[0].id
                current_task.state = TaskState.COMPLETED
                current_task.progress = 100.0
                current_task.updated_at = utcnow()
                uow.tasks.update(current_task)
                if old_primary != current_task.primary_result_id:
                    uow.contexts.mark_stale_by_source(current_task.id)
                current_job.status = JobStatus.COMPLETED
                current_job.provider_job_id = response.provider_job_id
                current_job.completed_at = utcnow()
                uow.jobs.update_runtime(current_job)

            for result in created_results:
                await self.events.publish(
                    project_id,
                    "task.result_added",
                    taskId=task_id,
                    resultId=result.id,
                )
            await self.events.publish(
                project_id,
                "task.status_changed",
                taskId=task_id,
                status="completed",
                progress=100,
            )
            await self.events.publish(
                project_id, "project.runtime_changed", taskId=None, state="idle"
            )
            await self.events.publish(project_id, "project.summary_changed")
        except Exception as exc:
            if project_id is not None and task_id is not None:
                with self.uow_factory() as uow:
                    failed_job = uow.jobs.get(job_id)
                    failed_task = uow.tasks.get(task_id)
                    if failed_job is not None:
                        failed_job.status = JobStatus.FAILED
                        failed_job.completed_at = utcnow()
                        failed_job.error_code = getattr(exc, "code", type(exc).__name__.upper())
                        failed_job.error_message = str(exc)
                        uow.jobs.update_runtime(failed_job)
                    if failed_task is not None:
                        failed_task.state = TaskState.FAILED
                        failed_task.progress = None
                        failed_task.updated_at = utcnow()
                        uow.tasks.update(failed_task)
                await self.events.publish(
                    project_id,
                    "task.status_changed",
                    taskId=task_id,
                    status="failed",
                    progress=None,
                )
                await self.events.publish(
                    project_id, "project.runtime_changed", taskId=None, state="failed"
                )
            # The failure is persisted; worker stays alive for later jobs.


class GenerationQueue:
    def __init__(self, service: GenerationService, workers: int = 1) -> None:
        self.service = service
        self.workers = max(1, workers)
        self._queue: asyncio.Queue[str | None] = asyncio.Queue()
        self._tasks: list[asyncio.Task[None]] = []
        self._started = False

    async def start(self) -> None:
        if self._started:
            return
        self._started = True
        self._tasks = [
            asyncio.create_task(self._worker(), name=f"shotmill-generation-{index}")
            for index in range(self.workers)
        ]

    async def stop(self) -> None:
        if not self._started:
            return
        for _ in self._tasks:
            await self._queue.put(None)
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        self._started = False

    async def enqueue(self, job_id: str) -> None:
        if not self._started:
            await self.start()
        await self._queue.put(job_id)

    async def _worker(self) -> None:
        while True:
            job_id = await self._queue.get()
            try:
                if job_id is None:
                    return
                await self.service.execute(job_id)
            finally:
                self._queue.task_done()
