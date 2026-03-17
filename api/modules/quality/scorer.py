"""Translation quality scoring - rule-based checks + mock LLM evaluation."""
import re
import random

LANG_CHAR_RANGES = {
    "ja": r"[\u3040-\u30ff\u4e00-\u9fff]",
    "zh": r"[\u4e00-\u9fff]",
    "zh-TW": r"[\u4e00-\u9fff]",
    "ko": r"[\uac00-\ud7af]",
    "ar": r"[\u0600-\u06ff]",
    "he": r"[\u0590-\u05ff]",
    "hi": r"[\u0900-\u097f]",
    "th": r"[\u0e00-\u0e7f]",
    "ru": r"[\u0400-\u04ff]",
    "uk": r"[\u0400-\u04ff]",
    "bg": r"[\u0400-\u04ff]",
    "sr": r"[\u0400-\u04ff]",
    "el": r"[\u0370-\u03ff]",
    "bn": r"[\u0980-\u09ff]",
    "ta": r"[\u0b80-\u0bff]",
    "te": r"[\u0c00-\u0c7f]",
    "kn": r"[\u0c80-\u0cff]",
    "ml": r"[\u0d00-\u0d7f]",
    "gu": r"[\u0a80-\u0aff]",
    "pa": r"[\u0a00-\u0a7f]",
    "mr": r"[\u0900-\u097f]",
    "ne": r"[\u0900-\u097f]",
    "ur": r"[\u0600-\u06ff]",
    "si": r"[\u0d80-\u0dff]",
    "my": r"[\u1000-\u109f]",
}

LENGTH_RATIOS = {
    "de": (0.8, 1.6), "fr": (0.9, 1.5), "es": (0.9, 1.5),
    "ja": (0.3, 1.2), "zh": (0.3, 1.0), "ko": (0.4, 1.2),
    "ar": (0.7, 1.4), "ru": (0.8, 1.5), "th": (0.5, 1.3),
}
DEFAULT_RATIO = (0.4, 2.0)


def rule_based_score(source: str, translated: str, language: str) -> dict:
    """Run rule-based quality checks. Returns score (0-100) and list of issues."""
    issues = []
    score = 100

    if not translated or not translated.strip():
        return {"score": 0, "issues": ["Empty translation"], "checks": {}}

    checks = {}

    # 1. Placeholder preservation
    src_placeholders = set(re.findall(r"\{(\w+)\}", source))
    tgt_placeholders = set(re.findall(r"\{(\w+)\}", translated))
    if src_placeholders:
        missing = src_placeholders - tgt_placeholders
        extra = tgt_placeholders - src_placeholders
        if missing:
            issues.append(f"Missing placeholders: {', '.join(missing)}")
            score -= 20 * len(missing)
        if extra:
            issues.append(f"Extra placeholders: {', '.join(extra)}")
            score -= 10
        checks["placeholders"] = "pass" if not missing and not extra else "fail"
    else:
        checks["placeholders"] = "n/a"

    # 2. Untranslated text detection
    if translated.strip().lower() == source.strip().lower() and language not in ("en",):
        issues.append("Translation identical to source — may be untranslated")
        score -= 30
        checks["untranslated"] = "fail"
    elif translated.startswith("[") and "]" in translated[:30]:
        issues.append("Contains placeholder prefix — not a real translation")
        score -= 40
        checks["untranslated"] = "fail"
    else:
        checks["untranslated"] = "pass"

    # 3. Script validation
    char_range = LANG_CHAR_RANGES.get(language)
    if char_range:
        if re.search(char_range, translated):
            checks["script"] = "pass"
        else:
            issues.append(f"No native script characters found for {language}")
            score -= 15
            checks["script"] = "fail"
    else:
        checks["script"] = "n/a"

    # 4. Length ratio
    min_r, max_r = LENGTH_RATIOS.get(language, DEFAULT_RATIO)
    if len(source) > 3:
        ratio = len(translated) / len(source)
        if ratio < min_r:
            issues.append(f"Translation too short (ratio: {ratio:.1f})")
            score -= 10
            checks["length"] = "warn"
        elif ratio > max_r:
            issues.append(f"Translation too long (ratio: {ratio:.1f})")
            score -= 5
            checks["length"] = "warn"
        else:
            checks["length"] = "pass"
    else:
        checks["length"] = "n/a"

    # 5. Trailing/leading whitespace
    if translated != translated.strip():
        issues.append("Contains leading/trailing whitespace")
        score -= 5
        checks["whitespace"] = "warn"
    else:
        checks["whitespace"] = "pass"

    return {
        "score": max(0, min(100, score)),
        "issues": issues,
        "checks": checks,
    }


def mock_llm_score(source: str, translated: str, language: str) -> dict:
    """Mock LLM evaluation. In production, call OpenAI/Claude here."""
    rule_result = rule_based_score(source, translated, language)
    base = rule_result["score"]

    # Simulate LLM adding nuance
    llm_adjustment = random.randint(-5, 10)
    fluency = min(100, base + random.randint(0, 10))
    accuracy = min(100, base + random.randint(-5, 5))
    naturalness = min(100, base + random.randint(-3, 8))

    overall = max(0, min(100, int((fluency + accuracy + naturalness) / 3)))

    return {
        "overall_score": overall,
        "fluency": fluency,
        "accuracy": accuracy,
        "naturalness": naturalness,
        "rule_score": rule_result["score"],
        "issues": rule_result["issues"],
        "checks": rule_result["checks"],
        "method": "rule_based + mock_llm",
    }


def evaluate_translation(source: str, translated: str, language: str) -> dict:
    """Full evaluation combining rule-based + LLM scoring."""
    return mock_llm_score(source, translated, language)
