import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun

logger = logging.getLogger("gdmas.services.ingestion")


class IngestionService:
    """
    Dịch vụ nạp dữ liệu địa chấn tự động từ USGS GeoJSON Feed (Terminal 2 - Ingestion).
    Hỗ trợ kiểm tra trùng lặp theo source_event_id và ghi nhật ký thực thi vào service_runs.
    """

    def __init__(self, feed_url: Optional[str] = None):
        self.feed_url = feed_url or settings.USGS_FEED_URL
        # Nếu feed_url là all_hour, cũng dự phòng all_day để bù đắp nếu worker từng offline
        self.fallback_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"

    def execute_cycle(self) -> Dict[str, Any]:
        """
        Thực hiện một chu kỳ quét và nạp dữ liệu địa chấn vào PostgreSQL.
        Trả về kết quả thống kê của chu kỳ (số lượng bản ghi mới, tổng số, v.v.).
        """
        start_time = datetime.now(timezone.utc)
        run_record = None

        with SessionLocal() as db:
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

                # 2. Tải dữ liệu GeoJSON từ USGS Feed
                features = self._fetch_geojson(self.feed_url)
                if not features and self.feed_url != self.fallback_url:
                    logger.info("Thử lại với fallback URL (all_day)...")
                    features = self._fetch_geojson(self.fallback_url)

                # 3. Phân tích và lưu các sự kiện chưa tồn tại
                new_records_count = 0
                for feat in features:
                    if self._save_feature_if_new(db, feat):
                        new_records_count += 1

                db.commit()

                # 4. Cập nhật trạng thái hoàn thành thành công
                finish_time = datetime.now(timezone.utc)
                duration_sec = (finish_time - start_time).total_seconds()

                run_record.status = "SUCCESS"
                run_record.records_processed = new_records_count
                run_record.finished_at = finish_time
                db.commit()

                total_in_db = db.query(EarthquakeEvent).count()

                result = {
                    "success": True,
                    "new_records": new_records_count,
                    "total_in_db": total_in_db,
                    "duration_seconds": duration_sec,
                    "timestamp": finish_time.isoformat(),
                }
                logger.info(
                    f"[GDMAS-Ingestion] Hoàn thành chu kỳ ({duration_sec:.2f}s): "
                    f"+{new_records_count} sự kiện mới (Tổng DB: {total_in_db})"
                )
                return result

            except Exception as e:
                db.rollback()
                finish_time = datetime.now(timezone.utc)
                error_msg = str(e)
                logger.error(f"[GDMAS-Ingestion] Lỗi trong chu kỳ nạp dữ liệu: {error_msg}")

                if run_record:
                    try:
                        run_record.status = "FAILED"
                        run_record.finished_at = finish_time
                        run_record.error_message = error_msg
                        db.commit()
                    except Exception:
                        db.rollback()

                return {
                    "success": False,
                    "error": error_msg,
                    "new_records": 0,
                    "timestamp": finish_time.isoformat(),
                }

    def _fetch_geojson(self, url: str) -> List[Dict[str, Any]]:
        """Tải dữ liệu GeoJSON từ endpoint USGS với timeout và error handling an toàn."""
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("features", [])
                else:
                    logger.warning(f"USGS Feed trả về mã lỗi HTTP {resp.status_code} từ {url}")
                    return []
        except Exception as e:
            logger.warning(f"Không thể kết nối đến USGS Feed ({url}): {e}")
            return []

    def _save_feature_if_new(self, db: Session, feat: Dict[str, Any]) -> bool:
        """Kiểm tra và lưu một GeoJSON feature vào bảng earthquake_events nếu chưa có."""
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [0, 0, 0])

        event_id = feat.get("id") or props.get("code")
        if not event_id:
            return False

        mag = props.get("mag")
        if mag is None:
            return False

        # Kiểm tra trùng lặp theo source_event_id
        existing = (
            db.query(EarthquakeEvent.id)
            .filter(EarthquakeEvent.source_event_id == event_id)
            .first()
        )
        if existing:
            return False

        # Phân tích thời gian sự kiện (epoch ms)
        time_ms = props.get("time")
        event_time = (
            datetime.fromtimestamp(time_ms / 1000.0, tz=timezone.utc)
            if time_ms
            else datetime.now(timezone.utc)
        )

        updated_ms = props.get("updated")
        source_updated_at = (
            datetime.fromtimestamp(updated_ms / 1000.0, tz=timezone.utc)
            if updated_ms
            else None
        )

        longitude = float(coords[0]) if len(coords) > 0 else 0.0
        latitude = float(coords[1]) if len(coords) > 1 else 0.0
        depth_km = float(coords[2]) if len(coords) > 2 else 0.0

        new_event = EarthquakeEvent(
            source="USGS",
            source_event_id=event_id,
            event_time=event_time,
            source_updated_at=source_updated_at,
            latitude=latitude,
            longitude=longitude,
            depth_km=depth_km,
            magnitude=float(mag),
            magnitude_type=props.get("magType"),
            place=props.get("place"),
            source_url=props.get("url"),
            raw_data=feat,
        )
        db.add(new_event)
        return True

