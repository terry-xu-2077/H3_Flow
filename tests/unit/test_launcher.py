from __future__ import annotations

import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
POWERSHELL_7 = Path(r"C:\Program Files\PowerShell\7\pwsh.exe")
LAUNCHER = ROOT / "scripts" / "start-dev.ps1"
REUSE_CONFIG = ROOT / "frontend" / "src-tauri" / "tauri.reuse-dev.conf.json"


class _ProbeHandler(BaseHTTPRequestHandler):
    body = b""

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(self.body)

    def log_message(self, _format: str, *_args: object) -> None:
        return


@pytest.mark.skipif(sys.platform != "win32" or not POWERSHELL_7.exists(), reason="Windows launcher")
@pytest.mark.parametrize(
    ("body", "expected_code", "expected_text"),
    [
        (
            b'<title>ShotMill</title><script type="module" src="/src/main.tsx"></script>',
            0,
            "a second Vite server will not be started",
        ),
        (b"<title>Another application</title>", 1, "it is not the ShotMill frontend"),
    ],
)
def test_launcher_handles_an_occupied_port(
    body: bytes,
    expected_code: int,
    expected_text: str,
) -> None:
    handler = type("LauncherProbeHandler", (_ProbeHandler,), {"body": body})
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        completed = subprocess.run(
            [
                str(POWERSHELL_7),
                "-NoLogo",
                "-NoProfile",
                "-File",
                str(LAUNCHER),
                "-CheckOnly",
                "-DevPort",
                str(server.server_port),
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=15,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert completed.returncode == expected_code
    assert expected_text in f"{completed.stdout}\n{completed.stderr}"


def test_tauri_reuse_config_disables_the_duplicate_frontend_command() -> None:
    config = json.loads(REUSE_CONFIG.read_text(encoding="utf-8"))

    assert config["build"]["beforeDevCommand"] is None
