"""MongoDB database connection."""
from motor.motor_asyncio import AsyncIOMotorClient

from api.core.config import settings

client: AsyncIOMotorClient | None = None


async def get_db():
    """Get database instance."""
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongodb_uri)
    return client[settings.database_name]


async def close_db():
    """Close database connection."""
    global client
    if client:
        client.close()
        client = None
