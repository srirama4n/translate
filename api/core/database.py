"""Database connection - MongoDB with in-memory mock fallback."""
import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorClient

from api.core.config import settings
from api.core.mock_db import get_mock_db

client: AsyncIOMotorClient | None = None
_db_instance = None  # Either Motor DB or MockDatabase
_use_mock = None  # True if using mock


async def get_db():
    """Get database instance. Uses MongoDB or in-memory mock if MongoDB unavailable."""
    global client, _db_instance, _use_mock

    if _db_instance is not None:
        return _db_instance

    # Force mock via env
    if _env_use_mock():
        _use_mock = True
        _db_instance = get_mock_db()
        logging.info("Using mock database (USE_MOCK_DB=true)")
        return _db_instance

    # Try MongoDB
    try:
        client = AsyncIOMotorClient(settings.mongodb_uri)
        await asyncio.wait_for(client.admin.command("ping"), timeout=5)
        _db_instance = client[settings.database_name]
        _use_mock = False
        return _db_instance
    except Exception as e:
        logging.warning("MongoDB unreachable (%s), using mock database", e)
        if client:
            client.close()
        client = None
        _use_mock = True
        _db_instance = get_mock_db()
        return _db_instance


def _env_use_mock() -> bool:
    """Check if USE_MOCK_DB env forces mock."""
    import os
    v = os.getenv("USE_MOCK_DB", "").strip().lower()
    return v in ("true", "1", "yes")


def is_using_mock() -> bool:
    """Return True if currently using mock database."""
    global _use_mock
    return _use_mock is True


async def close_db():
    """Close database connection."""
    global client, _db_instance, _use_mock
    if client:
        client.close()
        client = None
    _db_instance = None
    _use_mock = None
