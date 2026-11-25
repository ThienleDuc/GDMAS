# Testcase: Sync endpoint đọc USGS feed từ config

## Metadata
- ID: 2026-11-22-sync-feed-env-config-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/api/src/gdmas/api/routes/earthquakes.py`
- Test File: `apps/api/tests/unit/test_sync_feed_config.py`
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Chứng minh `POST /api/v1/earthquakes/sync` gọi URL lấy từ `settings.USGS_FEED_URL`.
- I7: offline 100%, mock httpx; I2: giữ alias hằng số cũ.

---

## 2. Fixtures
- `settings.USGS_FEED_URL` monkeypatch thành `https://example.test/custom.geojson`.
- Mock `httpx.Client` trả `{"features": []}` → response `SyncResponse` với `synced_count=0`.

---

## 3. Ma trận
| TC | Tên | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|
| TC-01 | Dùng config URL | settings = custom | URL được gọi = custom | PASS |
| TC-02 | Không dùng hardcode | settings = custom | URL không phải `.../all_day.geojson` | PASS |
| TC-03 | Envelope giữ nguyên | features rỗng | `{success:true, synced_count:0, source:"USGS"}` | PASS |
| TC-04 | Alias tương thích | import module | hằng số `USGS_FEED_URL` vẫn tồn tại | PASS |
| TC-05 | Hồi quy 318 test | full pytest | 0 fail | PASS |

---

## 4. Lệnh & Kết quả
```bash
cd apps/api && uv run pytest tests/unit/test_sync_feed_config.py -q && uv run pytest -q
```
- Ngày chạy: 2026-11-22
- Kết quả: 2026-11-22 — `test_sync_feed_config.py` 4/4 pass; full `uv run pytest -q` 322 pass; `ruff check/format --check` OK.

---

## 5. Bugs
- none
