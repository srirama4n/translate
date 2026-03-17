"""Translation Keys API."""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.deps import get_db
from api.modules.keys.schemas import (
    TranslationKeyCreate,
    TranslationKeyUpdate,
    TranslationKeyResponse,
    TranslationKeyListResponse,
)

router = APIRouter(prefix="/translation-keys", tags=["keys"])


class CheckBulkRequest(BaseModel):
    key_ids: list[str]


@router.post("/check-bulk")
async def check_bulk(
    payload: CheckBulkRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Check which keys exist and return their active translations."""
    existing = {}
    for key_id in payload.key_ids:
        doc = await db.translation_keys.find_one({"_id": key_id})
        if doc:
            versions_cursor = db.translation_versions.find(
                {"key_id": key_id, "status": "active"}
            )
            translations = {}
            async for v in versions_cursor:
                translations[v["language"]] = v["text"]
            existing[key_id] = {
                "source_text": doc.get("source_text", ""),
                "translations": translations,
            }
    return {"existing": existing}


@router.get("", response_model=TranslationKeyListResponse)
async def list_keys(
    db: AsyncIOMotorDatabase = Depends(get_db),
    search: str | None = Query(None, description="Search in id, source_text, description"),
    domain: str | None = Query(None),
    screen: str | None = Query(None),
    status: str | None = Query(None),
    content_type: str | None = Query(None, description="Filter by content_type: text or json"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List translation keys with search, filters, and pagination."""
    filter_q = {}
    if domain:
        filter_q["domain"] = domain
    if screen:
        filter_q["screen"] = screen
    if status:
        filter_q["status"] = status
    if content_type:
        filter_q["content_type"] = content_type
    if search:
        filter_q["$or"] = [
            {"_id": {"$regex": search, "$options": "i"}},
            {"source_text": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.translation_keys.find(filter_q).sort("updated_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["id"] = doc.pop("_id")
        items.append(doc)
    total = await db.translation_keys.count_documents(filter_q)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{key_id}", response_model=TranslationKeyResponse)
async def get_key(key_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a translation key by ID."""
    doc = await db.translation_keys.find_one({"_id": key_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Translation key not found")
    doc["id"] = doc.pop("_id")
    return doc


@router.post("", response_model=TranslationKeyResponse, status_code=201)
async def create_key(
    payload: TranslationKeyCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new translation key. source_text can be plain text or JSON string."""
    if await db.translation_keys.find_one({"_id": payload.id}):
        raise HTTPException(status_code=400, detail="Translation key already exists")
    doc = payload.model_dump()
    doc["_id"] = doc.pop("id")
    now = datetime.utcnow()
    doc.setdefault("created_at", now)
    doc.setdefault("updated_at", now)
    doc.setdefault("translation_status", {"total_languages": 0, "completed": 0, "missing_languages": []})

    is_json = False
    try:
        json.loads(doc["source_text"])
        is_json = True
    except (json.JSONDecodeError, TypeError):
        pass
    doc.setdefault("content_type", "json" if is_json else "text")

    await db.translation_keys.insert_one(doc)
    doc["id"] = doc.pop("_id")
    return doc


@router.patch("/{key_id}", response_model=TranslationKeyResponse)
async def update_key(
    key_id: str,
    payload: TranslationKeyUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update a translation key."""
    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    result = await db.translation_keys.find_one_and_update(
        {"_id": key_id},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Translation key not found")
    result["id"] = result.pop("_id")
    return result


@router.delete("/{key_id}", status_code=204)
async def delete_key(key_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Delete a translation key and all its translations."""
    result = await db.translation_keys.delete_one({"_id": key_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Translation key not found")
    await db.translation_versions.delete_many({"key_id": key_id})
