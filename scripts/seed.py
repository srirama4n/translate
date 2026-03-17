#!/usr/bin/env python3
"""
Seed script - populate MongoDB with sample translation data.
Run from project root: python scripts/seed.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

# Ensure project root is on path (for .env)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "translate")
# Extract db name from URI path (e.g. .../translate?params -> translate)
u = urlparse(MONGODB_URI)
DB_NAME = (u.path or "/").lstrip("/").split("?")[0] or DATABASE_NAME

NOW = datetime.now(timezone.utc)

TRANSLATION_KEYS = [
    {
        "_id": "login_button",
        "source_language": "en",
        "source_text": "Login",
        "product": "mobile_app",
        "domain": "authentication",
        "screen": "login_screen",
        "component": "button",
        "placeholders": [],
        "description": "Login button label",
        "tags": ["ui", "auth"],
        "status": "active",
        "translation_status": {"total_languages": 25, "completed": 24, "missing_languages": ["ja"]},
        "created_by": "system",
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "_id": "logout_button",
        "source_language": "en",
        "source_text": "Logout",
        "product": "mobile_app",
        "domain": "authentication",
        "screen": "profile_screen",
        "component": "button",
        "placeholders": [],
        "description": "Logout button label",
        "tags": ["ui", "auth"],
        "status": "active",
        "translation_status": {"total_languages": 25, "completed": 25, "missing_languages": []},
        "created_by": "system",
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "_id": "balance_label",
        "source_language": "en",
        "source_text": "Your balance is {amount}",
        "product": "mobile_app",
        "domain": "banking",
        "screen": "account_summary",
        "component": "label",
        "placeholders": ["amount"],
        "description": "Account balance display",
        "tags": ["ui", "banking"],
        "status": "active",
        "translation_status": {"total_languages": 25, "completed": 23, "missing_languages": ["hi", "ja"]},
        "created_by": "system",
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "_id": "welcome_message",
        "source_language": "en",
        "source_text": "Welcome back, {name}!",
        "product": "mobile_app",
        "domain": "dashboard",
        "screen": "home_screen",
        "component": "text",
        "placeholders": ["name"],
        "description": "Personalized welcome",
        "tags": ["ui", "greeting"],
        "status": "active",
        "translation_status": {"total_languages": 25, "completed": 20, "missing_languages": ["ar", "ko", "th", "vi", "id"]},
        "created_by": "system",
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "_id": "transfer_success",
        "source_language": "en",
        "source_text": "Transfer of {amount} to {recipient} completed successfully.",
        "product": "mobile_app",
        "domain": "payments",
        "screen": "transfer_confirmation",
        "component": "message",
        "placeholders": ["amount", "recipient"],
        "description": "Transfer success toast",
        "tags": ["ui", "payments", "success"],
        "status": "active",
        "translation_status": {"total_languages": 25, "completed": 22, "missing_languages": ["ja", "ko", "zh"]},
        "created_by": "system",
        "created_at": NOW,
        "updated_at": NOW,
    },
]

TRANSLATION_VERSIONS = [
    {"key_id": "login_button", "language": "fr", "version": 3, "text": "Se connecter", "status": "active", "source": "human", "model": None, "review_status": "approved", "placeholders_validated": True, "quality_score": 0.98, "created_by": "translator_1", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
    {"key_id": "login_button", "language": "es", "version": 2, "text": "Iniciar sesión", "status": "active", "source": "human", "model": None, "review_status": "approved", "placeholders_validated": True, "quality_score": 1.0, "created_by": "translator_1", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
    {"key_id": "login_button", "language": "de", "version": 1, "text": "Anmelden", "status": "active", "source": "ai", "model": "gpt-4", "review_status": "approved", "placeholders_validated": True, "quality_score": 0.95, "created_by": "system", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
    {"key_id": "logout_button", "language": "fr", "version": 1, "text": "Déconnexion", "status": "active", "source": "human", "model": None, "review_status": "approved", "placeholders_validated": True, "quality_score": 1.0, "created_by": "translator_1", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
    {"key_id": "balance_label", "language": "fr", "version": 1, "text": "Votre solde est {amount}", "status": "active", "source": "human", "model": None, "review_status": "approved", "placeholders_validated": True, "quality_score": 0.97, "created_by": "translator_1", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
    {"key_id": "balance_label", "language": "hi", "version": 1, "text": "आपकी शेष राशि {amount} है", "status": "active", "source": "ai", "model": "gpt-4", "review_status": "approved", "placeholders_validated": True, "quality_score": 0.92, "created_by": "system", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
    {"key_id": "welcome_message", "language": "fr", "version": 1, "text": "Bienvenue, {name} !", "status": "active", "source": "human", "model": None, "review_status": "approved", "placeholders_validated": True, "quality_score": 1.0, "created_by": "translator_1", "created_at": NOW, "approved_by": "reviewer_1", "approved_at": NOW},
]

TRANSLATION_MEMORY = [
    {
        "source_text": "Your balance is {amount}",
        "source_language": "en",
        "context": {"domain": "banking", "screen": "account_summary", "component": "label"},
        "placeholders": ["amount"],
        "translations": {
            "fr": "Votre solde est {amount}",
            "hi": "आपकी शेष राशि {amount} है",
            "de": "Ihr Kontostand beträgt {amount}",
            "es": "Su saldo es {amount}",
        },
        "embedding": None,
        "usage_stats": {"reuse_count": 45, "last_used_at": NOW},
        "quality_score": 0.97,
        "created_by": "system",
        "created_at": NOW,
    },
    {
        "source_text": "Transfer completed successfully",
        "source_language": "en",
        "context": {"domain": "payments", "screen": "transfer_confirmation", "component": "message"},
        "placeholders": [],
        "translations": {
            "fr": "Transfert réussi",
            "de": "Überweisung erfolgreich",
            "es": "Transferencia completada con éxito",
        },
        "embedding": None,
        "usage_stats": {"reuse_count": 12, "last_used_at": NOW},
        "quality_score": 0.95,
        "created_by": "system",
        "created_at": NOW,
    },
]

TRANSLATION_AUDIT = [
    {"key_id": "login_button", "language": "fr", "old_version": 2, "new_version": 3, "old_text": "Connexion", "new_text": "Se connecter", "change_type": "update", "changed_by": "translator_2", "change_reason": "UI terminology update", "timestamp": NOW},
    {"key_id": "login_button", "language": "fr", "old_version": None, "new_version": 1, "old_text": None, "new_text": "Connexion", "change_type": "create", "changed_by": "translator_1", "change_reason": "Initial translation", "timestamp": NOW},
    {"key_id": "balance_label", "language": "fr", "old_version": None, "new_version": 1, "old_text": None, "new_text": "Votre solde est {amount}", "change_type": "create", "changed_by": "translator_1", "change_reason": "New key translation", "timestamp": NOW},
    {"key_id": "login_button", "language": "fr", "old_version": 1, "new_version": 2, "old_text": "Connexion", "new_text": "Se connecter", "change_type": "approve", "changed_by": "reviewer_1", "change_reason": "Approved after review", "timestamp": NOW},
]


async def seed():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    print(f"Connecting to MongoDB ({DB_NAME})...")

    # Clear existing collections (optional - comment out to append only)
    print("Clearing existing data...")
    await db.translation_keys.delete_many({})
    await db.translation_versions.delete_many({})
    await db.translation_memory.delete_many({})
    await db.translation_audit.delete_many({})

    # Insert translation_keys
    print(f"Inserting {len(TRANSLATION_KEYS)} translation keys...")
    await db.translation_keys.insert_many(TRANSLATION_KEYS)

    # Insert translation_versions
    print(f"Inserting {len(TRANSLATION_VERSIONS)} translation versions...")
    await db.translation_versions.insert_many(TRANSLATION_VERSIONS)

    # Insert translation_memory
    print(f"Inserting {len(TRANSLATION_MEMORY)} translation memory entries...")
    await db.translation_memory.insert_many(TRANSLATION_MEMORY)

    # Insert translation_audit
    print(f"Inserting {len(TRANSLATION_AUDIT)} audit records...")
    await db.translation_audit.insert_many(TRANSLATION_AUDIT)

    client.close()
    print("✓ Seed data inserted successfully!")
    print(f"  - {len(TRANSLATION_KEYS)} keys")
    print(f"  - {len(TRANSLATION_VERSIONS)} versions")
    print(f"  - {len(TRANSLATION_MEMORY)} memory entries")
    print(f"  - {len(TRANSLATION_AUDIT)} audit records")


if __name__ == "__main__":
    asyncio.run(seed())
