from __future__ import annotations

import argparse
import asyncio
import mimetypes
from pathlib import Path

from shotmill.domain.providers import ResolvedMedia, VideoGenerationRequest
from shotmill.providers.video_generation.comfyui import ComfyUIVideoGenerationProvider

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKFLOW = (
    ROOT
    / "backend"
    / "shotmill"
    / "providers"
    / "video_generation"
    / "workflows"
    / "minimax_h3_reference_api.json"
)


def parse_asset(value: str) -> tuple[str, Path]:
    try:
        reference, raw_path = value.split("=", 1)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("asset must use <Picture N>=PATH") from exc
    path = Path(raw_path).expanduser().resolve()
    if not path.is_file():
        raise argparse.ArgumentTypeError(f"asset file not found: {path}")
    return reference, path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run one real ShotMill ComfyUI smoke job.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8188")
    parser.add_argument("--workflow", type=Path, default=DEFAULT_WORKFLOW)
    parser.add_argument(
        "--prompt", default="A calm cinematic shot of clouds moving over distant mountains."
    )
    parser.add_argument("--duration", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--timeout", type=float, default=900.0)
    parser.add_argument("--asset", action="append", type=parse_asset, default=[])
    parser.add_argument("--output-dir", type=Path, default=ROOT / ".artifacts" / "comfyui-smoke")
    return parser


async def run(args: argparse.Namespace) -> int:
    media = tuple(
        ResolvedMedia(
            asset_id=f"smoke-{index}",
            reference=reference,
            role="reference",
            media_type="image",
            path=path,
            mime_type=mimetypes.guess_type(path.name)[0],
        )
        for index, (reference, path) in enumerate(args.asset, start=1)
    )
    provider = ComfyUIVideoGenerationProvider(
        args.base_url,
        args.workflow.resolve(),
        timeout_seconds=args.timeout,
    )
    response = await provider.generate(
        VideoGenerationRequest(
            job_id="hardware-smoke",
            project_id="hardware-smoke",
            task_id="hardware-smoke",
            final_prompt=args.prompt,
            assets=media,
            params={"durationSeconds": args.duration},
            seed=args.seed,
        )
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for output in response.outputs:
        target = args.output_dir / Path(output.filename).name
        target.write_bytes(output.content)
        print(f"OUTPUT {target} ({len(output.content)} bytes, {output.content_type})")
    print(f"PASS ComfyUI prompt_id={response.provider_job_id}")
    return 0


def main() -> int:
    return asyncio.run(run(build_parser().parse_args()))


if __name__ == "__main__":
    raise SystemExit(main())
