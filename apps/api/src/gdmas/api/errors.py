"""Envelope lỗi chuẩn của API (docs/api/API.md §2 và §4)."""

from typing import Any

from fastapi.responses import JSONResponse


def error_response(
    code: str,
    message: str,
    status_code: int,
    details: Any = None,
) -> JSONResponse:
    """Trả về phản hồi lỗi: {"success": false, "error": {code, message, details}}."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {"code": code, "message": message, "details": details},
        },
    )
