#!/usr/bin/env python3
"""Seed 100 keys with translations into MongoDB."""
import asyncio
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "translate")
u = urlparse(MONGODB_URI)
DB_NAME = (u.path or "/").lstrip("/").split("?")[0] or DATABASE_NAME
NOW = datetime.now(timezone.utc)

TEXTS = [
    "Welcome", "Login", "Logout", "Sign Up", "Forgot Password",
    "Home", "Dashboard", "Settings", "Profile", "Notifications",
    "Search", "Help", "About", "Contact Us", "Privacy Policy",
    "Terms of Service", "Cancel", "Confirm", "Submit", "Save",
    "Delete", "Edit", "Update", "Create", "Back",
    "Next", "Previous", "Loading", "Error", "Success",
    "Warning", "Info", "Close", "Open", "Refresh",
    "Download", "Upload", "Share", "Copy", "Paste",
    "Send", "Receive", "Accept", "Decline", "Approve",
    "Reject", "Pending", "Active", "Inactive", "Archived",
    "Your account has been created", "Please verify your email",
    "Password reset link sent", "Session expired, please login again",
    "Are you sure you want to delete?", "Changes saved successfully",
    "Unable to process your request", "Network error, please try again",
    "File uploaded successfully", "Invalid file format",
    "Maximum file size exceeded", "No results found",
    "Showing {count} results", "Page {current} of {total}",
    "Sort by date", "Sort by name", "Filter", "Clear all filters",
    "Select all", "Deselect all", "Export", "Import",
    "Print", "Preview", "Fullscreen", "Exit fullscreen",
    "Dark mode", "Light mode", "Language", "Currency",
    "Time zone", "Date format", "Notifications enabled",
    "Notifications disabled", "Two-factor authentication",
    "Change password", "Update email", "Delete account",
    "Account settings", "Payment methods", "Billing history",
    "Subscription plan", "Free trial", "Upgrade now",
    "Contact support", "Report a bug", "Feature request",
    "Rate this app", "Version {version}", "What's new",
    "Getting started", "Quick tour", "Documentation",
    "API reference", "Release notes", "System status",
    "Maintenance mode", "Coming soon", "Beta",
    "New", "Popular", "Trending", "Recommended",
    "Your balance is {amount}", "Transfer {amount} to {recipient}",
    "Transaction complete", "Insufficient funds",
    "Daily limit reached", "Card ending in {last4}",
]

FR = {
    "Welcome": "Bienvenue", "Login": "Se connecter", "Logout": "Se déconnecter",
    "Sign Up": "S'inscrire", "Forgot Password": "Mot de passe oublié",
    "Home": "Accueil", "Dashboard": "Tableau de bord", "Settings": "Paramètres",
    "Profile": "Profil", "Notifications": "Notifications", "Search": "Rechercher",
    "Help": "Aide", "About": "À propos", "Contact Us": "Contactez-nous",
    "Cancel": "Annuler", "Confirm": "Confirmer", "Submit": "Soumettre",
    "Save": "Enregistrer", "Delete": "Supprimer", "Edit": "Modifier",
    "Back": "Retour", "Next": "Suivant", "Loading": "Chargement",
    "Error": "Erreur", "Success": "Succès", "Close": "Fermer",
}

ES = {
    "Welcome": "Bienvenido", "Login": "Iniciar sesión", "Logout": "Cerrar sesión",
    "Sign Up": "Registrarse", "Forgot Password": "Olvidé mi contraseña",
    "Home": "Inicio", "Dashboard": "Panel", "Settings": "Configuración",
    "Profile": "Perfil", "Notifications": "Notificaciones", "Search": "Buscar",
    "Help": "Ayuda", "About": "Acerca de", "Contact Us": "Contáctenos",
    "Cancel": "Cancelar", "Confirm": "Confirmar", "Submit": "Enviar",
    "Save": "Guardar", "Delete": "Eliminar", "Edit": "Editar",
    "Back": "Atrás", "Next": "Siguiente", "Loading": "Cargando",
    "Error": "Error", "Success": "Éxito", "Close": "Cerrar",
}

DE = {
    "Welcome": "Willkommen", "Login": "Anmelden", "Logout": "Abmelden",
    "Sign Up": "Registrieren", "Forgot Password": "Passwort vergessen",
    "Home": "Startseite", "Dashboard": "Dashboard", "Settings": "Einstellungen",
    "Profile": "Profil", "Notifications": "Benachrichtigungen", "Search": "Suchen",
    "Help": "Hilfe", "About": "Über", "Contact Us": "Kontakt",
    "Cancel": "Abbrechen", "Confirm": "Bestätigen", "Submit": "Absenden",
    "Save": "Speichern", "Delete": "Löschen", "Edit": "Bearbeiten",
    "Back": "Zurück", "Next": "Weiter", "Loading": "Laden",
    "Error": "Fehler", "Success": "Erfolg", "Close": "Schließen",
}


def slugify(text):
    import re
    return re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')[:60]


async def seed():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    print(f"Seeding 100 keys into {DB_NAME}...")

    keys_docs = []
    version_docs = []

    for text in TEXTS:
        key_id = slugify(text)
        keys_docs.append({
            "_id": key_id,
            "source_language": "en",
            "source_text": text,
            "product": "app",
            "domain": "general",
            "screen": "general",
            "component": "text",
            "content_type": "text",
            "placeholders": [],
            "description": "",
            "tags": [],
            "status": "active",
            "translation_status": {"total_languages": 3, "completed": 3, "missing_languages": []},
            "created_by": "seed",
            "created_at": NOW,
            "updated_at": NOW,
        })

        for lang, lookup in [("fr", FR), ("es", ES), ("de", DE)]:
            translated = lookup.get(text, f"[{lang.upper()}] {text}")
            version_docs.append({
                "key_id": key_id,
                "language": lang,
                "version": 1,
                "text": translated,
                "status": "active",
                "source": "human",
                "model": None,
                "review_status": "approved",
                "placeholders_validated": True,
                "quality_score": 0.95,
                "created_by": "seed",
                "created_at": NOW,
                "approved_by": "seed",
                "approved_at": NOW,
            })

    inserted_keys = 0
    for doc in keys_docs:
        try:
            await db.translation_keys.insert_one(doc)
            inserted_keys += 1
        except Exception:
            await db.translation_keys.find_one_and_update(
                {"_id": doc["_id"]}, {"$set": {"updated_at": NOW}})
            inserted_keys += 1

    inserted_versions = 0
    for doc in version_docs:
        existing = await db.translation_versions.find_one({
            "key_id": doc["key_id"], "language": doc["language"], "status": "active"
        })
        if not existing:
            await db.translation_versions.insert_one(doc)
            inserted_versions += 1

    client.close()
    print(f"Done! {inserted_keys} keys, {inserted_versions} new translations.")


if __name__ == "__main__":
    asyncio.run(seed())
