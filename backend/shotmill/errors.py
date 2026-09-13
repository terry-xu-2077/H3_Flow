from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ShotMillError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return self.message


class NotFoundError(ShotMillError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(code=code, message=message, status_code=404)


class ConflictError(ShotMillError):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(code=code, message=message, status_code=409, details=details or {})


class ProviderUnavailableError(ShotMillError):
    def __init__(self, message: str) -> None:
        super().__init__(code="GENERATION_SERVICE_OFFLINE", message=message, status_code=503)
