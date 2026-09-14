from __future__ import annotations

import json
from pathlib import Path

from shotmill.devtools.contracts import build_openapi_contract


def test_committed_frontend_contract_is_current() -> None:
    root = Path(__file__).resolve().parents[2]
    committed = json.loads((root / "contracts" / "openapi.json").read_text(encoding="utf-8"))

    assert committed == build_openapi_contract()
