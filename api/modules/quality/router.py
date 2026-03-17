"""Quality evaluation API."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from api.core.deps import get_db
from api.modules.quality.scorer import evaluate_translation, rule_based_score


router = APIRouter(prefix="/quality", tags=["quality"])


class EvaluateRequest(BaseModel):
    source_text: str
    translated_text: str
    language: str


class EvaluateResponse(BaseModel):
    overall_score: int
    fluency: int
    accuracy: int
    naturalness: int
    rule_score: int
    issues: list[str]
    checks: dict
    method: str


class CompareRequest(BaseModel):
    source_text: str
    translations: dict  # {lang: text} or {model: text}


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(payload: EvaluateRequest):
    """Evaluate a single translation's quality."""
    result = evaluate_translation(payload.source_text, payload.translated_text, payload.language)
    return result


@router.post("/evaluate-key")
async def evaluate_key(
    key_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Evaluate all active translations for a key and update quality_score in DB."""
    key_doc = await db.translation_keys.find_one({"_id": key_id})
    if not key_doc:
        return {"error": "Key not found"}

    source_text = key_doc.get("source_text", "")
    cursor = db.translation_versions.find({"key_id": key_id, "status": "active"})
    results = []
    async for v in cursor:
        evaluation = evaluate_translation(source_text, v.get("text", ""), v.get("language", ""))
        score = evaluation["overall_score"]
        await db.translation_versions.update_one(
            {"_id": v["_id"]},
            {"$set": {"quality_score": score / 100.0}}
        )
        results.append({
            "language": v.get("language"),
            "version": v.get("version"),
            "score": score,
            "issues": evaluation["issues"],
            "checks": evaluation["checks"],
        })

    return {"key_id": key_id, "evaluations": results, "total": len(results)}


@router.post("/evaluate-all")
async def evaluate_all(
    db: AsyncIOMotorDatabase = Depends(get_db),
    limit: int = Query(500, ge=1, le=5000),
):
    """Evaluate all active translations across all keys."""
    keys_cursor = db.translation_keys.find({}).limit(limit)
    total_evaluated = 0
    total_keys = 0

    async for key_doc in keys_cursor:
        total_keys += 1
        source_text = key_doc.get("source_text", "")
        v_cursor = db.translation_versions.find({"key_id": key_doc["_id"], "status": "active"})
        async for v in v_cursor:
            evaluation = evaluate_translation(source_text, v.get("text", ""), v.get("language", ""))
            score = evaluation["overall_score"]
            await db.translation_versions.update_one(
                {"_id": v["_id"]},
                {"$set": {"quality_score": score / 100.0}}
            )
            total_evaluated += 1

    return {"keys_processed": total_keys, "translations_evaluated": total_evaluated}
