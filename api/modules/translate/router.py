"""Translate API - supports multiple translation models (mock for now)."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/translate", tags=["translate"])

LANGUAGES = {
    "fr": "French", "es": "Spanish", "de": "German", "hi": "Hindi",
    "ja": "Japanese", "zh": "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)",
    "ko": "Korean", "ar": "Arabic", "pt": "Portuguese", "ru": "Russian",
    "it": "Italian", "nl": "Dutch", "sv": "Swedish", "pl": "Polish",
    "tr": "Turkish", "th": "Thai", "vi": "Vietnamese", "id": "Indonesian",
    "ms": "Malay", "tl": "Filipino", "uk": "Ukrainian", "cs": "Czech",
    "ro": "Romanian", "el": "Greek", "he": "Hebrew", "hu": "Hungarian",
    "da": "Danish", "fi": "Finnish", "no": "Norwegian", "sk": "Slovak",
    "bg": "Bulgarian", "hr": "Croatian", "sr": "Serbian", "lt": "Lithuanian",
    "lv": "Latvian", "et": "Estonian", "sl": "Slovenian", "sw": "Swahili",
    "bn": "Bengali", "ta": "Tamil", "te": "Telugu", "mr": "Marathi",
    "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi",
    "ur": "Urdu", "ne": "Nepali", "si": "Sinhala", "my": "Myanmar",
}

MODELS = {
    "mock": {"name": "Mock Translator", "description": "Built-in mock translations for common phrases"},
    "gpt-4": {"name": "GPT-4", "description": "OpenAI GPT-4 (placeholder — returns mock data)"},
    "gpt-3.5": {"name": "GPT-3.5 Turbo", "description": "OpenAI GPT-3.5 (placeholder — returns mock data)"},
    "deepl": {"name": "DeepL", "description": "DeepL Translator (placeholder — returns mock data)"},
    "google": {"name": "Google Translate", "description": "Google Cloud Translation (placeholder — returns mock data)"},
    "claude": {"name": "Claude", "description": "Anthropic Claude (placeholder — returns mock data)"},
}

MOCK_TRANSLATIONS = {
    "welcome": {
        "fr": "Bienvenue", "es": "Bienvenido", "de": "Willkommen", "hi": "स्वागत है",
        "ja": "ようこそ", "zh": "欢迎", "zh-TW": "歡迎", "ko": "환영합니다",
        "ar": "مرحبا", "pt": "Bem-vindo", "ru": "Добро пожаловать",
        "it": "Benvenuto", "nl": "Welkom", "sv": "Välkommen", "pl": "Witamy",
        "tr": "Hoş geldiniz", "th": "ยินดีต้อนรับ", "vi": "Chào mừng",
        "id": "Selamat datang", "ms": "Selamat datang", "tl": "Maligayang pagdating",
        "uk": "Ласкаво просимо", "cs": "Vítejte", "ro": "Bun venit",
        "el": "Καλώς ήρθατε", "he": "ברוכים הבאים", "hu": "Üdvözöljük",
        "da": "Velkommen", "fi": "Tervetuloa", "no": "Velkommen", "sk": "Vitajte",
        "bg": "Добре дошли", "hr": "Dobrodošli", "sr": "Добродошли",
        "lt": "Sveiki", "lv": "Laipni lūdzam", "et": "Tere tulemast",
        "sl": "Dobrodošli", "sw": "Karibu", "bn": "স্বাগতম", "ta": "வரவேற்கிறோம்",
        "te": "స్వాగతం", "mr": "स्वागत आहे", "gu": "સ્વાગત છે",
        "kn": "ಸ್ವಾಗತ", "ml": "സ്വാഗതം", "pa": "ਜੀ ਆਇਆਂ ਨੂੰ",
        "ur": "خوش آمدید", "ne": "स्वागत छ", "si": "සාදරයෙන් පිළිගනිමු",
        "my": "ကြိုဆိုပါသည်",
    },
    "login": {
        "fr": "Se connecter", "es": "Iniciar sesión", "de": "Anmelden", "hi": "लॉग इन करें",
        "ja": "ログイン", "zh": "登录", "zh-TW": "登入", "ko": "로그인",
        "ar": "تسجيل الدخول", "pt": "Entrar", "ru": "Войти",
        "it": "Accedi", "nl": "Inloggen", "sv": "Logga in", "pl": "Zaloguj się",
        "tr": "Giriş yap", "th": "เข้าสู่ระบบ", "vi": "Đăng nhập",
        "id": "Masuk", "ms": "Log masuk", "tl": "Mag-login",
        "uk": "Увійти", "cs": "Přihlásit se", "ro": "Autentificare",
        "el": "Σύνδεση", "he": "התחברות", "hu": "Bejelentkezés",
        "da": "Log ind", "fi": "Kirjaudu sisään", "no": "Logg inn", "sk": "Prihlásiť sa",
        "bg": "Влизане", "hr": "Prijava", "sr": "Пријава",
        "lt": "Prisijungti", "lv": "Pieteikties", "et": "Logi sisse",
        "sl": "Prijava", "sw": "Ingia", "bn": "লগ ইন করুন", "ta": "உள்நுழைக",
        "te": "లాగిన్", "mr": "लॉग इन करा", "gu": "લૉગ ઇન કરો",
        "kn": "ಲಾಗಿನ್", "ml": "ലോഗിൻ", "pa": "ਲੌਗ ਇਨ ਕਰੋ",
        "ur": "لاگ ان کریں", "ne": "लग इन गर्नुहोस्", "si": "ඇතුල් වන්න",
        "my": "ဝင်ရောက်ပါ",
    },
    "hello": {
        "fr": "Bonjour", "es": "Hola", "de": "Hallo", "hi": "नमस्ते",
        "ja": "こんにちは", "zh": "你好", "zh-TW": "你好", "ko": "안녕하세요",
        "ar": "مرحبا", "pt": "Olá", "ru": "Привет",
        "it": "Ciao", "nl": "Hallo", "sv": "Hej", "pl": "Cześć",
        "tr": "Merhaba", "th": "สวัสดี", "vi": "Xin chào",
        "id": "Halo", "ms": "Hai", "tl": "Kamusta",
        "uk": "Привіт", "cs": "Ahoj", "ro": "Bună",
        "el": "Γεια σου", "he": "שלום", "hu": "Helló",
        "da": "Hej", "fi": "Hei", "no": "Hei", "sk": "Ahoj",
        "bg": "Здравей", "hr": "Bok", "sr": "Здраво",
        "lt": "Sveiki", "lv": "Sveiki", "et": "Tere",
        "sl": "Živjo", "sw": "Habari", "bn": "হ্যালো", "ta": "வணக்கம்",
        "te": "హలో", "mr": "नमस्कार", "gu": "નમસ્તે",
        "kn": "ನಮಸ್ಕಾರ", "ml": "ഹലോ", "pa": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
        "ur": "ہیلو", "ne": "नमस्ते", "si": "හෙලෝ",
        "my": "မင်္ဂလာပါ",
    },
    "logout": {
        "fr": "Se déconnecter", "es": "Cerrar sesión", "de": "Abmelden", "hi": "लॉग आउट करें",
        "ja": "ログアウト", "zh": "登出", "zh-TW": "登出", "ko": "로그아웃",
        "ar": "تسجيل الخروج", "pt": "Sair", "ru": "Выйти",
        "it": "Esci", "nl": "Uitloggen", "sv": "Logga ut", "pl": "Wyloguj się",
        "tr": "Çıkış yap", "th": "ออกจากระบบ", "vi": "Đăng xuất",
        "id": "Keluar", "ms": "Log keluar", "tl": "Mag-logout",
        "uk": "Вийти", "cs": "Odhlásit se", "ro": "Deconectare",
        "el": "Αποσύνδεση", "he": "התנתקות", "hu": "Kijelentkezés",
        "da": "Log ud", "fi": "Kirjaudu ulos", "no": "Logg ut", "sk": "Odhlásiť sa",
        "bg": "Излизане", "hr": "Odjava", "sr": "Одјава",
        "lt": "Atsijungti", "lv": "Izrakstīties", "et": "Logi välja",
        "sl": "Odjava", "sw": "Ondoka", "bn": "লগ আউট করুন", "ta": "வெளியேறு",
        "te": "లాగ్ అవుట్", "mr": "लॉग आउट करा", "gu": "લૉગ આઉટ કરો",
        "kn": "ಲಾಗ್ ಔಟ್", "ml": "ലോഗൗട്ട്", "pa": "ਲੌਗ ਆਊਟ ਕਰੋ",
        "ur": "لاگ آؤٹ کریں", "ne": "लग आउट गर्नुहोस्", "si": "පිටවන්න",
        "my": "ထွက်ရန်",
    },
}


def mock_translate(text: str, model: str = "mock") -> dict:
    """Return mock translations. Real models would call external APIs here."""
    lower = text.strip().lower()
    for keyword, translations in MOCK_TRANSLATIONS.items():
        if keyword in lower:
            return translations
    result = {}
    model_label = MODELS.get(model, {}).get("name", model)
    for code in LANGUAGES:
        result[code] = f"[{LANGUAGES[code]}] {text}"
    return result


class TranslateRequest(BaseModel):
    text: str
    source_language: str = "en"
    model: str = "mock"


class TranslateResponse(BaseModel):
    source_text: str
    source_language: str
    model: str
    languages: dict
    translations: dict


class BulkTranslateRequest(BaseModel):
    items: list[str]
    source_language: str = "en"
    model: str = "mock"


class BulkTranslateItem(BaseModel):
    source_text: str
    translations: dict


class BulkTranslateResponse(BaseModel):
    languages: dict
    model: str
    results: list[BulkTranslateItem]
    total: int = 0


@router.get("/languages")
async def list_languages():
    """Return all supported languages."""
    return {"languages": LANGUAGES}


@router.get("/models")
async def list_models():
    """Return available translation models."""
    return {"models": MODELS, "default": "mock"}


@router.post("", response_model=TranslateResponse)
async def translate(payload: TranslateRequest):
    """Translate text using the specified model."""
    translations = mock_translate(payload.text, payload.model)
    return {
        "source_text": payload.text,
        "source_language": payload.source_language,
        "model": payload.model,
        "languages": LANGUAGES,
        "translations": translations,
    }


@router.post("/bulk", response_model=BulkTranslateResponse)
async def bulk_translate(payload: BulkTranslateRequest):
    """Translate multiple texts using the specified model."""
    unique_items = list(dict.fromkeys(t.strip() for t in payload.items if t.strip()))
    results = []
    for text in unique_items:
        translations = mock_translate(text, payload.model)
        results.append({"source_text": text, "translations": translations})
    return {"languages": LANGUAGES, "model": payload.model, "results": results, "total": len(results)}
