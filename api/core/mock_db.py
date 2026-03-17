"""In-memory mock database for when MongoDB is unavailable."""
import copy
import re
import uuid
from datetime import datetime
from typing import Any


def _oid_hex() -> str:
    """Generate 24-char hex string like ObjectId."""
    return uuid.uuid4().hex + uuid.uuid4().hex[:8]


def _normalize_id(v: Any) -> Any:
    """Convert ObjectId to str for comparison."""
    if v is None:
        return None
    try:
        from bson import ObjectId
        if isinstance(v, ObjectId):
            return str(v)
    except ImportError:
        pass
    if hasattr(v, "binary") and hasattr(v, "__str__"):  # ObjectId-like
        return str(v)
    return v


def _match_doc(doc: dict, filter_q: dict) -> bool:
    """Check if doc matches MongoDB-style filter."""
    for key, val in filter_q.items():
        if key == "$or":
            if not isinstance(val, list):
                return False
            if not any(_match_doc(doc, c) for c in val):
                return False
            continue
        # Nested key e.g. context.domain
        keys = key.split(".")
        obj = doc
        for k in keys[:-1]:
            obj = obj.get(k, {})
            if not isinstance(obj, dict):
                return False
        field_val = obj.get(keys[-1])
        if val is None:
            if field_val is not None:
                return False
        elif isinstance(val, dict):
            if "$regex" in val:
                pattern = val["$regex"]
                flags = re.IGNORECASE if val.get("$options", "") == "i" else 0
                if field_val is None or not re.search(pattern, str(field_val), flags):
                    return False
            else:
                return False
        else:
            if _normalize_id(field_val) != _normalize_id(val):
                return False
    return True


class MockInsertResult:
    def __init__(self, inserted_id: Any):
        self.inserted_id = inserted_id


class MockUpdateResult:
    def __init__(self, modified_count: int = 1, upserted_id: Any = None):
        self.modified_count = modified_count
        self.upserted_id = upserted_id
        self.matched_count = 1 if modified_count or upserted_id else 0


class MockDeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class AsyncMockCursor:
    """Async iterator over query results."""

    def __init__(self, items: list):
        self._items = items

    def sort(self, key: str, direction: int = 1):
        self._items = sorted(
            self._items,
            key=lambda d: d.get(key),
            reverse=(direction == -1),
        )
        return self

    def skip(self, n: int):
        self._items = self._items[n:]
        return self

    def limit(self, n: int):
        self._items = self._items[:n]
        return self

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._items:
            raise StopAsyncIteration
        return self._items.pop(0)


class MockCollection:
    """In-memory collection mimicking Motor collection API."""

    def __init__(self, name: str, store: list, id_type: str = "objectid"):
        self.name = name
        self._store = store
        self._id_type = id_type  # "objectid" | "string"

    def _filter(self, filter_q: dict) -> list:
        return [copy.deepcopy(d) for d in self._store if _match_doc(d, filter_q)]

    def find(self, filter_q: dict | None = None):
        filter_q = filter_q or {}
        items = self._filter(filter_q)
        return AsyncMockCursor(items)

    async def find_one(self, filter_q: dict, sort: list | None = None):
        items = self._filter(filter_q)
        if sort:
            for key, direction in reversed(sort):
                items = sorted(items, key=lambda d: d.get(key), reverse=(direction == -1))
        doc = items[0] if items else None
        return copy.deepcopy(doc)

    async def insert_one(self, doc: dict) -> MockInsertResult:
        doc = copy.deepcopy(doc)
        if "_id" not in doc:
            if self._id_type == "string":
                doc["_id"] = doc.get("id", str(uuid.uuid4())[:24])
            else:
                doc["_id"] = _oid_hex()
        self._store.append(doc)
        return MockInsertResult(doc["_id"])

    async def insert_many(self, docs: list) -> MockInsertResult:
        for d in docs:
            await self.insert_one(d)
        return MockInsertResult(None)

    async def update_one(self, filter_q: dict, update: dict, upsert: bool = False) -> MockUpdateResult:
        for doc in self._store:
            if _match_doc(doc, filter_q):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        keys = k.split(".")
                        o = doc
                        for key in keys[:-1]:
                            o = o.setdefault(key, {})
                        o[keys[-1]] = v
                return MockUpdateResult(modified_count=1)
        if upsert:
            new_doc = filter_q.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            new_doc["_id"] = filter_q.get("_id", _oid_hex())
            self._store.append(new_doc)
            return MockUpdateResult(modified_count=0, upserted_id=new_doc["_id"])
        return MockUpdateResult(modified_count=0)

    async def find_one_and_update(
        self, filter_q: dict, update: dict, return_document: bool = False
    ) -> dict | None:
        for i, doc in enumerate(self._store):
            if _match_doc(doc, filter_q):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        keys = k.split(".")
                        o = doc
                        for key in keys[:-1]:
                            o = o.setdefault(key, {})
                        o[keys[-1]] = v
                return copy.deepcopy(doc)
        return None

    async def delete_one(self, filter_q: dict) -> MockDeleteResult:
        for i, doc in enumerate(self._store):
            if _match_doc(doc, filter_q):
                self._store.pop(i)
                return MockDeleteResult(1)
        return MockDeleteResult(0)

    async def delete_many(self, filter_q: dict) -> MockDeleteResult:
        removed = [d for d in self._store if _match_doc(d, filter_q)]
        for d in removed:
            self._store.remove(d)
        return MockDeleteResult(len(removed))

    async def count_documents(self, filter_q: dict | None = None) -> int:
        filter_q = filter_q or {}
        return len(self._filter(filter_q))


# Seed data for demo when MongoDB is unavailable
MOCK_SEED_KEYS = [
    {
        "_id": "welcome",
        "source_text": "Welcome",
        "source_language": "en",
        "product": "app",
        "domain": "general",
        "screen": "home",
        "component": "text",
        "content_type": "text",
        "placeholders": [],
        "description": "",
        "tags": [],
        "status": "active",
        "translation_status": {"total_languages": 3, "completed": 3, "missing_languages": []},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "_id": "login-button",
        "source_text": "Login",
        "source_language": "en",
        "product": "app",
        "domain": "auth",
        "screen": "login",
        "component": "button",
        "content_type": "text",
        "placeholders": [],
        "description": "",
        "tags": [],
        "status": "active",
        "translation_status": {"total_languages": 3, "completed": 3, "missing_languages": []},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "_id": "hello-world",
        "source_text": "Hello, World!",
        "source_language": "en",
        "product": "app",
        "domain": "general",
        "screen": "home",
        "component": "text",
        "content_type": "text",
        "placeholders": [],
        "description": "",
        "tags": [],
        "status": "active",
        "translation_status": {"total_languages": 3, "completed": 3, "missing_languages": []},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
]

def _make_seed_versions():
    """Generate version docs with valid 24-char ObjectId hex."""
    return [
        {
            "key_id": "welcome",
            "language": "fr",
            "version": 1,
            "text": "Bienvenue",
            "status": "active",
            "source": "ai",
            "model": "mock",
            "quality_score": 0.95,
            "created_at": datetime.utcnow(),
        },
    {
        "_id": "v1welcomesp",
        "key_id": "welcome",
        "language": "es",
        "version": 1,
        "text": "Bienvenido",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.95,
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "v1welcomede",
        "key_id": "welcome",
        "language": "de",
        "version": 1,
        "text": "Willkommen",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.95,
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "v1loginfr",
        "key_id": "login-button",
        "language": "fr",
        "version": 1,
        "text": "Se connecter",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.9,
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "v1logines",
        "key_id": "login-button",
        "language": "es",
        "version": 1,
        "text": "Iniciar sesión",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.9,
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "v1loginde",
        "key_id": "login-button",
        "language": "de",
        "version": 1,
        "text": "Anmelden",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.9,
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "v1hellofr",
        "key_id": "hello-world",
        "language": "fr",
        "version": 1,
        "text": "Bonjour, le monde !",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.92,
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "v1helloes",
        "key_id": "hello-world",
        "language": "es",
        "version": 1,
        "text": "¡Hola, mundo!",
        "status": "active",
        "source": "ai",
        "model": "mock",
        "quality_score": 0.92,
        "created_at": datetime.utcnow(),
    },
]


def _seed_store(keys: list, versions: list) -> tuple:
    """Create seeded storage. Version ids must be 24-char hex for ObjectId lookups."""
    k_store = [copy.deepcopy(k) for k in keys]
    v_store = []
    for v in versions:
        vc = copy.deepcopy(v)
        vc["_id"] = _oid_hex()  # Always use 24-char hex for ObjectId compatibility
        v_store.append(vc)
    return k_store, v_store


class MockDatabase:
    """In-memory database that mimics Motor AsyncIOMotorDatabase."""

    def __init__(self):
        k_store, v_store = _seed_store(MOCK_SEED_KEYS, _make_seed_versions())
        self.translation_keys = MockCollection("translation_keys", k_store, id_type="string")
        self.translation_versions = MockCollection(
            "translation_versions", v_store, id_type="objectid"
        )
        self.translation_memory = MockCollection(
            "translation_memory", [], id_type="objectid"
        )
        self.translation_audit = MockCollection("translation_audit", [], id_type="objectid")
        self.app_settings = MockCollection(
            "app_settings",
            [{"_id": "app_settings", "default_model": "mock", "enabled_languages": [
                "fr", "es", "de", "hi", "ja", "zh", "zh-TW", "ko", "ar", "pt", "ru",
                "it", "nl", "sv", "pl", "tr", "th", "vi", "id", "ms", "tl", "uk", "cs",
                "ro", "el", "he", "hu", "da", "fi", "no", "sk", "bg", "hr", "sr", "lt",
                "lv", "et", "sl", "sw", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa",
                "ur", "ne", "si", "my",
            ], "priority_languages": ["fr", "es", "de", "ja", "zh", "ko"]}],
            id_type="string",
        )

    def __getitem__(self, name: str) -> MockCollection:
        return getattr(self, name)


_mock_db_instance: MockDatabase | None = None


def get_mock_db() -> MockDatabase:
    """Get or create singleton mock database."""
    global _mock_db_instance
    if _mock_db_instance is None:
        _mock_db_instance = MockDatabase()
    return _mock_db_instance
