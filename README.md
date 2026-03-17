# Translation Management System

A full-stack translation management platform for mobile apps. Manage translation keys, translate into 50+ languages, track versions, evaluate quality, and maintain a glossary — all from a modern React UI backed by a Python FastAPI + MongoDB API.

---

## Architecture

```
translate/
├── api/                    # Python FastAPI backend
│   ├── main.py             # App entry, CORS, module registration
│   ├── core/
│   │   ├── config.py       # Settings (env vars)
│   │   ├── database.py     # MongoDB connection (Motor async)
│   │   └── deps.py         # FastAPI dependencies
│   └── modules/
│       ├── keys/           # Translation keys CRUD
│       ├── versions/       # Translation versions (with auto-versioning)
│       ├── translate/      # Translation engine (mock + model selection)
│       ├── quality/        # Quality scoring & evaluation
│       ├── memory/         # Translation memory / glossary
│       ├── audit/          # Audit trail
│       └── settings/       # App settings, export/import
├── ui/                     # React frontend (Parcel bundler)
│   ├── src/
│   │   ├── app/            # App shell, routes, layout, sidebar
│   │   ├── features/       # Feature modules (one per tab)
│   │   │   ├── dashboard/
│   │   │   ├── translate/
│   │   │   ├── translations/
│   │   │   ├── quality/
│   │   │   ├── audit/
│   │   │   ├── glossary/
│   │   │   └── settings/
│   │   └── shared/         # API client, styles
│   └── index.html
├── scripts/
│   ├── seed.py             # Seed sample data (5 keys, 7 versions)
│   └── seed_100.py         # Seed 100+ keys with translations
└── .env                    # Environment variables
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (Atlas or local)

### 1. Clone & configure

```bash
# Set up .env with your MongoDB URI
cp .env.example .env
```

`.env` file:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/translate
DATABASE_NAME=translate
API_HOST=0.0.0.0
API_PORT=8000
```

### 2. Start the API

```bash
pip install -r api/requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the UI

```bash
cd ui
npm install
npm run dev
```

Open **http://localhost:3000**

### 4. Seed sample data (optional)

```bash
python scripts/seed.py       # 5 keys + translations
python scripts/seed_100.py   # 100+ keys with FR/ES/DE translations
```

---

## UI Screens (7 tabs)

| Tab | Path | Description |
|-----|------|-------------|
| **Dashboard** | `/` | Stats overview: total keys, translations, languages, coverage %, top languages chart, recent activity |
| **Translate** | `/translate` | Enter text or upload Excel → translate to 50 languages → edit → save. Model selector (Mock, GPT-4, DeepL, etc.) |
| **Translations** | `/translations` | Searchable, paginated key list. Select key → view/edit all translations, quality scores, version history, add language, export to Excel, bulk delete, re-translate with different model |
| **Quality** | `/quality` | Quality dashboard: average score, good/review/poor counts, score by language, low-quality issues list, evaluate all button |
| **Audit** | `/audit` | Activity feed with filters (key, language, change type). Shows diffs (old → new text) |
| **Glossary** | `/glossary` | Translation memory entries. Add/delete terms. Consistency checker finds duplicate translations across keys |
| **Settings** | `/settings` | Default model selection, language enable/disable + priority toggles, full database export/import as JSON |

### Additional UI features
- **Dark mode** toggle (sidebar, persists in localStorage)
- **Excel upload** with 5000+ row support (chunked processing)
- **Smart merge** on save (detects new/changed/identical, only saves changes)
- **Bulk delete** with checkboxes
- **Version history** with side-by-side diff comparison
- **Flag emojis** for all languages

---

## API Reference

Base URL: `http://localhost:8000/api`

### Translation Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/translation-keys` | List keys (search, pagination, filters) |
| `GET` | `/translation-keys/{key_id}` | Get single key |
| `POST` | `/translation-keys` | Create key |
| `PATCH` | `/translation-keys/{key_id}` | Update key |
| `DELETE` | `/translation-keys/{key_id}` | Delete key + all translations |
| `POST` | `/translation-keys/check-bulk` | Check which keys exist (for smart merge) |

**Query params** (GET list): `search`, `domain`, `screen`, `status`, `content_type`, `skip`, `limit` (max 500)

**Key schema:**
```json
{
  "id": "login_button",
  "source_language": "en",
  "source_text": "Login",
  "product": "app",
  "domain": "authentication",
  "screen": "login_screen",
  "component": "button",
  "content_type": "text",
  "placeholders": [],
  "description": "Login button label",
  "tags": ["ui", "auth"],
  "status": "active",
  "translation_status": { "total_languages": 25, "completed": 24, "missing_languages": ["ja"] },
  "created_by": "system",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### Translation Versions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/translation-versions` | List versions (filter by key_id, language, status) |
| `GET` | `/translation-versions/active` | Get active translation for key+language |
| `GET` | `/translation-versions/{id}` | Get single version |
| `POST` | `/translation-versions` | Create version (auto-increments version number, auto quality-scores) |
| `PATCH` | `/translation-versions/{id}` | Update version (e.g. deprecate) |
| `DELETE` | `/translation-versions/{id}` | Delete version |

**Query params** (GET list): `key_id`, `language`, `status`, `skip`, `limit` (max 10000)

**Version schema:**
```json
{
  "id": "65abc123...",
  "key_id": "login_button",
  "language": "fr",
  "version": 3,
  "text": "Se connecter",
  "status": "active",
  "source": "human",
  "model": null,
  "review_status": "approved",
  "placeholders_validated": true,
  "quality_score": 0.98,
  "created_by": "translator_1",
  "created_at": "2024-01-01T00:00:00",
  "approved_by": "reviewer_1",
  "approved_at": "2024-01-01T00:00:00"
}
```

### Translate (Translation Engine)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/translate/languages` | List all 50 supported languages |
| `GET` | `/translate/models` | List available translation models |
| `POST` | `/translate` | Translate text into all languages |
| `POST` | `/translate/bulk` | Translate multiple texts (5000+ supported) |

**POST /translate body:**
```json
{
  "text": "Welcome",
  "source_language": "en",
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "source_text": "Welcome",
  "source_language": "en",
  "model": "gpt-4",
  "languages": { "fr": "French", "es": "Spanish", ... },
  "translations": { "fr": "Bienvenue", "es": "Bienvenido", ... }
}
```

**Available models:** `mock`, `gpt-4`, `gpt-3.5`, `deepl`, `google`, `claude` (all return mock data — plug in real APIs in `api/modules/translate/router.py`)

### Quality

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/quality/evaluate` | Evaluate a single translation |
| `POST` | `/quality/evaluate-key?key_id=...` | Evaluate all translations for a key |
| `POST` | `/quality/evaluate-all` | Evaluate all translations in DB |

**Quality checks (rule-based):**
- Placeholder preservation (`{amount}`, `{name}`)
- Untranslated text detection
- Native script validation (e.g. Japanese chars for `ja`)
- Length ratio validation
- Whitespace issues

**POST /quality/evaluate body:**
```json
{
  "source_text": "Your balance is {amount}",
  "translated_text": "Votre solde est {amount}",
  "language": "fr"
}
```

**Response:**
```json
{
  "overall_score": 95,
  "fluency": 98,
  "accuracy": 95,
  "naturalness": 92,
  "rule_score": 100,
  "issues": [],
  "checks": { "placeholders": "pass", "untranslated": "pass", "script": "n/a", "length": "pass", "whitespace": "pass" },
  "method": "rule_based + mock_llm"
}
```

### Translation Memory (Glossary)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/translation-memory` | List memory entries |
| `GET` | `/translation-memory/{id}` | Get single entry |
| `POST` | `/translation-memory` | Create entry |
| `PATCH` | `/translation-memory/{id}` | Update entry |
| `DELETE` | `/translation-memory/{id}` | Delete entry |

**Memory schema:**
```json
{
  "id": "65abc456...",
  "source_text": "Your balance is {amount}",
  "source_language": "en",
  "context": { "domain": "banking", "screen": "account_summary", "component": "label" },
  "placeholders": ["amount"],
  "translations": { "fr": "Votre solde est {amount}", "de": "Ihr Kontostand beträgt {amount}" },
  "usage_stats": { "reuse_count": 45, "last_used_at": "2024-01-01T00:00:00" },
  "quality_score": 0.97,
  "created_by": "system",
  "created_at": "2024-01-01T00:00:00"
}
```

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/translation-audit` | List audit records (filter by key_id, language, change_type) |
| `GET` | `/translation-audit/{id}` | Get single record |
| `POST` | `/translation-audit` | Create audit record |

**Audit schema:**
```json
{
  "id": "65abc789...",
  "key_id": "login_button",
  "language": "fr",
  "old_version": 2,
  "new_version": 3,
  "old_text": "Connexion",
  "new_text": "Se connecter",
  "change_type": "update",
  "changed_by": "translator_2",
  "change_reason": "UI terminology update",
  "timestamp": "2024-01-01T00:00:00"
}
```

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/settings` | Get app settings |
| `PATCH` | `/settings` | Update settings |
| `GET` | `/settings/export` | Export full database as JSON |
| `POST` | `/settings/import` | Import data from JSON |

**Settings schema:**
```json
{
  "default_model": "mock",
  "enabled_languages": ["fr", "es", "de", "ja", ...],
  "priority_languages": ["fr", "es", "de", "ja", "zh", "ko"]
}
```

**Import body:**
```json
{
  "collections": {
    "translation_keys": [...],
    "translation_versions": [...],
    "translation_memory": [...],
    "translation_audit": [...]
  },
  "mode": "merge"
}
```
Mode: `merge` (skip existing) or `replace` (clear collections first)

---

## MongoDB Collections

| Collection | Description |
|------------|-------------|
| `translation_keys` | Source texts with metadata (domain, screen, tags, status) |
| `translation_versions` | Versioned translations per key+language (with quality scores) |
| `translation_memory` | Reusable phrase pairs for the glossary |
| `translation_audit` | Change history (create, update, delete events) |
| `app_settings` | Application configuration |

---

## Supported Languages (50)

French, Spanish, German, Hindi, Japanese, Chinese (Simplified), Chinese (Traditional), Korean, Arabic, Portuguese, Russian, Italian, Dutch, Swedish, Polish, Turkish, Thai, Vietnamese, Indonesian, Malay, Filipino, Ukrainian, Czech, Romanian, Greek, Hebrew, Hungarian, Danish, Finnish, Norwegian, Slovak, Bulgarian, Croatian, Serbian, Lithuanian, Latvian, Estonian, Slovenian, Swahili, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Nepali, Sinhala, Myanmar.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI 0.115, Pydantic 2.9, Motor 3.6 (async MongoDB) |
| **Database** | MongoDB Atlas (or local) |
| **Frontend** | React 18, React Router 6, Lucide React icons, SheetJS (xlsx) |
| **Bundler** | Parcel 2 |
| **Styling** | CSS custom properties, dark mode support |

---

## Adding a Real Translation Model

In `api/modules/translate/router.py`, update the `mock_translate()` function:

```python
import openai

def mock_translate(text: str, model: str = "mock") -> dict:
    if model == "gpt-4":
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": f"Translate to French: {text}"}]
        )
        return {"fr": response.choices[0].message.content, ...}
    elif model == "deepl":
        # Call DeepL API
        ...
    return {code: f"[{LANGUAGES[code]}] {text}" for code in LANGUAGES}
```

Set the API key in `.env` and configure the default model in Settings.
