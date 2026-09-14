from __future__ import annotations

from pathlib import Path

from shotmill.devtools.contracts import write_frontend_contract


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    destination = root / "contracts" / "openapi.json"
    write_frontend_contract(destination)
    print(f"Updated {destination}")


if __name__ == "__main__":
    main()
