"""Test offline cho luồng cấu hình Gemini: validate key → ghi .env → sinh nội dung.

Không gọi mạng thật:.inject HTTP fake và file .env tạm qua AI_ENV_FILE (I7/I6).
"""

from __future__ import annotations

from pathlib import Path

from gdmas.api.routes import ai_settings
from gdmas.services.ai_env import mask_key, read_ai_env, upsert_ai_env
from gdmas.services.ai_gemini import (
    generate_content,
    is_gemini_model,
    validate_credentials,
)

API = "/api/v1/ai"


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {}

    def json(self) -> dict:
        return self._payload


def test_gemini_model_pattern():
    assert is_gemini_model("gemini-2.0-flash")
    assert is_gemini_model(" gemini-1.5-pro ")
    assert not is_gemini_model("gpt-4o")
    assert not is_gemini_model("gemini-2.0-flash;rm -rf /")
    assert not is_gemini_model("")


def test_validate_credentials_uses_gemini_and_handles_network_error():
    calls = []

    def ok_http(method, url, **kwargs):
        calls.append((method, url, kwargs["headers"]["x-goog-api-key"]))
        return FakeResponse(200)

    assert validate_credentials("gemini-2.0-flash", "AIza-good", http=ok_http) is True
    assert calls[0][0] == "GET"
    assert "gemini-2.0-flash" in calls[0][1]
    assert calls[0][2] == "AIza-good"

    assert (
        validate_credentials(
            "gemini-2.0-flash",
            "AIza-bad",
            http=lambda *a, **k: FakeResponse(401),
        )
        is False
    )
    assert (
        validate_credentials(
            "gemini-2.0-flash",
            "AIza-x",
            http=lambda *a, **k: (_ for _ in ()).throw(OSError("offline")),
        )
        is False
    )
    assert validate_credentials("gpt-4o", "AIza-good", http=ok_http) is False


def test_generate_content_extracts_text():
    payload = {
        "candidates": [
            {"content": {"parts": [{"text": "  Đã phân tích 12 sự kiện  "}]}}
        ]
    }
    seen = {}

    def http(method, url, **kwargs):
        seen["method"] = method
        seen["body"] = kwargs["json"]
        return FakeResponse(200, payload)

    text = generate_content(
        "gemini-2.0-flash",
        "AIza-good",
        "prompt",
        system="không bịa số",
        http=http,
    )
    assert text == "Đã phân tích 12 sự kiện"
    assert seen["method"] == "POST"
    assert seen["body"]["systemInstruction"]["parts"][0]["text"] == "không bịa số"


def test_upsert_env_preserves_other_lines(tmp_path: Path, monkeypatch):
    target = tmp_path / ".env"
    target.write_text(
        "# comment\nPOSTGRES_USER=gdmas_user\nGEMINI_MODEL=old\nKEEP=1\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("AI_ENV_FILE", str(target))

    upsert_ai_env("gemini-2.0-flash", "AIza-key")
    text = target.read_text(encoding="utf-8")

    assert "GEMINI_MODEL=gemini-2.0-flash" in text
    assert "GEMINI_API_KEY=AIza-key" in text
    assert text.count("GEMINI_MODEL=") == 1
    assert "POSTGRES_USER=gdmas_user" in text
    assert "KEEP=1" in text
    assert read_ai_env() == ("gemini-2.0-flash", "AIza-key")
    assert not (tmp_path / ".env.tmp").exists()
    assert "AIza-key" not in mask_key("AIza-key")


def test_save_credentials_validates_gemini_only(client, tmp_path, monkeypatch):
    monkeypatch.setenv("AI_ENV_FILE", str(tmp_path / ".env"))
    monkeypatch.setattr(ai_settings, "validate_credentials", lambda *a, **k: True)

    resp = client.post(f"{API}/credentials", json={"model": "gpt-4o", "api_key": "x"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    resp = client.post(
        f"{API}/credentials",
        json={"model": "gemini-2.0-flash", "api_key": "AIza-key"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["model"] == "gemini-2.0-flash"
    assert "api_key" not in resp.json()["data"]


def test_save_credentials_rejects_invalid_key_without_writing(
    client, tmp_path, monkeypatch
):
    target = tmp_path / ".env"
    monkeypatch.setenv("AI_ENV_FILE", str(target))
    monkeypatch.setattr(ai_settings, "validate_credentials", lambda *a, **k: False)

    resp = client.post(
        f"{API}/credentials",
        json={"model": "gemini-2.0-flash", "api_key": "AIza-bad"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_API_KEY"
    assert not target.exists()


def test_status_and_generate_check_browser_key(client, tmp_path, monkeypatch):
    target = tmp_path / ".env"
    target.write_text("GEMINI_MODEL=gemini-2.0-flash\nGEMINI_API_KEY=AIza-secret123\n")
    monkeypatch.setenv("AI_ENV_FILE", str(target))
    monkeypatch.setattr(
        ai_settings, "generate_content", lambda *a, **k: "Câu trả lời từ Gemini"
    )

    status = client.get(f"{API}/credentials/status").json()["data"]
    assert status["configured"] is True
    assert status["model"] == "gemini-2.0-flash"
    assert "AIza-secret123" not in status["masked_key"]

    payload = {
        "prompt": "prompt",
        "system": "không bịa số",
        "model": "gemini-2.0-flash",
        "api_key": "AIza-khac",
    }
    denied = client.post(f"{API}/generate", json=payload)
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "INVALID_API_KEY"

    ok = client.post(f"{API}/generate", json={**payload, "api_key": "AIza-secret123"})
    assert ok.status_code == 200
    assert ok.json()["data"]["text"] == "Câu trả lời từ Gemini"


def test_generate_without_config_returns_503(client, tmp_path, monkeypatch):
    monkeypatch.setenv("AI_ENV_FILE", str(tmp_path / "missing.env"))
    resp = client.post(
        f"{API}/generate",
        json={"prompt": "p", "model": "gemini-2.0-flash", "api_key": "x"},
    )
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "AI_NOT_CONFIGURED"


def test_default_env_path_works_in_docker_layout(tmp_path: Path, monkeypatch):
    """Hồi quy: /app/src/gdmas/services/ai_env.py không có parents[5] → không crash."""
    from gdmas.services.ai_env import default_env_path_for

    shallow = tmp_path / "src" / "gdmas" / "services" / "ai_env.py"
    shallow.parent.mkdir(parents=True, exist_ok=True)
    shallow.write_text("", encoding="utf-8")
    resolved = default_env_path_for(shallow, tmp_path)
    assert resolved == tmp_path / ".env"
