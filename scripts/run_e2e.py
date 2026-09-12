from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
HOST = "127.0.0.1"
PORT = 1421


def wait_for_server(process: subprocess.Popen[bytes], timeout: float = 20.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Vite exited before the E2E server became ready.")
        try:
            with socket.create_connection((HOST, PORT), timeout=0.25):
                return
        except OSError:
            time.sleep(0.1)
    raise TimeoutError(f"E2E server did not become ready within {timeout:.0f} seconds.")


def main() -> int:
    node = shutil.which("node.exe" if sys.platform == "win32" else "node")
    if not node:
        raise RuntimeError("Node.js was not found on PATH.")

    vite_cli = FRONTEND / "node_modules" / "vite" / "bin" / "vite.js"
    playwright_cli = FRONTEND / "node_modules" / "@playwright" / "test" / "cli.js"
    for required in (vite_cli, playwright_cli):
        if not required.exists():
            raise RuntimeError(f"Missing frontend dependency: {required}")

    server = subprocess.Popen(
        [node, str(vite_cli), "--host", HOST, "--port", str(PORT), "--strictPort"],
        cwd=FRONTEND,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_server(server)
        environment = os.environ.copy()
        environment["SHOTMILL_E2E_EXTERNAL_SERVER"] = "1"
        environment["SHOTMILL_E2E_BASE_URL"] = f"http://{HOST}:{PORT}"
        completed = subprocess.run(
            [node, str(playwright_cli), "test"],
            cwd=FRONTEND,
            env=environment,
            check=False,
        )
        return completed.returncode
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())
