from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
from tempfile import TemporaryDirectory

import uvicorn
from shotmill.devtools.mock_api import create_mock_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the backend-owned ShotMill fake API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()

    with TemporaryDirectory(prefix="shotmill-mock-api-") as directory:
        application = asyncio.run(create_mock_app(data_root=Path(directory)))
        uvicorn.run(application, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
