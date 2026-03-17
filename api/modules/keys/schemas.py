"""Translation Keys schemas."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class TranslationStatus(BaseModel):
    total_languages: int = 0
    completed: int = 0
    missing_languages: list[str] = []


class TranslationKeyCreate(BaseModel):
    id: str = Field(..., description="Unique translation key (e.g. login_button)")
    source_language: str = "en"
    source_text: Any = Field(..., description="Plain text string or JSON object/string")
    product: str = "app"
    domain: str = "general"
    screen: str = "general"
    component: str = "text"
    content_type: str = "text"
    placeholders: list[str] = []
    description: str = ""
    tags: list[str] = []
    status: str = "active"


class TranslationKeyUpdate(BaseModel):
    source_text: Optional[Any] = None
    content_type: Optional[str] = None
    placeholders: Optional[list[str]] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None
    translation_status: Optional[TranslationStatus] = None


class TranslationKeyResponse(BaseModel):
    id: str
    source_language: str = "en"
    source_text: Any
    product: str = "app"
    domain: str = "general"
    screen: str = "general"
    component: str = "text"
    content_type: str = "text"
    placeholders: list[str] = []
    description: str = ""
    tags: list[str] = []
    status: str = "active"
    translation_status: TranslationStatus = Field(default_factory=TranslationStatus)
    created_by: str = "system"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TranslationKeyListResponse(BaseModel):
    items: list
    total: int
    skip: int = 0
    limit: int = 50
