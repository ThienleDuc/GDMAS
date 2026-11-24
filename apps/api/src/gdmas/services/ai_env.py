"""Ghi cấu hình Gemini vào .env trên máy chủ — KHÔNG lưu database.

Chỉ 2 khoá GEMINI_MODEL / GEMINI_API_KEY được phép ghi; các dòng khác giữ nguyên.
Đường dẫn có thể override bằng AI_ENV_FILE (tests dùng file tạm, không đụng .env thật).
"""

from __future__ import annotations

import os
from pathlib import Path

ALLOWED_KEYS = ("GEMINI_MODEL", "GEMINI_API_KEY")


def default_env_path_for(file: Path, cwd: Path) -> Path:
    """Tìm .env gốc repo (local) hoặc cwd/.env (Docker) — KHÔNG dùng parents[cố định].

    Trước đây dùng parents[5] gây IndexError trong Docker (/app/src/gdmas/...).
    """
    for parent in file.resolve().parents:
        if (parent / "docker-compose.yml").is_file() or (
            parent / ".env.example"
        ).is_file():
            return parent / ".env"
    return cwd / ".env"


def _default_env_path() -> Path:
    return default_env_path_for(Path(__file__), Path.cwd())


def env_path() -> Path:
    override = os.getenv("AI_ENV_FILE", "").strip()
    return Path(override) if override else _default_env_path()


def read_ai_env(path: Path | None = None) -> tuple[str, str]:
    """Trả (model, key) — thiếu thì chuỗi rỗng."""
    target = path or env_path()
    values: dict[str, str] = {}
    if target.exists():
        for line in target.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, _, value = stripped.partition("=")
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values.get("GEMINI_MODEL", ""), values.get("GEMINI_API_KEY", "")


def upsert_ai_env(model: str, api_key: str, path: Path | None = None) -> Path:
    """Upsert 2 khoá, giữ nguyên mọi dòng khác. Ghi qua file tạm rồi thay thế."""
    target = path or env_path()
    updates = {"GEMINI_MODEL": model, "GEMINI_API_KEY": api_key}
    original = (
        target.read_text(encoding="utf-8").splitlines() if target.exists() else []
    )
    output: list[str] = []
    seen: set[str] = set()
    for line in original:
        matched = False
        for key, value in updates.items():
            if line.strip().startswith(f"{key}="):
                output.append(f"{key}={value}")
                seen.add(key)
                matched = True
                break
        if not matched:
            output.append(line)
    for key, value in updates.items():
        if key not in seen:
            output.append(f"{key}={value}")

    temporary = target.with_name(f"{target.name}.tmp")
    temporary.write_text("\n".join(output) + "\n", encoding="utf-8")
    temporary.replace(target)
    return target


def mask_key(key: str) -> str:
    """Che key khi trả về FE — không bao giờ gửi key đầy đủ trong response."""
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}{'*' * (len(key) - 8)}{key[-4:]}"
