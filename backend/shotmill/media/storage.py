from __future__ import annotations

import hashlib
import re
from pathlib import Path, PurePosixPath

_SAFE_NAME_RE = re.compile(r"[^\w.()\-\u4e00-\u9fff]+", re.UNICODE)


def safe_filename(name: str) -> str:
    cleaned = _SAFE_NAME_RE.sub("_", Path(name).name).strip("._")
    return cleaned or "asset.bin"


class MediaStorage:
    def __init__(self, projects_root: Path) -> None:
        self.projects_root = projects_root
        self.projects_root.mkdir(parents=True, exist_ok=True)

    def project_root(self, project_id: str) -> Path:
        root = (self.projects_root / project_id).resolve()
        root.mkdir(parents=True, exist_ok=True)
        return root

    def ensure_project_layout(self, project_id: str) -> None:
        root = self.project_root(project_id)
        for folder in ("assets", "thumbnails", "outputs", "context", "cache"):
            (root / folder).mkdir(parents=True, exist_ok=True)

    def write_asset(
        self,
        project_id: str,
        asset_id: str,
        original_filename: str,
        content: bytes,
    ) -> tuple[str, str]:
        self.ensure_project_layout(project_id)
        filename = f"{asset_id}_{safe_filename(original_filename)}"
        relative = PurePosixPath("assets") / filename
        path = self.resolve(project_id, relative.as_posix())
        path.write_bytes(content)
        return relative.as_posix(), hashlib.sha256(content).hexdigest()

    def write_output(self, project_id: str, job_id: str, filename: str, content: bytes) -> str:
        self.ensure_project_layout(project_id)
        relative = PurePosixPath("outputs") / job_id / safe_filename(filename)
        path = self.resolve(project_id, relative.as_posix())
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return relative.as_posix()

    def resolve(self, project_id: str, project_relative_path: str) -> Path:
        project_root = self.project_root(project_id)
        candidate = (project_root / Path(project_relative_path)).resolve()
        try:
            candidate.relative_to(project_root)
        except ValueError as exc:
            raise ValueError("Path escapes project storage root") from exc
        return candidate

    @staticmethod
    def media_url(project_id: str, project_relative_path: str) -> str:
        return f"/media/{project_id}/{PurePosixPath(project_relative_path).as_posix()}"
