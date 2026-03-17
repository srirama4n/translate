"""Common dependencies for all modules."""
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.database import get_db

__all__ = ["get_db", "AsyncIOMotorDatabase"]
