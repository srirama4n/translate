"""Translation Versions API."""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.deps import get_db
from api.modules.quality.scorer import rule_based_score
from api.modules.versions.schemas import (
    TranslationVersionCreate,
    TranslationVersionUpdate,
    TranslationVersionResponse,
    TranslationVersionListResponse,
)

router = APIRouter(prefix="/translation-versions", tags=["versions"])


@router.get("", response_model=TranslationVersionListResponse)
async def list_versions(
    db: AsyncIOMotorDatabase = Depends(get_db),
    key_id: str | None = Query(None),
    language: str | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=10000),
):
    """List translation versions with optional filters."""
    filter_q = {k: v for k, v in [("key_id", key_id), ("language", language), ("status", status)] if v is not None}
    cursor = db.translation_versions.find(filter_q).sort("version", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
    total = await db.translation_versions.count_documents(filter_q)
    return {"items": items, "total": total}


@router.get("/active")
async def get_active(key_id: str, language: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get active translation for a key + language (runtime query)."""
    doc = await db.translation_versions.find_one(
        {"key_id": key_id, "language": language, "status": "active"}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Active translation not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/{version_id}", response_model=TranslationVersionResponse)
async def get_version(version_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a translation version by ID."""
    try:
        oid = ObjectId(version_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid version ID")
    doc = await db.translation_versions.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Translation version not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("", response_model=TranslationVersionResponse, status_code=201)
async def create_version(
    payload: TranslationVersionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new translation version."""
    latest = await db.translation_versions.find_one(
        {"key_id": payload.key_id, "language": payload.language},
        sort=[("version", -1)],
    )
    version = (latest["version"] + 1) if latest else 1
    doc = payload.model_dump(exclude={"version"})
    doc["version"] = version
    doc.setdefault("created_at", datetime.utcnow())

    # Auto quality-score: look up source text and run rule-based scoring
    if not doc.get("quality_score"):
        key_doc = await db.translation_keys.find_one({"_id": doc["key_id"]})
        if key_doc:
            source = key_doc.get("source_text", "")
            if isinstance(source, dict):
                import json
                source = json.dumps(source)
            qr = rule_based_score(str(source), doc["text"], doc["language"])
            doc["quality_score"] = qr["score"] / 100.0

    result = await db.translation_versions.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.patch("/{version_id}", response_model=TranslationVersionResponse)
async def update_version(
    version_id: str,
    payload: TranslationVersionUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update a translation version."""
    try:
        oid = ObjectId(version_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid version ID")
    update_data = payload.model_dump(exclude_unset=True)
    result = await db.translation_versions.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Translation version not found")
    result["id"] = str(result.pop("_id"))
    return result


@router.delete("/{version_id}", status_code=204)
async def delete_version(version_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Delete a translation version."""
    try:
        oid = ObjectId(version_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid version ID")
    result = await db.translation_versions.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Translation version not found")
