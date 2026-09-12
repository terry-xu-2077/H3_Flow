from dataclasses import dataclass
from os import getenv
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = "ShotMill"
    api_version: str = "0.1"
    comfyui_root: Path | None = None


configured_comfyui_root = getenv("SHOTMILL_COMFYUI_ROOT")
settings = Settings(
    comfyui_root=Path(configured_comfyui_root) if configured_comfyui_root else None,
)
