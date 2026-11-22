# Testcase: Tách `place` USGS thành quốc gia & khu vực tại BE

## Metadata
- ID: 2026-11-22-be-country-region-derivation-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-be-country-region-derivation-thien.md
- Target: apps/api/src/gdmas/services/ingestion/geo.py, parser.py, models/earthquake.py, api/routes/earthquakes.py (list/detail/countries/regions), services/geo-catalog-api.ts
- Test File: apps/api/tests/unit/test_ingestion_geo.py, test_ingestion_backfill.py (+ bổ sung test_ingestion_parser.py, test_earthquakes_routes.py), apps/web/tests/geo-catalog-api.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `derive_country(place)`, `derive_region(place, country)` và việc chúng xuất hiện trong payload/response + bộ lọc server-side.
- **Ràng buộc:** I1 (derive ở T2/T6, không `main.py`), I2 (field/param optional, giữ helper FE), I3 (UTC/WGS84 không đổi), I4 (migration MỚI), I5 (không mock), I7 (offline 100%).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- `pytest` + unittest.mock; không gọi USGS/mạng/DB thật. Mẫu `place`: `"17 km SE of Naalehu, Hawaii"`, `"12 km NE of San Francisco, CA"`, `"Honshu, Japan"`, `"Java, Indonesia"`, `None`.

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | USA theo mã bang | Functional | `"12 km NE of San Francisco, CA"` | country `USA`, region `San Francisco` | `PASS` |
| `TC-02` | Nhật Bản | Functional | `"Honshu, Japan"` | `Japan`, `Honshu` | `PASS` |
| `TC-03` | Indonesia | Functional | `"Java, Indonesia"` | `Indonesia`, `Java` | `PASS` |
| `TC-04` | Hawaii → USA | Functional | `"17 km SE of Naalehu, Hawaii"` | `USA`, region `Naalehu` | `PASS` |
| `TC-05` | Null / lạ | Resilience | `None`, `""`, `"South Sandwich Islands region"` | `"Khác"` / đoạn cuối, không raise, không bịa | `PASS` |
| `TC-09` | Tên bang Mỹ đầy đủ | Regression | `"10 km W of Nashville, Tennessee"` | `USA`, `Nashville` (BE & FE cùng nhãn) | `PASS` |
| `TC-10` | Danh mục quốc gia | Functional | `GET /earthquakes/countries` | `data:[{country,count}]` nhóm/giảm dần, null bị loại, rỗng → `[]` | `PASS` |
| `TC-11` | Danh mục khu vực | Functional | `GET /earthquakes/regions?country=USA` | Chỉ trả khu vực của quốc gia; không truyền → tất cả | `PASS` |
| `TC-12` | FE registry service | Functional | `getCountryCatalog` / `getRegionCatalog` | Gọi đúng path, mã hoá `country`, `all` → không query | `PASS` |
| `TC-13` | Backfill all_month | Functional | `run_backfill` + MockTransport | Gọi feed tháng, country/region được derive, không mạng thật | `PASS` |
| `TC-14` | Backfill lỗi | Resilience | transport ném ConnectError | `success: false`, không gọi mạng thật | `PASS` |
| `TC-15` | Mã MX → Mexico | Regression | `"20 km SW of Ensenada, MX"` | `Mexico` / `Ensenada` (BE & FE) | `PASS` |
| `TC-06` | Parser/sync dùng chung | Functional | `parse_feature` + sync mapping | dict có `country`/`region`, không mất field cũ | `PASS` |
| `TC-07` | Response & lọc | Functional | `GET /earthquakes?country=Japan&region=Honshu` | Chỉ trả event khớp; không truyền → y hệt cũ | `PASS` |
| `TC-08` | FE ưu tiên field BE | Regression | helper FE với item có `country` | Dùng `item.country`, fallback cũ vẫn chạy | `PASS` |

---

## 3. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run pytest tests/unit/test_ingestion_geo.py tests/unit/test_ingestion_parser.py tests/unit/test_earthquakes_routes.py -q
cd apps/api && uv run pytest
cd apps/api && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm test && pnpm build
```
- **Ngày chạy cuối:** 2026-11-22
- **Kết quả quan sát thật:** toàn bộ backend (`.venv/bin/python -m pytest -q`): **347/347 PASS**; `ruff check`/`ruff format --check`: sạch; FE `pnpm test`: **245/245 PASS**, `pnpm build`: OK; `python3 -m unittest discover -s scripts/tests`: **43/43 OK**; `alembic heads` → `002_add_country_region (head)`; `notes_index.py --check`: OK.
- **Snapshot guard:** `apps/api/tests/fixtures/quality_contracts.json` được refresh đúng 3 phần thay đổi có chủ đích (`openapi.paths["/api/v1/earthquakes"]`, `openapi.components.schemas.EarthquakeResponse`, `orm["earthquake_events"]`); không test nào bị xoá/skip. Migration `001_` giữ nguyên hash.
- **Kiểm chứng runtime (sau khi áp migration):** DB dev chuyển từ `001_` → `002_add_country_region`, 2 cột có sẵn; 22 dòng cũ được re-derive bằng helper mới (Tennessee/Texas → USA); `GET /api/v1/earthquakes?country=USA` trả `200` với `country/region`; SSE qua Vite proxy trả `200 text/event-stream`; các lỗi 500/`interrupted` đã hết.
- **Kiểm chứng catalog runtime:** trước backfill `countries` chỉ 1 mục (USA). Chạy `python -m gdmas.services.ingestion.backfill` (feed `all_month`) → +9.427 inserted, tổng 9.453 sự kiện; `countries` giờ **102 quốc gia** (USA 8.131, Vanuatu 231, Puerto Rico 117, Indonesia/Japan 80, Mexico 87 sau khi gộp `MX`…); `regions?country=Japan` → 43 khu vực (`Bonin Islands:12`, `Hasaki:6`…). FE dùng catalog cho header + combo bản đồ, fallback `/clusters` + helper cũ.

---

## 4. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none
