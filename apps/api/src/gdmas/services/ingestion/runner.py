"""Entry point chạy độc lập trên Terminal 2 (T2 Ingestion).

Lệnh chạy: python -m gdmas.services.ingestion.runner
Chu kỳ: 5 phút/lần (300 giây)
"""

import logging
import time
from datetime import UTC, datetime

from gdmas.core.config import settings
from gdmas.services.ingestion.service import IngestionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gdmas.services.ingestion.runner")


def run() -> None:
    interval = getattr(settings, "INGESTION_INTERVAL_SECONDS", 300)
    minutes = interval // 60

    print(
        "==========================================================================",
        flush=True,
    )
    print(
        f"[GDMAS-Ingestion] Terminal 2: USGS Data Ingestion Service Active", flush=True
    )
    print(
        f"[GDMAS-Ingestion] Chu kỳ nạp tự động: {interval} giây ({minutes} phút / lần)",
        flush=True,
    )
    print(f"[GDMAS-Ingestion] USGS Feed URL: {settings.USGS_FEED_URL}", flush=True)
    print(
        "==========================================================================",
        flush=True,
    )

    service = IngestionService()

    while True:
        try:
            now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
            print(
                f"\n[GDMAS-Ingestion] [{now_str}] Bắt đầu chu kỳ quét dữ liệu USGS mới...",
                flush=True,
            )

            res = service.execute_cycle()

            if res.get("success"):
                new_cnt = res.get("new_records", 0)
                total = res.get("total_in_db", 0)
                dur = res.get("duration_seconds", 0)
                print(
                    f"[GDMAS-Ingestion] Thành công ({dur:.2f}s): +{new_cnt} sự kiện mới nạp vào CSDL. "
                    f"Tổng cộng hiện có {total} sự kiện.",
                    flush=True,
                )
            else:
                err = res.get("error", "Không rõ nguyên nhân")
                print(f"[GDMAS-Ingestion] Cảnh báo trong chu kỳ: {err}", flush=True)

            print(
                f"[GDMAS-Ingestion] Đang chờ {interval} giây ({minutes} phút) cho chu kỳ tiếp theo...\n",
                flush=True,
            )
            time.sleep(interval)

        except (KeyboardInterrupt, SystemExit):
            print(
                "\n[GDMAS-Ingestion] Tiến trình đã nhận lệnh dừng an toàn.", flush=True
            )
            break
        except Exception as e:
            print(
                f"[GDMAS-Ingestion] Ngoại lệ không mong muốn: {e}. Thử lại sau {interval} giây...",
                flush=True,
            )
            time.sleep(interval)


if __name__ == "__main__":
    run()
