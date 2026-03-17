"""Translation Memory API."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.deps import get_db
from api.modules.memory.schemas import (
    TranslationMemoryCreate,
    TranslationMemoryUpdate,
    TranslationMemoryResponse,
    TranslationMemoryListResponse,
)

router = APIRouter(prefix="/translation-memory", tags=["memory"])


@router.get("", response_model=TranslationMemoryListResponse)
async def list_memory(
    db: AsyncIOMotorDatabase = Depends(get_db),
    domain: str | None = Query(None),
    screen: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List translation memory entries with optional filters."""
    filter_q = {}
    if domain:
        filter_q["context.domain"] = domain
    if screen:
        filter_q["context.screen"] = screen
    cursor = db.translation_memory.find(filter_q).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
    total = await db.translation_memory.count_documents(filter_q)
    return {"items": items, "total": total}


@router.get("/{memory_id}", response_model=TranslationMemoryResponse)
async def get_memory(memory_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a translation memory entry by ID."""
    try:
        oid = ObjectId(memory_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid memory ID")
    doc = await db.translation_memory.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Translation memory entry not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("", response_model=TranslationMemoryResponse, status_code=201)
async def create_memory(
    payload: TranslationMemoryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new translation memory entry."""
    doc = payload.model_dump()
    result = await db.translation_memory.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.patch("/{memory_id}", response_model=TranslationMemoryResponse)
async def update_memory(
    memory_id: str,
    payload: TranslationMemoryUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update a translation memory entry."""
    try:
        oid = ObjectId(memory_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid memory ID")
    update_data = payload.model_dump(exclude_unset=True)
    result = await db.translation_memory.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Translation memory entry not found")
    result["id"] = str(result.pop("_id"))
    return result


@router.delete("/{memory_id}", status_code=204)
async def delete_memory(memory_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Delete a translation memory entry."""
    try:
        oid = ObjectId(memory_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid memory ID")
    result = await db.translation_memory.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Translation memory entry not found")
