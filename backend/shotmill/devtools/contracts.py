from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from shotmill.app import create_app


def build_openapi_contract() -> dict[str, Any]:
    """Return the canonical frontend HTTP contract exposed by the real API."""

    return create_app().openapi()


def write_frontend_contract(destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(build_openapi_contract(), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
