"""Core infrastructure - config, database, dependencies."""

from api.core.config import settings
from api.core.database import close_db, get_db

__all__ = ["settings", "get_db", "close_db"]
