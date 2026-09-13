from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config


def alembic_config(database_url: str) -> Config:
    config = Config()
    script_location = Path(__file__).with_name("migrations")
    config.set_main_option("script_location", str(script_location))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def upgrade_database(database_url: str) -> None:
    command.upgrade(alembic_config(database_url), "head")
