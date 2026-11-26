"""Ngoại lệ dùng chung cho các luồng dự báo."""


class InsufficientDataError(RuntimeError):
    """Không đủ dữ liệu thực tế để dự báo."""
