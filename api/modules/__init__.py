"""Module registry - all feature modules."""
from api.modules.keys import router as keys_router
from api.modules.versions import router as versions_router
from api.modules.memory import router as memory_router
from api.modules.audit import router as audit_router
from api.modules.translate import router as translate_router
from api.modules.quality import router as quality_router
from api.modules.settings import router as settings_router


def register_modules(app):
    """Register all module routers with /api prefix."""
    app.include_router(keys_router, prefix="/api")
    app.include_router(versions_router, prefix="/api")
    app.include_router(memory_router, prefix="/api")
    app.include_router(audit_router, prefix="/api")
    app.include_router(translate_router, prefix="/api")
    app.include_router(quality_router, prefix="/api")
    app.include_router(settings_router, prefix="/api")


__all__ = [
    "register_modules",
    "keys_router",
    "versions_router",
    "memory_router",
    "audit_router",
]
