"""Tải dữ liệu động đất lịch sử từ USGS (ComCat) để huấn luyện mô hình FEAT-05.

Cách chạy (từ thư mục apps/api):
    uv run python ../../scripts/download_usgs_history.py --days 730

- Mỗi đoạn tải xong được lưu riêng vào data/usgs_chunks/. Nếu bị đứt mạng,
  chạy lại đúng lệnh cũ: các đoạn đã có sẽ được bỏ qua.
- Kết quả cuối cùng: data/usgs_history.csv. KHÔNG git add thư mục data/.
"""

import argparse
import csv
import io
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
FIELDS = ["time", "latitude", "longitude", "depth", "mag", "magType", "place", "type"]
HEADERS = {"User-Agent": "Mozilla/5.0 (GDMAS student project)"}
RETRIES = 6


def fetch_chunk(client: httpx.Client, start: datetime, end: datetime) -> str:
    params = {
        "format": "csv",
        "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "orderby": "time-asc",
    }
    for attempt in range(1, RETRIES + 1):
        try:
            r = client.get(URL, params=params)
            r.raise_for_status()
            return r.text
        except httpx.HTTPError as exc:
            wait = 5 * attempt
            print(f"  lỗi lần {attempt}/{RETRIES}: {exc} -> chờ {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Không tải được đoạn {start:%Y-%m-%d} -> {end:%Y-%m-%d}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=730)
    parser.add_argument("--chunk-days", type=int, default=5)
    parser.add_argument("--out", default="data/usgs_history.csv")
    args = parser.parse_args()

    end_all = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start_all = end_all - timedelta(days=args.days)

    out_path = Path(args.out)
    chunk_dir = out_path.parent / "usgs_chunks"
    chunk_dir.mkdir(parents=True, exist_ok=True)

    timeout = httpx.Timeout(180, connect=30)
    with httpx.Client(headers=HEADERS, timeout=timeout, http2=False) as client:
        cur = start_all
        while cur < end_all:
            nxt = min(cur + timedelta(days=args.chunk_days), end_all)
            chunk_file = chunk_dir / f"{cur:%Y-%m-%d}.csv"
            if chunk_file.exists():
                print(f"{cur:%Y-%m-%d}: đã có, bỏ qua")
            else:
                text = fetch_chunk(client, cur, nxt)
                chunk_file.write_text(text, encoding="utf-8")
                n = max(text.count("\n") - 1, 0)
                print(f"{cur:%Y-%m-%d} -> {nxt:%Y-%m-%d}: {n} sự kiện")
                time.sleep(1)
            cur = nxt

    # Ghép các đoạn thành một file
    total = 0
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        for cf in sorted(chunk_dir.glob("*.csv")):
            rows = list(csv.DictReader(io.StringIO(cf.read_text(encoding="utf-8"))))
            writer.writerows(rows)
            total += len(rows)
    print(f"Xong. Đã lưu {total} sự kiện vào {out_path.resolve()}")


if __name__ == "__main__":
    main()
