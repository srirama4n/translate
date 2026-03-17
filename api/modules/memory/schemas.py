"""Translation Memory schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MemoryContext(BaseModel):
    domain: str
    screen: str
    component: str = ""


class UsageStats(BaseModel):
    reuse_count: int = 0
    last_used_at: Optional[datetime] = None


class TranslationMemoryCreate(BaseModel):
    source_text: str
    source_language: str = "en"
    context: MemoryContext
    placeholders: list[str] = []
    translations: dict[str, str] = {}
    embedding: Optional[list[float]] = None
    quality_score: Optional[float] = None
    created_by: str = "system"


class TranslationMemoryUpdate(BaseModel):
    translations: Optional[dict[str, str]] = None
    embedding: Optional[list[float]] = None
    usage_stats: Optional[UsageStats] = None
    quality_score: Optional[float] = None


class TranslationMemoryResponse(BaseModel):
    id: str
    source_text: str
    source_language: str
    context: MemoryContext
    placeholders: list[str] = []
    translations: dict[str, str] = {}
    usage_stats: UsageStats = Field(default_factory=UsageStats)
    quality_score: Optional[float] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class TranslationMemoryListResponse(BaseModel):
    items: list[TranslationMemoryResponse]
    total: int
