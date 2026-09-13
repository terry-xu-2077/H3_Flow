from __future__ import annotations

import asyncio
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator


class ProjectEventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def publish(self, project_id: str, event_type: str, **payload: Any) -> None:
        event = {"type": event_type, "projectId": project_id, **payload}
        async with self._lock:
            subscribers = tuple(self._subscribers.get(project_id, ()))
        for queue in subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                queue.put_nowait(event)

    @asynccontextmanager
    async def subscribe(self, project_id: str) -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[project_id].add(queue)
        try:
            yield queue
        finally:
            async with self._lock:
                self._subscribers[project_id].discard(queue)
                if not self._subscribers[project_id]:
                    self._subscribers.pop(project_id, None)
