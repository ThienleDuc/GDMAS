<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Loại bỏ khu vực trùng lặp trong danh sách — chuẩn hóa ở BE, FE dùng lại

## Metadata
- ID: 2026-11-24-monitoring-region-dedupe-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/api/src/gdmas/api/routes/earthquakes.py`, `apps/web/src/components/map/`, `apps/web/src/features/monitoring/`, `apps/web/src/layouts/header/`
- Architecture Impact: none   <!-- FE/FE-only + BE route logic; không đổi contract/schema/payload shape -->
- Related Docs:
  - docs/api/API.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-23-monitoring-region-map-thien.md   <!-- - Overrides: quyết định "không đụng BE, gom khu vực ở FE" — người dùng nay yêu cầu đưa logic lên BE -->
  - .agents/notes/proposed/2026-11-22-be-country-region-derivation-thien.md
  - .agents/notes/proposed/2026-11-23-earthquakes-filter-header-controls-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
BE `/api/v1/earthquakes/regions` nhóm theo **chuỗi `EarthquakeEvent.region` thô**
(`group_by(EarthquakeEvent.region)`). `derive_region` trong `geo.py` suy từ `place` USGS; các batch
ingestion khác nhau có thể tạo ra nhiều biến thể cùng một khu vực (khác hoa thường, dấu cách, đoạn quốc gia ở cuối).

### Vấn đề
Danh sách khu vực (panel "Khu vực giám sát" trên `/monitoring` và combobox khu vực dùng chung trên header)
hiện **lặp lại cùng một khu vực** — mỗi biến thể thành một dòng riêng. FE hiện chỉ dedupe theo
`country\0region` (`region-catalog-view.ts`) hoặc theo `trim()` (`regionOptionsFromCatalog`) → không đủ.

### Ảnh hưởng
Người dùng chọn cùng một khu vực nhiều lần, số liệu bị chia nhỏ giữa các dòng trùng → đọc sai.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `apps/api/src/gdmas/api/routes/earthquakes.py:296-339` | `group_by(EarthquakeEvent.region)` — trả từng biến thể, không normalize |
| `apps/api/src/gdmas/services/ingestion/geo.py:185-207` | `derive_region` trả text sau trim/prefix — không casefold, không gộp biến thể |
| `apps/web/src/layouts/header/header-data.ts:36` | `regionOptionsFromCatalog` dedupe theo `region.trim()` — chưa casefold |
| `apps/web/src/features/monitoring/region-catalog-view.ts:20-90` | `rowKey = country\0region` — cùng tên ở 2 quốc gia vẫn 2 dòng |
| `apps/web/src/components/map/MapRegionPanel.tsx:28-34` | `extraRegions` lọc theo so sánh tên chính xác; không dedupe danh sách |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. BE trả danh mục khu vực **mỗi khu vực đúng 1 dòng**: normalize khoá (trim + casefold), gộp `count`, tính lại `avg_magnitude` có trọng số, giữ `max_magnitude`; nhãn đại diện là biến thể phổ biến nhất (hoặc alphabetically nhỏ nhất khi bằng nhau).
  2. FE **dùng lại** danh sách đã dedupe từ BE và có lớp dedupe phòng thủ theo cùng khoá normalize (không tạo ra bản trùng mới).
  3. Giữ nguyên khả năng lọc `?country=&region=` và payload shape (`RegionCount`).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi `derive_region`/artifact ingestion (chỉ normalize khi trả catalog).
  - Không đổi contract/schema/migration/SSE/worker; không đổi Dark Mode/6 Patterns.
  - Không xoá helper FE cũ (`region-clusters.ts`, `regionOptionsFromCatalog`) — I2.
  - Không commit/push/merge ở proposal này; không đụng working tree chưa commit của các task trước.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm hàm thuần, giữ chữ ký route/hàm FE. BE T6 route (I1), payload không đổi (I3), không migration (I4), không mock (I5), test offline SQLite (I7).

### 4.1. BE — normalize & gộp trong route `/regions`
- Hàm thuần mới (trong `earthquakes.py` hoặc `services/analysis/filtered.py` tuỳ nơi đặt cho gọn):
  `merge_region_rows(rows: Iterable[tuple[region, count, avg, max]]) -> list[RegionCount]`:
  - khoá = `region.strip().casefold()`;
  - gộp `count`, `sum_mag = avg*count`, `max_mag = max(max)`;
  - nhãn đại diện: biến thể có `count` lớn nhất, tie → `min()` theo thứ tự từ điển;
  - sort lại theo `count` giảm rồi nhãn tăng (giữ thứ tự cũ).
- Route gọi hàm này trên `rows` thay vì map trực tiếp. `country`/`start_time`/`end_time` giữ nguyên.
- Không đổi response model `RegionListResponse`.

### 4.2. FE — tiêu thụ kết quả BE
- `header-data.ts:regionOptionsFromCatalog`: đổi khoá dedupe thành `region.trim().casefold()`, gộp `count` (tránh mất số nếu BE cũ trả trùng).
- `region-catalog-view.ts`: thêm hàm thuần `regionKey(name) = name.trim().casefold()`; `rowKey`/`mergeRegionRows`/`buildMonitoringRegionRows` dùng khoá mới → cùng tên khu vực gộp thành 1 dòng (cộng `eventCount`, avg có trọng số).
- `MapRegionPanel.tsx`: dedupe `regions` prop và `extraRegions` theo `regionKey` trước khi render; `visibleClusters` đã gộp ở bước trên.
- Không đổi UI/layout CSS.

### 4.3. Test (đồng thời khi §9 Approved — I7)
- BE: bổ sung `apps/api/tests/unit/test_earthquakes_routes.py` — 2 event `"Honshu"`/`" honshu "`/`"HONSHU"` → `/regions` trả **1** dòng, count gộp, avg đúng, max đúng; vẫn lọc theo country.
- FE: bổ sung `apps/web/tests/header-global.test.ts` + `monitoring-region-map.test.ts` — dedupe casefold; `MapRegionPanel` không render trùng.
- Lệnh: `cd apps/api && uv run python -m pytest tests/unit/test_earthquakes_routes.py`; `cd apps/web && pnpm build && pnpm test`; `notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Chỉ dedupe ở FE (như proposal `2026-11-23-monitoring-region-map-thien`)
Ưu: không đụng BE. Nhược: mọi consumer phải tự dedupe, API vẫn trả trùng — người dùng yêu cầu đưa lên BE. **Không chọn (Overrides).**

### B (chọn): BE normalize khi trả catalog + FE dùng lại & phòng thủ
Ưu: một nguồn sạch, mọi consumer ăn cùng danh sách; payload shape không đổi; test offline được. Nhược: sửa 1 route BE + 3 file FE. **Chọn.**

### C: Sửa `derive_region` để không tạo biến thể từ đầu
Ưu: triệt để. Nhược: phải backfill dữ liệu cũ, ảnh hưởng ingestion/sync route — vượt phạm vi. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 hàm BE + 3 file FE + test 2 phía |
| Hiệu năng | Không đổi | Gộp trên tập rows nhỏ (catalog) |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký/props, thêm hàm thuần |
| Độ tin cậy | Tốt | Một danh sách duy nhất, không chia nhỏ số liệu |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Gộp nhầm 2 khu vực khác nhau chỉ trùng casefold | Thấp | Trung bình | casefold chỉ bỏ khác biệt hoa/thường & khoảng trắng — cùng danh xưng |
| Avg sau gộp sai do làm tròn sẵn | Thấp | Thấp | Dùng `avg*count` rồi chia lại; BE đã round avg 2 chữ số ở output |
| Working tree 3 task trước chưa commit | Cao | Trung bình | Nhánh/stage chọn lọc như các task trước |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-monitoring-region-dedupe-thien.md`
- **Code test offline:** `apps/api/tests/unit/test_earthquakes_routes.py` (bổ sung) + `apps/web/tests/monitoring-region-map.test.ts`, `apps/web/tests/header-global.test.ts` (bổ sung)
- **Cách kiểm chứng:** BE pytest + ruff; FE `pnpm build && pnpm test`; `notes_index.py --check`; tay: `/monitoring` và header combobox thấy mỗi khu vực 1 lần.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng đang thao tác xác nhận rõ trong chat 2026-11-24: "Approved". Duyệt toàn bộ §4: BE gộp khu vực theo khoá trim+casefold (count/avg/max, nhãn đại diện), FE dùng lại + dedupe phòng thủ, test 2 phía. `Overrides:` quyết định FE-only của proposal `2026-11-23-monitoring-region-map-thien` — không đổi payload shape. Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ handle nào cũng duyệt). Sau `Approved`: rẽ nhánh `fix/2026-11-24-monitoring-region-dedupe-thien` (dirty tree đang chặn `git-ship.sh start`), sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, implement, test, validation, dừng **CHECKPOINT 1**.
