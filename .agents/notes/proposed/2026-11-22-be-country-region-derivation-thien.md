# Proposal: Tách `place` từ USGS thành quốc gia & khu vực tại Backend (T2/T6)

## Metadata
- ID: 2026-11-22-be-country-region-derivation-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: feature
- Status: approved
- Priority: medium
- Area: apps/api/src/gdmas/services/ingestion/, apps/api/src/gdmas/models/, apps/api/src/gdmas/api/routes/, contracts/
- Architecture Impact: contracts/schemas/earthquake.json, contracts/README.md §3.1, contracts/examples/earthquake_sample.json, docs/api/API.md §3.2 — payload `/api/v1/earthquakes` bổ sung 2 field optional `country`/`region` và 2 query param; docs/architecture/ERD.md (bảng `earthquake_events` thêm 2 cột qua migration mới).
- Related Docs:
  - docs/coding-rules.md
  - docs/api/API.md
  - contracts/README.md
- Related Proposals:
  - Overrides: 2026-11-21-monitoring-leaflet-map-markers-thien — chỉ riêng quyết định §4.5 "BE không có field country/region riêng, mọi phân loại suy từ place, tuyệt đối không thêm field giả vào payload". Lý do: yêu cầu 2026-11-22 của thành viên `thien` muốn chuyển việc phân tách xuống BE để phục vụ mô hình "xem toàn cầu" và lọc server-side. Các quyết định còn lại của proposal cũ (bản đồ Leaflet, SSE, contract GIS) không thay đổi. File cũ không bị sửa.
  - Overrides: 2026-11-21-header-country-clock-refresh-thien — chỉ riêng lựa chọn FE-only / "không thêm endpoint, không đụng contracts" tại §2/§5 (phương án C). Lý do như trên; phần còn lại (header, đồng hồ UTC/UTC+7, chip lọc) giữ nguyên.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
FE hiện tự suy quốc gia/khu vực bằng regex hardcoded trên chuỗi `place` (`country-clusters.ts`, `region-filter.ts`), lưu lựa chọn ở `?country=&region=`. Các proposal 2026-11-21 đã chốt đây là "lựa chọn đúng, không phải thiếu sót hợp đồng".

### Vấn đề
Người dùng yêu cầu (2026-11-22): "FE lọc dữ liệu theo quốc gia và khu vực có trên USGS nhưng BE không có. Kiểm tra tính khả thi, bổ sung vào BE nếu được, vì đây là dự án xem toàn cầu", và làm rõ: "xét tính khả thi khi phân tách từ khu vực được cung cấp từ USGS ra thành quốc gia và khu vực, nếu khả thi thì hãy thêm chức năng ở BE".

### Ảnh hưởng
FE đang là nguồn sự thật duy nhất → mỗi consumer phải tự regex, dễ lệch khi mở rộng; BE không lọc được theo quốc gia/khu vực (phải nạp nhiều trang rồi lọc client-side). Với mô hình toàn cầu, cần một nguồn phân loại tập trung tại BE.

---

## 2. Hiện trạng
- **USGS không trả field `country`/`region`** (đã kiểm chứng feed `all_day.geojson` và endpoint `detail`): chỉ có `place` (chuỗi tự do, vd. `"17 km SE of Naalehu, Hawaii"`), `net`, prefix `id`, toạ độ. Prefix `id` là **mạng lưới** (`hv`, `ak`, `nc`…), không phải quốc gia → không dùng.
- FE: `countryFromPlace()` (regex + 51 mã bang Mỹ) và `regionFromPlace()` (bỏ tiền tố khoảng cách/hướng, bỏ tên quốc gia) — fallback `"Khác"`, không bịa dữ liệu.
- BE: `parser.py:111–124` map 12 field vào `earthquake_events`; có `place` (Text, nullable) + `raw_data` (JSONB), **không có cột country/region**. Migration duy nhất `001_initial_gdmas_schema.py` (I4: không sửa).
- API `GET /earthquakes` (`routes/earthquakes.py:57–156`) có 15 query param, **không có** country/region.
- Hợp đồng `contracts/schemas/earthquake.json` có `place?`, không có country/region; schema **không** khóa `additionalProperties`.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Tách `place` → `country` + `region` tại BE bằng module thuần dùng chung cho cả 2 đường nhập (T2 ingestion `parser.py` và route `POST /sync`), không bịa dữ liệu (fallback `"Khác"`).
  2. Lưu 2 giá trị vào cột mới trong bảng `earthquake_events` qua **migration MỚI** (I4), có backfill từ `place` để dữ liệu cũ cũng có field.
  3. Trả `country`/`region` optional trong response `/earthquakes` (list + detail), giữ nguyên `place`/`raw_data`/mọi field cũ (I2).
  4. Thêm query param `country`/`region` optional cho `GET /earthquakes` để lọc server-side (không truyền → hành vi y hệt cũ).
  5. Cập nhật hợp đồng theo I3; FE ưu tiên field BE khi có, vẫn giữ helper cũ làm fallback (I2, không xoá file).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không thêm endpoint `/api/v1/countries` (đã bị loại ở proposal header).
  - Không reverse-geocode theo toạ độ (cần dịch vụ ngoài / dữ liệu ranh giới, vi phạm offline).
  - Không sửa `001_initial_gdmas_schema.py`, không xoá/sửa helper FE cũ, không đổi event names/payload SSE, không đụng `apps/web/src/**` ngoài phần ưu tiên field (có thể defer).
  - Không đụng `AGENTS.md`, `main.py`, worker T3–T5.

---

## 4. Giải pháp đề xuất
1. **Module thuần mới** `apps/api/src/gdmas/services/ingestion/geo.py`: port `COUNTRY_PATTERNS`, `US_STATE_CODES`, `derive_country(place)`, `derive_region(place, country)` từ FE sang Python (additive, không dependency mới, không mạng). Trả `"Khác"` khi không trích được; không parse prefix `id`.
2. **Ingestion & sync**: `parser.py` bổ sung 2 khoá vào dict trả về; `api/routes/earthquakes.py` (`/sync`) gán cùng 2 giá trị — cùng dùng hàm từ `geo.py` để không lệch logic.
3. **DB**: `models/earthquake.py` thêm `country`/`region` (`String(128)`, nullable) + index phục vụ lọc; **migration mới** `apps/api/alembic/versions/002_add_country_region.py` (`op.add_column` + backfill bằng SQL `UPDATE … WHERE place IS NOT NULL` với regex tương đương, chạy được trên PostgreSQL). Không đụng `001_...`.
4. **Schema/Response**: `schemas/earthquake.py` thêm `country: str | None = None`, `region: str | None = None`.
5. **Lọc server-side**: `GET /earthquakes` nhận `country`/`region` optional, áp dụng `filter(EarthquakeEvent.country == …)` / `.region == …` trước `count()`/phân trang. Tham số có default `None` → không breaking.
6. **Hợp đồng (I3)**: cập nhật `contracts/schemas/earthquake.json`, `contracts/README.md` §3.1, `contracts/examples/earthquake_sample.json`, `docs/api/API.md` §3.2.
7. **FE (additive, tuỳ chọn)**: khai báo `country?`/`region?` trong `contracts/earthquake.ts`; `country-filter.ts`/`region-filter.ts` ưu tiên `item.country ?? countryFromPlace(item.place)` (giữ fallback). Không xoá helper, không đổi chữ ký.

Tuân **I1** (derive nằm ở T2/T6, không nhúng `main.py`), **I2** (chỉ thêm field/tham số mặc định), **I3** (UTC/WGS84 giữ nguyên), **I4** (migration mới), **I5** (không mock), **I6** (không secret), **I7** (testcase + test offline).

---

## 5. Phương án đã cân nhắc
### Phương án A: FE vẫn tự derive như hiện tại
Ưu: không đụng BE/contracts. Nhược: không đáp ứng yêu cầu 2026-11-22, BE vẫn không có field, không lọc server-side. **Không chọn** (bị user override).
### Phương án B: Chỉ compute-on-read trong response, không lưu cột
Ưu: ít file, không migration. Nhược: không lọc/filter được ở SQL (phải nạp rồi lọc), giá trị tính lại mỗi request, không tận dụng index. **Không chọn**.
### Phương án C: Lưu cột qua migration mới + derive tập trung + lọc server-side
Ưu: đúng yêu cầu "xem toàn cầu", nguồn sự thật duy nhất ở BE, lọc có index, dữ liệu cũ được backfill. Nhược: đụng contracts & migration mới (đều được phép theo I3/I4), chi phí test cao hơn. **Chọn**.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | Thêm module thuần + migration + query param; không dependency mới |
| Hiệu năng | Tốt | Lọc bằng cột có index trước phân trang, thay vì nạp nhiều trang về FE lọc |
| Bảo trì / Open-Closed | Tốt | Chỉ thêm field/tham số mặc định; helper FE giữ làm fallback |
| Độ tin cậy | Trung bình | Heuristic từ `place` sai với địa danh lạ/tiếng Việt/vùng biển → fallback `"Khác"`, không bịa |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Regex không nhận diện hết quốc gia (mở rộng toàn cầu) | Trung bình | Trung bình | Bổ sung pattern additive; fallback `"Khác"`; test biên; FE giữ fallback khi field rỗng |
| Backfill migration chậm / lệch với Python | Thấp | Trung bình | Backfill bằng regex SQL tương đương + migration thuần `op.execute`; test đối chiếu với helper Python |
| Khác biệt FE/BE khi cùng suy từ `place` | Trung bình | Thấp | Port chung 1 bảng pattern; FE ưu tiên BE field; test đối chiếu output FE/BE trên cùng mẫu |
| Xung đột hợp đồng với consumer cũ | Thấp | Thấp | Field optional, schema không khóa `additionalProperties`; alias `place` giữ nguyên |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-be-country-region-derivation-thien.md` *(copy từ `_TEMPLATE.md`)*
- **Code test tự động (offline):**
  - `apps/api/tests/unit/test_ingestion_geo.py` *(mới — derive country/region, fallback, đối chiếu mẫu FE)*
  - `apps/api/tests/unit/test_ingestion_parser.py` *(bổ sung case field mới)*
  - `apps/api/tests/unit/test_earthquakes_routes.py` *(bổ sung case response field + lọc `?country=&region=`)*
- **Cách kiểm chứng:** `cd apps/api && uv run pytest tests/unit/test_ingestion_geo.py tests/unit/test_ingestion_parser.py tests/unit/test_earthquakes_routes.py -q`; `uv run pytest` (toàn bộ khi diff rộng); `uv run ruff check . && uv run ruff format --check .`; `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`; kiểm tra migration bằng `alembic upgrade head` trên DB test (offline).

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`) chỉ thị rõ trong chat 2026-11-22: "Xét tính khả thi khi phân tách từ khu vực được cung cấp từ USGS ra thành quốc gia và khu vực, nếu khả thi thì hãy thêm chức năng ở BE". Đã kiểm chứng USGS chỉ cung cấp `place` (không có field country/region trực tiếp) nhưng việc tách heuristic là khả thi → chấp thuận ghi `Overrides:` cho 2 proposal 2026-11-21 nêu trên, phạm vi giữ đúng các mục §3.
Scope of Rejection: -

---

## 10. Next Action
§9 đã Approved → chạy `build-implementation`: tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `.agents/notes/testcase/<id>.md`, rẽ nhánh (đã rẽ `feat/2026-11-22-be-country-region-thien` từ `develop` ở Phần A), code theo RULE-03 & I1–I7, validation, dừng CHECKPOINT 1.

### Revision 2026-11-23
- Theo yêu cầu người dùng: (a) chi tiết hoá tài liệu kiến trúc (`ERD.md`, `SAD.md`); (b) **tách danh mục quốc gia/khu vực thành 2 endpoint BE** `GET /api/v1/earthquakes/countries` / `/regions?country=` + `geo-catalog-api.ts`, FE dùng cho header/combo bản đồ (fallback cũ giữ nguyên — I2); (c) **backfill lịch sử `all_month` chạy một lần** qua `python -m gdmas.services.ingestion.backfill`, tái dùng `IngestionService`, không đổi feed mặc định `all_hour`, không đụng `.env` local (I6).
- Lý do (c): DB ban đầu chỉ có 1 giờ dữ liệu (7 sự kiện, toàn USA) nên danh mục chỉ 1 quốc gia; sau backfill có 102 quốc gia — khớp kỳ vọng "dự án xem toàn cầu" mà không làm thay đổi chu kỳ realtime 5 phút.
- §9 vẫn Approved (người dùng chỉ thị trực tiếp trong chat 2026-11-22/23); `Scope of Rejection` không đổi.
