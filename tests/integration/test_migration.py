from pathlib import Path

from sqlalchemy import create_engine, inspect

from shotmill.persistence.migrations import upgrade_database


def test_alembic_builds_empty_database(tmp_path: Path) -> None:
    db = tmp_path / "migration.db"
    url = f"sqlite+pysqlite:///{db.as_posix()}"
    upgrade_database(url)
    engine = create_engine(url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    assert {
        "projects",
        "assets",
        "generation_tasks",
        "task_asset_bindings",
        "scenes",
        "task_placements",
        "generation_context_links",
        "jobs",
        "results",
        "ai_prompt_revisions",
        "alembic_version",
    } <= tables
