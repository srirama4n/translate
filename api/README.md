# Translation API (Python FastAPI)

REST API for the translation management system.

## Setup

```bash
cd api
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Environment

Create `.env` in the project root or `api/`:

```
MONGODB_URI=mongodb://localhost:27017
```

## Run

```bash
uvicorn api.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Endpoints

| Path | Description |
|------|-------------|
| `GET/POST /api/translation-keys` | List, create keys |
| `GET/PATCH/DELETE /api/translation-keys/{id}` | Get, update, delete key |
| `GET /api/translation-versions` | List versions |
| `GET /api/translation-versions/active?key_id=&language=` | Runtime: active translation |
| `GET/POST/PATCH/DELETE /api/translation-versions/{id}` | CRUD versions |
| `GET/POST/PATCH/DELETE /api/translation-memory/{id}` | CRUD memory |
| `GET/POST /api/translation-audit` | List, create audit |
