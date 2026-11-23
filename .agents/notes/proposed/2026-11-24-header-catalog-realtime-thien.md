<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Combobox quốc gia/khu vực header tải realtime từ BE qua SSE

## Metadata
- ID: 2026-11-24-header-catalog-realtime-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: feature
- Status: approved
- Priority: medium
- Area: `apps/api/src/gdmas/services/catalog.py` (mới), `apps/api/src/gdmas/realtime/sse.py`, `apps/api/src/gdmas/api/routes/earthquakes.py`, `apps/web/src/layouts/`, `apps/web/tests/`
- Architecture Impact: none   <!-- SSE `data` là object tự do theo contract; không đổi field/endpoint shape -->
- Related Docs:
  - docs/api/API.md
  - contracts/schemas/sse-event.json
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-header-country-clock-refresh-thien.md   (*giữ URL `?country=&region=` làm nguồn sự thật & fallback `/clusters`*)
  - .agents/notes/proposed/2026-11-24-monitoring-region-dedupe-thien.md   (*dùng chung khoá dedupe*)
  - .agents/notes/proposed/2026-11-24-overview-month-window-layout-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`GlobalCountryFilter` gọi `GET /api/v1/earthquakes/countries` **1 lần lúc mount** (`useEffect([])`), fallback `/clusters`.
`GlobalRegionFilter` gọi `GET /api/v1/earthquakes/regions?country=` **khi đổi country** rồi đứng yên. Trong khi BE có SSE
`ingestion_cycle_completed` mỗi 5 phút với `total_events`, `new_events` — nhưng **không có danh mục quốc gia/khu vực**.

### Vấn đề
Sau khi dữ liệu mới được ingest, combobox header vẫn hiện danh sách/số đếm cũ; người dùng muốn **BE xử lý và đẩy sang FE**
để combobox tải theo dữ liệu realtime (kể cả khi `database_cleared`).

### Ảnh hưởng
Lọc quốc gia/khu vực dùng số liệu cũ → chọn sai khu vực, mất nhất quán với bảng/bản đồ.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `GlobalCountryFilter.tsx:23-55` | Fetch catalog 1 lần; không có refresh trigger |
| `GlobalRegionFilter.tsx:24-42` | Fetch theo `country`; không refresh khi SSE |
| `sse.py:304-314` | `ingestion_cycle_completed` payload có `total_events`/`new_events`, thiếu catalog |
| `earthquakes.py:259-293` | Route `/countries` tự query group-by (chưa có service dùng chung) |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. BE: tạo service thuần dùng chung `country_counts(db)`, `region_counts(db, country)`; route `/countries`, `/regions` và SSE cùng dùng.
  2. SSE: **mỗi 5 phút** (đúng chu kỳ `ingestion_cycle_completed`) tính catalog **ở luồng/phần việc riêng** (`asyncio.to_thread`), so sánh với snapshot trước đó; **chỉ đính `catalog: { countries, regions }` vào packet khi có khác biệt**, còn không đổi thì **giữ nguyên packet (không gửi catalog)**. `database_cleared` luôn gửi catalog rỗng. FE chỉ update options khi có field `catalog`; thiếu field → giữ nguyên.
  3. FE: `DashboardLayout` truyền `sseData` xuống `HeaderActions` → 2 combobox; giữ fetch lần đầu làm fallback, giữ URL làm nguồn sự thật, vẫn đổi/reset được.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi schema/endpoint shape, contract field, migration, worker, SSE protocol tên event.
  - Không đổi logic lọc dữ liệu, URL `?country=&region=`, combobox UI/CSS.
  - Không xoá helper/props cũ (I2), không xoá test đang pass (I7).
  - Không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm service/hàm/props optional, giữ chữ ký route & component. BE (I1), UTC/WGS84 không đổi (I3), không mock (I5), test offline (I7).

### 4.1. BE service dùng chung
- Tệp mới `apps/api/src/gdmas/services/catalog.py`:
  - `country_counts(db) -> list[dict]` — group by `EarthquakeEvent.country`, skip `NULL`/rỗng, sort count desc + name asc.
  - `region_counts(db, country: str | None = None) -> list[dict]` — group by `EarthquakeEvent.region`, optional lọc country, cùng dedupe casefold/trim như route hiện tại.
- Route `/earthquakes/countries`, `/earthquakes/regions`: gọi service (giữ response model & signature cũ).
- `sse.py`: trong nhánh `ingestion_cycle_completed` (chu kỳ 5 phút), gọi `await asyncio.to_thread(_catalog_snapshot)` — mở `SessionLocal()` mới trong worker thread, lấy 2 danh sách trên, trả dict + hash ổn định (`json.dumps(..., sort_keys=True)` → sha256).
  - So với biến module `_last_catalog_hash`: **khác** → đính `catalog` vào payload và cập nhật hash; **bằng nhau** → bỏ qua field `catalog` (packet vẫn phát bình thường), FE giữ nguyên options.
  - `database_cleared` → reset hash + gửi `catalog: {"countries": [], "regions": []}`.
  - `try/except SQLAlchemyError` → không đính catalog, không làm crash SSE.

### 4.2. FE tiêu thụ SSE
- `DashboardLayout.tsx`: `HeaderActions ... sseData={sse.data}`.
- `HeaderActions.tsx`: prop optional `sseData?: SSEEventPayload | null`, truyền tiếp cho 2 filter.
- `GlobalCountryFilter.tsx` / `GlobalRegionFilter.tsx`: prop optional `catalog?: {countries, regions}`; `useEffect` chỉ chạy khi `catalog` **tồn tại và khác reference trước đó** → map sang options, abort fetch cũ; **catalog `undefined` (không đổi) → giữ nguyên options hiện tại**, không fetch lại. Lần đầu vẫn fetch fallback.
- `header-data.ts`: helper thuần `countryOptionsFromCatalog`, `regionOptionsFromCatalog` (đã có) — dùng cùng khoá normalize (trim + casefold), gộp count.

### 4.3. Test (đồng thời khi §9 Approved — I7)
- BE: test `country_counts`/`region_counts` với SQLite fixture (2 quốc gia, 3 biến thể region → dedupe); test SSE: lần đầu có `catalog`, lần sau cùng dữ liệu → **không có field catalog**, đổi dữ liệu → có lại, `database_cleared` → rỗng.
- FE: bổ sung `header-region-filter.test.ts`/`header-global.test.ts` — filter nhận catalog prop, options đổi theo SSE; giữ test cũ.
- Lệnh: BE `uv run python -m pytest -q` + ruff; FE `pnpm build && pnpm test`; `notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: FE poll `/countries` + `/regions` mỗi 5 phút
Ưu: không đụng BE. Nhược: thêm request, không đúng yêu cầu "xử lý ở BE và đẩy lên FE". **Không chọn.**

### B (chọn): BE tính catalog ngoài luồng, so sánh hash, chỉ đẩy khi khác
Ưu: realtime đúng chu kỳ 5 phút, không block event loop, không gửi lại payload thừa khi dữ liệu không đổi, FE không fetch thừa. Nhược: payload SSE tăng nhẹ khi có thay đổi. **Chọn.**

### C: Gửi `catalog_version` rồi FE refetch
Ưu: payload nhỏ. Nhược: vẫn thêm request và logic FE phức tạp hơn. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 service BE + 3 file FE + test 2 phía |
| Hiệu năng | Tốt hơn | Bỏ 2 fetch định kỳ; SSE đã có sẵn |
| Bảo trì / Open-Closed | Tốt | Giữ route/props cũ, thêm service & prop optional |
| Độ tin cậy | Tốt | Catalog luôn đi cùng chu kỳ ingest; DB lỗi → rỗng, không crash |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Payload SSE tăng / gửi thừa | Thấp | Thấp | Chỉ gửi `country`/`region`/`count`; so sánh hash — khác mới đính catalog |
| DB query block event loop | Trung bình | Trung bình | `asyncio.to_thread` + SessionLocal riêng; timeout/try-except |
| DB lỗi khi dựng catalog | Trung bình | Trung bình | try/except → catalog rỗng, SSE vẫn phát |
| Contract guard test (quality_contracts) | Cao | Thấp | Cập nhật snapshot sau khi đổi payload (đã có tiền lệ) |
| Dirty tree / nhánh mới | Thấp | Thấp | Working tree hiện sạch; rẽ nhánh bình thường |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-header-catalog-realtime-thien.md`
- **Code test offline:** BE `apps/api/tests/unit/test_catalog_sse.py` (mới) + FE `apps/web/tests/header-region-filter.test.ts` bổ sung.
- **Cách kiểm chứng:** BE pytest + ruff; FE build + test; tay: thêm sự kiện → chu kỳ 5 phút → SSE có `catalog` → combobox đổi; chu kỳ kế tiếp không đổi dữ liệu → packet không có `catalog` → combobox giữ nguyên; `database_cleared` → combobox rỗng.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" trong chat 2026-11-24, kèm yêu cầu bổ sung: mỗi 5 phút tính catalog ở ngoài luồng (`asyncio.to_thread`), so sánh hash, chỉ đẩy `catalog` lên FE khi có khác biệt; không đổi thì giữ nguyên. Duyệt toàn bộ §4 (service BE, SSE diff-push, FE consume có điều kiện, test 2 phía). Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
Chờ §9. Sau `Approved`: rẽ nhánh `fix/2026-11-24-header-catalog-realtime-thien`, sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, implement BE+FE, test, dừng **CHECKPOINT 1**.
