"""Translation Versions schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TranslationVersionCreate(BaseModel):
    key_id: str
    language: str
    version: int = 1
    text: str
    status: str = "draft"
    source: str = "human"
    model: Optional[str] = None
    placeholders_validated: bool = False
    quality_score: Optional[float] = None
    created_by: Optional[str] = None


class TranslationVersionUpdate(BaseModel):
    text: Optional[str] = None
    status: Optional[str] = None
    review_status: Optional[str] = None
    placeholders_validated: Optional[bool] = None
    quality_score: Optional[float] = None
    approved_by: Optional[str] = None


class TranslationVersionResponse(BaseModel):
    id: str
    key_id: str
    language: str
    version: int
    text: str
    status: str
    source: str
    model: Optional[str] = None
    review_status: str = "pending"
    placeholders_validated: bool = False
    quality_score: Optional[float] = None
    created_by: Optional[str] = None
    created_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TranslationVersionListResponse(BaseModel):
    items: list[TranslationVersionResponse]
    total: int
