from enum import StrEnum


class PromptSource(StrEnum):
    USER = "user"
    AI = "ai"


class TaskState(StrEnum):
    DRAFT = "draft"
    PROMPT_GENERATING = "prompt_generating"
    PROMPT_READY = "prompt_ready"
    READY = "ready"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    CONTEXT_STALE = "context_stale"


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
