import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.parser import parse_feature, parse_features
from gdmas.services.ingestion.upsert import upsert_events

logger = logging.getLogger("gdmas.services.ingestion")

FALLBACK_FEED_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)
HTTP_TIMEOUT_SECONDS = 15.0
ERROR_MESSAGE_MAX_LEN = 200

_CREDENTIALS_RE = re.compile(r"(\w+://)[^/\s:@]+:[^/\s@]+@")
_QUERY_STRING_RE = re.compile(r"\?[^\s'\"]*")


class FeedUnavailableError(RuntimeError):
    """USGS Feed không phản hồi hợp lệ (timeout, mất mạng, HTTP lỗi, payload hỏng)."""


def summarize_error(exc: BaseException, max_len: int = ERROR_MESSAGE_MAX_LEN) -> str:
    """Rút gọn ngoại lệ thành thông báo an toàn để lưu service_runs.error_message.

    Che thông tin đăng nhập trong URL (`scheme://user:pass@`), bỏ query string và cắt độ dài.
    """
    detail = " ".join(str(exc).split())
    detail = _CREDENTIALS_RE.sub(r"\1***@", detail)
    detail = _QUERY_STRING_RE.sub("", detail)
    message = f"{type(exc).__name__}: {detail}" if detail else type(exc).__name__
    if len(message) > max_len:
        message = message[: max_len - 1] + "…"
    return message


class IngestionService:
    """
    Dịch vụ nạp dữ liệu địa chấn tự động từ USGS GeoJSON Feed (Terminal 2 - Ingestion).
    Kiểm tra hợp lệ dữ liệu, Upsert theo (source, source_event_id) và ghi nhật ký vào service_runs.
    """

    def __init__(
        self,
        feed_url: str | None = None,
        *,
        session_factory: Callable[[], Session] | None = None,
        http_transport: httpx.BaseTransport | None = None,
    ):
        self.feed_url = feed_url or settings.USGS_FEED_URL
        # Nếu feed_url là all_hour, cũng dự phòng all_day để bù đắp nếu worker từng offline
        self.fallback_url = FALLBACK_FEED_URL
        self._session_factory = session_factory or SessionLocal
        self._http_transport = http_transport

    def execute_cycle(self) -> dict[str, Any]:
        """
        Thực hiện một chu kỳ quét và nạp dữ liệu địa chấn vào PostgreSQL.
        Không ném ngoại lệ ra ngoài: lỗi được ghi vào service_runs với status FAILED.
        """
        start_time = datetime.now(UTC)
        run_record = None

        with self._session_factory() as db:
            try:
                # 1. Khởi tạo bản ghi service_runs theo dõi tác vụ
                run_record = ServiceRun(
                    service_name="ingestion",
                    started_at=start_time,
                    status="RUNNING",
                    records_processed=0,
                )
                db.add(run_record)
                db.commit()
                db.refresh(run_record)

                # 2. Tải GeoJSON (nguồn chính → fallback all_day); ném FeedUnavailableError nếu cả hai lỗi
                features = self._fetch_features()

                # 3. Kiểm tra hợp lệ rồi Upsert
                rows, skipped_invalid = parse_features(features)
                stats = upsert_events(db, rows)
                db.commit()

                # 4. Cập nhật trạng thái hoàn thành thành công
                finish_time = datetime.now(UTC)
                duration_sec = (finish_time - start_time).total_seconds()

                run_record.status = "SUCCESS"
                run_record.records_processed = stats.processed
                run_record.finished_at = finish_time
                db.commit()

                total_in_db = db.query(EarthquakeEvent).count()

                result = {
                    "success": True,
                    "new_records": stats.inserted,
                    "inserted": stats.inserted,
                    "updated": stats.updated,
                    "unchanged": stats.unchanged,
                    "skipped_invalid": skipped_invalid,
                    "total_in_db": total_in_db,
                    "duration_seconds": duration_sec,
                    "timestamp": finish_time.isoformat(),
                }
                logger.info(
                    f"[GDMAS-Ingestion] Hoàn thành chu kỳ ({duration_sec:.2f}s): "
                    f"+{stats.inserted} mới, {stats.updated} cập nhật, "
                    f"{skipped_invalid} bị loại (Tổng DB: {total_in_db})"
                )
                return result

            except Exception as e:  # noqa: BLE001 — worker không được crash; mọi lỗi ghi vào service_runs
                db.rollback()
                finish_time = datetime.now(UTC)
                error_msg = summarize_error(e)
                logger.error(
                    f"[GDMAS-Ingestion] Lỗi trong chu kỳ nạp dữ liệu: {error_msg}"
                )

                if run_record:
                    try:
                        run_record.status = "FAILED"
                        run_record.finished_at = finish_time
                        run_record.error_message = error_msg
                        db.commit()
                    except Exception:  # noqa: BLE001 — cố ghi FAILED, lỗi phụ thì rollback
                        db.rollback()

                return {
                    "success": False,
                    "error": error_msg,
                    "new_records": 0,
                    "timestamp": finish_time.isoformat(),
                }

    def _http_client(self) -> httpx.Client:
        return httpx.Client(
            timeout=HTTP_TIMEOUT_SECONDS,
            follow_redirects=True,
            transport=self._http_transport,
        )

    def _fetch_geojson_strict(self, url: str) -> list[dict[str, Any]]:
        """Tải danh sách features; ném FeedUnavailableError khi timeout, mất mạng, HTTP lỗi hoặc payload hỏng."""
        try:
            with self._http_client() as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise FeedUnavailableError(summarize_error(exc)) from exc

        features = data.get("features") if isinstance(data, dict) else None
        if not isinstance(features, list):
            raise FeedUnavailableError("Payload GeoJSON không có danh sách features")
        return features

    def _fetch_features(self) -> list[dict[str, Any]]:
        """Thử nguồn chính, rồi fallback all_day; chỉ ném lỗi khi không nguồn nào dùng được."""
        has_fallback = self.fallback_url != self.feed_url
        try:
            features = self._fetch_geojson_strict(self.feed_url)
        except FeedUnavailableError as primary_error:
            if not has_fallback:
                raise
            logger.warning(
                f"Nguồn USGS chính lỗi ({primary_error}), thử fallback all_day..."
            )
            try:
                return self._fetch_geojson_strict(self.fallback_url)
            except FeedUnavailableError as fallback_error:
                raise FeedUnavailableError(
                    f"Nguồn chính: {primary_error}; fallback: {fallback_error}"
                ) from fallback_error

        if not features and has_fallback:
            logger.info(
                "Nguồn chính không có sự kiện, thử lại với fallback URL (all_day)..."
            )
            try:
                return self._fetch_geojson_strict(self.fallback_url)
            except FeedUnavailableError as fallback_error:
                logger.warning(
                    f"Fallback all_day lỗi ({fallback_error}); dùng kết quả rỗng từ nguồn chính."
                )
        return features

    def _fetch_geojson(self, url: str) -> list[dict[str, Any]]:
        """Tải dữ liệu GeoJSON từ endpoint USGS; giữ hành vi cũ: lỗi thì trả danh sách rỗng."""
        try:
            return self._fetch_geojson_strict(url)
        except FeedUnavailableError as e:
            logger.warning(f"Không thể tải USGS Feed ({url}): {e}")
            return []

    def _save_feature_if_new(self, db: Session, feat: dict[str, Any]) -> bool:
        """Kiểm tra hợp lệ rồi Upsert một feature; trả True nếu là sự kiện mới được chèn.

        Giữ chữ ký cũ (RULE-03). Bản ghi đã tồn tại nay được cập nhật khi source_updated_at mới hơn.
        """
        row = parse_feature(feat)
        if row is None:
            return False
        return upsert_events(db, [row]).inserted == 1
