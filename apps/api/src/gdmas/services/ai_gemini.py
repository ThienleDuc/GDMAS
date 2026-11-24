"""Gateway Gemini — chỉ hỗ trợ Gemini, dùng để kiểm tra key và sinh nhận xét.

Không log key. HTTP client truyền vào để test offline 100% (I7).
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

import httpx

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL_PATTERN = re.compile(r"^gemini[-.A-Za-z0-9_]+$")

HttpFn = Callable[..., Any]


def is_gemini_model(model: str) -> bool:
    """Chỉ nhận tên mô hình Gemini — chặn mô hình OpenAI/Anthropic bị đưa vào .env."""
    return bool(GEMINI_MODEL_PATTERN.fullmatch(model.strip()))


def _headers(api_key: str) -> dict[str, str]:
    return {"x-goog-api-key": api_key, "Content-Type": "application/json"}


def validate_credentials(
    model: str, api_key: str, *, http: HttpFn | None = None
) -> bool:
    """Gemini trả 200 cho model hợp lệ + key đúng; mọi lỗi mạng đều coi là không hợp lệ."""
    if not is_gemini_model(model) or not api_key.strip():
        return False
    fn = http or httpx.request
    try:
        response = fn(
            "GET",
            f"{GEMINI_BASE}/models/{model.strip()}",
            headers=_headers(api_key.strip()),
            timeout=10,
        )
        return int(response.status_code) == 200
    except Exception:  # noqa: BLE001 — lỗi mạng/thời gian chờ đều là key không dùng được
        return False


def generate_content(
    model: str,
    api_key: str,
    prompt: str,
    *,
    system: str | None = None,
    http: HttpFn | None = None,
) -> str:
    """Gọi Gemini generateContent và trả phần text đầu tiên."""
    fn = http or httpx.request
    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
    }
    if system and system.strip():
        body["systemInstruction"] = {"parts": [{"text": system}]}
    response = fn(
        "POST",
        f"{GEMINI_BASE}/models/{model.strip()}:generateContent",
        headers=_headers(api_key.strip()),
        json=body,
        timeout=30,
    )
    if int(response.status_code) != 200:
        raise RuntimeError(f"Gemini HTTP {response.status_code}")
    payload = response.json()
    candidates = payload.get("candidates") or []
    parts = (
        (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    )
    text = "".join(
        part.get("text", "") for part in parts if isinstance(part, dict)
    ).strip()
    if not text:
        raise RuntimeError("Gemini trả nội dung rỗng")
    return text
