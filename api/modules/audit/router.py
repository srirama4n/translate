"""Translation Audit API."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.deps import get_db
from api.modules.audit.schemas import (
    TranslationAuditCreate,
    TranslationAuditResponse,
    TranslationAuditListResponse,
)

router = APIRouter(prefix="/translation-audit", tags=["audit"])


@router.get("", response_model=TranslationAuditListResponse)
async def list_audit(
    db: AsyncIOMotorDatabase = Depends(get_db),
    key_id: str | None = Query(None),
    language: str | None = Query(None),
    change_type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List audit records with optional filters."""
    filter_q = {k: v for k, v in [("key_id", key_id), ("language", language), ("change_type", change_type)] if v is not None}
    cursor = db.translation_audit.find(filter_q).sort("timestamp", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
    total = await db.translation_audit.count_documents(filter_q)
    return {"items": items, "total": total}


@router.get("/{audit_id}", response_model=TranslationAuditResponse)
async def get_audit(audit_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get an audit record by ID."""
    try:
        oid = ObjectId(audit_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid audit ID")
    doc = await db.translation_audit.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Audit record not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("", response_model=TranslationAuditResponse, status_code=201)
async def create_audit(
    payload: TranslationAuditCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create an audit record."""
    doc = payload.model_dump()
    result = await db.translation_audit.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc
