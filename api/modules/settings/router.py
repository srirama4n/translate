"""Settings API - model config, language management, export/import."""
import json
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.deps import get_db

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "_id": "app_settings",
    "default_model": "mock",
    "enabled_languages": [
        "fr","es","de","hi","ja","zh","zh-TW","ko","ar","pt","ru",
        "it","nl","sv","pl","tr","th","vi","id","ms","tl","uk","cs",
        "ro","el","he","hu","da","fi","no","sk","bg","hr","sr","lt",
        "lv","et","sl","sw","bn","ta","te","mr","gu","kn","ml","pa",
        "ur","ne","si","my",
    ],
    "priority_languages": ["fr", "es", "de", "ja", "zh", "ko"],
}


async def get_settings(db):
    doc = await db.app_settings.find_one({"_id": "app_settings"})
    if not doc:
        await db.app_settings.insert_one(DEFAULT_SETTINGS.copy())
        doc = DEFAULT_SETTINGS.copy()
    doc["id"] = doc.pop("_id", "app_settings")
    return doc


class UpdateSettingsRequest(BaseModel):
    default_model: str | None = None
    enabled_languages: list[str] | None = None
    priority_languages: list[str] | None = None


@router.get("")
async def read_settings(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get application settings."""
    return await get_settings(db)


@router.patch("")
async def update_settings(
    payload: UpdateSettingsRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update application settings."""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return await get_settings(db)
    await db.app_settings.update_one(
        {"_id": "app_settings"},
        {"$set": update_data},
        upsert=True,
    )
    return await get_settings(db)


@router.get("/export")
async def export_data(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Export all data as JSON."""
    data = {"exported_at": datetime.utcnow().isoformat(), "collections": {}}
    for coll_name in ["translation_keys", "translation_versions", "translation_memory", "translation_audit"]:
        coll = db[coll_name]
        items = []
        async for doc in coll.find({}):
            doc["_id"] = str(doc["_id"])
            for k, v in doc.items():
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
                elif isinstance(v, ObjectId):
                    doc[k] = str(v)
            items.append(doc)
        data["collections"][coll_name] = items
    return JSONResponse(content=data)


class ImportRequest(BaseModel):
    collections: dict
    mode: str = "merge"


@router.post("/import")
async def import_data(
    payload: ImportRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Import data from JSON. mode: 'merge' (skip existing) or 'replace' (clear first)."""
    stats = {}
    for coll_name, items in payload.collections.items():
        if coll_name not in ["translation_keys", "translation_versions", "translation_memory", "translation_audit"]:
            continue
        coll = db[coll_name]
        if payload.mode == "replace":
            await coll.delete_many({})
        inserted = 0
        skipped = 0
        for doc in items:
            doc_id = doc.pop("_id", doc.pop("id", None))
            if coll_name == "translation_keys":
                doc["_id"] = doc_id
                try:
                    await coll.insert_one(doc)
                    inserted += 1
                except Exception:
                    skipped += 1
            else:
                if doc_id:
                    try:
                        doc["_id"] = ObjectId(doc_id)
                    except Exception:
                        pass
                try:
                    await coll.insert_one(doc)
                    inserted += 1
                except Exception:
                    skipped += 1
        stats[coll_name] = {"inserted": inserted, "skipped": skipped}
    return {"status": "ok", "stats": stats}
