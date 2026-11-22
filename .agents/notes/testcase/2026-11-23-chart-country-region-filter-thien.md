# Testcase: Lọc biểu đồ/KPI theo quốc gia & khu vực

## Metadata
- ID: 2026-11-23-chart-country-region-filter-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-23-chart-country-region-filter-thien.md
- Target: apps/api/src/gdmas/api/routes/{analysis,statistics,predictions,classifications}.py, apps/web/src/services/earthquake-api.ts
- Test File: apps/api/tests/unit/test_analysis_filtered.py (+ bổ sung statistics/prediction routes), apps/web/tests/chart-region-filter.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** query param `country`/`region` mới và việc tính on-the-fly từ hàm thuần có sẵn.
- **Ràng buộc:** I2 (param optional, default path giữ nguyên), I3 (UTC/WGS84, payload không đổi), I4 (không migration), I5 (không mock thay API thật), I7 (offline, không xoá test cũ).

| TC ID | Tên | Đầu vào | Kết quả | Kết quả |
|---|---|---|---|---|
| `TC-01` | Default không đổi | Không param | Đọc snapshot/aggregate y hệt cũ | `PASS` |
| `TC-02` | Analysis lọc country | `?country=Japan` | Metrics tính từ event Japan, khác default | `PASS` |
| `TC-03` | Analysis lọc region | `?country=Japan&region=Honshu` | Thu hẹp tiếp | `PASS` |
| `TC-04` | Statistics KPI lọc | `?country=Japan` | total/avg/max/bucket lọc đúng | `PASS` |
| `TC-05` | Forecast thiếu mẫu | Quốc gia <10 ngày | Empty `insufficient_data`, không bịa | `PASS` |
| `TC-06` | FE plumbing | service gọi có param | URL chứa `country=&region=`; không truyền → không param | `PASS` |
| `TC-07` | Page dùng URL | Earthquakes/Overview/Statistics | Đổi `?country=` → hook refetch | `PASS` |

---

## 2. Lệnh & Kết quả
```bash
cd apps/api && .venv/bin/python -m pytest -q
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** 2026-11-23
- **Kết quả quan sát thật:** backend (`.venv/bin/python -m pytest -q`) **352/352 PASS** + ruff sạch; FE `pnpm test` **255/255 PASS** + `pnpm build` OK; scripts **43/43 OK**; `notes_index.py --check` OK; snapshot OpenAPI refreshed (chỉ新增 query param).
- **Runtime đối chiếu:** `/statistics/earthquakes` default `total=9460` vs `?country=Japan` `total=80`; `/analysis/temporal?country=Japan&interval=day` → `success:true`, `data_points=80`; `/predictions?country=Japan` → `success:true`, `predicted_value≈5.1` (artifact toàn cầu, có đủ ≥10 ngày).

## 3. Lỗi & Bug Logs
- none

## 4. Ghi chú kỹ thuật
- `filtered_day_counts` dùng pandas thay vì `func.timezone()` của PostgreSQL để chạy được trên SQLite trong test offline (phát hiện khi chạy test lần đầu → 500).
- `analysis-query-params.test.ts` TC-05 được cập nhật assertion theo lời gọi mới (`...geoQuery(filter)`) — vẫn giữ kiểm chứng "không gửi cửa sổ 14 ngày giả"; không test nào bị xoá/skip.
- Container bị dừng ngoài phiên (143/137) → đã `docker compose up -d` để kiểm chứng runtime; DB dev vẫn giữ dữ liệu backfill.
