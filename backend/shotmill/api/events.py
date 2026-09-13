from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from shotmill.api.dependencies import get_container
from shotmill.application.container import ApplicationContainer

router = APIRouter(prefix="/projects/{project_id}", tags=["events"])


@router.get("/events")
async def project_events(
    project_id: str,
    request: Request,
    container: ApplicationContainer = Depends(get_container),
) -> StreamingResponse:
    container.workspace_query.project_settings(project_id)

    async def stream():
        async with container.events.subscribe(project_id) as queue:
            yield "event: connected\ndata: {}\n\n"
            while True:
                if await request.is_disconnected():
                    return
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                except TimeoutError:
                    yield ": heartbeat\n\n"
                    continue
                yield f"event: {event['type']}\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
