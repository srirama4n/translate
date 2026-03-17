"""Translation Audit schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TranslationAuditCreate(BaseModel):
    key_id: str
    language: str
    old_version: Optional[int] = None
    new_version: Optional[int] = None
    old_text: Optional[str] = None
    new_text: Optional[str] = None
    change_type: str  # create, update, rollback, delete, approve, reject
    changed_by: str
    change_reason: str = ""


class TranslationAuditResponse(BaseModel):
    id: str
    key_id: str
    language: str
    old_version: Optional[int] = None
    new_version: Optional[int] = None
    old_text: Optional[str] = None
    new_text: Optional[str] = None
    change_type: str
    changed_by: str
    change_reason: str = ""
    timestamp: datetime

    class Config:
        from_attributes = True


class TranslationAuditListResponse(BaseModel):
    items: list[TranslationAuditResponse]
    total: int
