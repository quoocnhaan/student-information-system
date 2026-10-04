"""Guarded OCR text correction through LM Studio."""

import asyncio

import httpx

from app.config import Settings, get_settings

CORRECTION_PROMPT_VERSION = "v1"
SYSTEM_PROMPT = (
    "Correct only OCR errors in the supplied Vietnamese document text: diacritics, "
    "broken words, misread characters, and merged or split lines. Preserve wording, "
    "numbering (Chương, Điều, Khoản, list markers), tables, and Markdown structure. "
    "Return only the corrected text."
)


async def correct_text(
    text: str, settings: Settings | None = None, client: httpx.AsyncClient | None = None
) -> str | None:
    """Return a plausible correction or None to retain the original text."""

    if not text.strip():
        return None
    settings = settings or get_settings()
    owned_client = client is None
    client = client or httpx.AsyncClient(timeout=settings.correction_timeout_seconds)
    payload = {
        "model": settings.lmstudio_chat_model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    }
    try:
        async with asyncio.timeout(settings.correction_timeout_seconds):
            response = await client.post(
                settings.lmstudio_base_url.rstrip("/") + "/chat/completions", json=payload,
            )
            response.raise_for_status()
            output = response.json()["choices"][0]["message"]["content"]
        if not isinstance(output, str):
            return None
        output = output.strip()
        if not output or not 0.8 * len(text) <= len(output) <= 1.2 * len(text):
            return None
        return output
    finally:
        if owned_client:
            await client.aclose()
