"""Cấu hình Gemini từ trình duyệt: validate key → ghi .env → sinh nhận xét.

Web mở không có auth: key do người dùng nhập, FE lưu browser 24h rồi gửi lên đây;
BE kiểm tra key hợp lệ với Gemini, chỉ lưu model/key vào .env (không lưu database).
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from gdmas.api.errors import error_response
from gdmas.services.ai_env import mask_key, read_ai_env, upsert_ai_env
from gdmas.services.ai_gemini import (
    generate_content,
    is_gemini_model,
    validate_credentials,
)

router = APIRouter(tags=["AI Settings"])


class CredentialsPayload(BaseModel):
    model: str = Field(min_length=1, max_length=80)
    api_key: str = Field(min_length=1, max_length=256)


class GeneratePayload(BaseModel):
    prompt: str = Field(min_length=1)
    system: str | None = None
    model: str = Field(min_length=1, max_length=80)
    api_key: str = Field(min_length=1, max_length=256)


@router.post("/ai/credentials")
def save_credentials(payload: CredentialsPayload):
    model, api_key = payload.model.strip(), payload.api_key.strip()
    if not is_gemini_model(model):
        return error_response(
            "VALIDATION_ERROR",
            "Chỉ hỗ trợ mô hình Gemini (gemini-*).",
            400,
            {"field": "model"},
        )
    if not api_key or any(char.isspace() for char in api_key):
        return error_response(
            "VALIDATION_ERROR", "API key không hợp lệ.", 400, {"field": "api_key"}
        )
    if not validate_credentials(model, api_key):
        return error_response(
            "INVALID_API_KEY", "Gemini từ chối API key hoặc mô hình này.", 401
        )
    try:
        upsert_ai_env(model, api_key)
    except OSError as exc:
        return error_response(
            "ENV_WRITE_ERROR", "Không ghi được cấu hình AI.", 500, str(exc)
        )
    return {
        "success": True,
        "data": {"model": model, "configured": True},
        "message": "Đã lưu cấu hình Gemini vào .env trên máy chủ.",
    }


@router.get("/ai/credentials/status")
def credentials_status():
    model, key = read_ai_env()
    return {
        "success": True,
        "data": {
            "configured": bool(model and key),
            "model": model or None,
            "masked_key": mask_key(key),
        },
    }


@router.post("/ai/generate")
def generate(payload: GeneratePayload):
    model, key = read_ai_env()
    if not model or not key:
        return error_response(
            "AI_NOT_CONFIGURED", "Chưa cấu hình Gemini trên máy chủ.", 503
        )
    # FE gửi lại key đang lưu trong browser → BE đối chiếu với .env trước khi gọi Gemini.
    if payload.model.strip() != model or payload.api_key.strip() != key:
        return error_response(
            "INVALID_API_KEY", "API key trình duyệt không khớp cấu hình đã lưu.", 401
        )
    try:
        text = generate_content(
            model,
            key,
            payload.prompt,
            system=payload.system,
        )
    except Exception as exc:  # noqa: BLE001 — lỗi upstream không lộ key
        return error_response(
            "AI_UPSTREAM_ERROR", "Không tạo được nội dung từ Gemini.", 502, str(exc)
        )
    return {"success": True, "data": {"text": text}}
