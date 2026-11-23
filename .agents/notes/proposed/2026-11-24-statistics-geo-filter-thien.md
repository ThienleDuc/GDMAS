<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Bộ lọc quốc gia & khu vực cho tất cả biểu đồ Statistics

## Metadata
- ID: 2026-11-24-statistics-geo-filter-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: feature
- Status: approved
- Priority: medium
- Area: `apps/web/src/features/statistics/StatisticsLayout.tsx`, `apps/web/src/features/statistics/StatisticsPage.css`, `apps/web/tests/`
- Architecture Impact: none   <!-- Dùng lại URL ?country=&region= và API catalog có sẵn -->
- Related Docs:
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-header-country-clock-refresh-thien.md   (*combobox header vẫn là nguồn sự thật — bổ sung picker local, KHÔNG override*)
  - .agents/notes/proposed/2026-11-23-statistics-subroute-load-thien.md
  - .agents/notes/proposed/2026-11-24-temporal-daily-series-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
BE cả 6 endpoint (`/analysis/temporal|trend|seasonality|correlation`, `/predictions`, `/classifications`) đều nhận
`country`/`region` và lọc qua `compute_filtered_metrics`/`build_filtered_forecast`. FE `statistics-data.tsx` cũng đã
truyền `...geo` cho cả 6 (`geo = {country, region}` từ `useCatalogSelection()`).

### Vấn đề
Trang `/statistics/*` **chỉ có `RegionPicker`** (và tự ẩn khi `country === "all"`) — người dùng không có bộ chọn
**quốc gia** ngay trên trang phân tích; muốn lọc phải dùng combobox header. Yêu cầu: có đủ 2 bộ lọc
(quốc gia + khu vực) áp dụng cho **tất cả** biểu đồ phân tích trong Statistics.

### Ảnh hưởng
Lọc theo quốc gia/khu vực không trực quan trên trang phân tích; người dùng dễ quên đang xem phạm vi nào.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `StatisticsLayout.tsx:13-47` | `RegionPicker` — chỉ render khi đã có country; gọi `getRegionCatalog(country)` |
| `StatisticsLayout.tsx:62-65` | `.stat-page__filters` chỉ chứa `RegionPicker` + `ExpertInsightsPanel` |
| `statistics-data.tsx:94-96,108-141` | `geo` truyền cho 6 endpoint — đã đúng |
| `useCatalogSelection.ts` | `setCountry` reset region về `all`; URL là nguồn sự thật |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. **Revision:** quốc gia dùng chung combobox header (URL `?country=`), **không thêm picker quốc gia ở trang con**.
  2. Giữ `RegionPicker`, hiển thị ngay khi có quốc gia; cả quốc gia lẫn khu vực cùng nguồn URL `?country=&region=` → **mọi biểu đồ** (6 pattern) refetch nhờ deps `[country, region]` trong `usePanel`.
  3. Hiện chip ngữ cảnh "Đang xem: \<country\> / \<region\>" trong `stat-page__heading` để biết phạm vi đang lọc.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi BE, contract, API, payload; không đổi logic lọc trong `statistics-data.tsx` (đã đúng).
  - Không thay combobox header (vẫn dùng chung, URL đồng bộ 2 chiều).
  - Không đổi 6 component biểu đồ/CSS biểu đồ; không xoá test đang pass.
  - Không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm component local + class CSS, giữ `RegionPicker`/header.

### 4.1. `StatisticsLayout.tsx`
- Component mới `CountryPicker`:
  - `const { country, setCountry } = useCatalogSelection()`.
  - `useEffect` fetch `getCountryCatalog(controller.signal, resolveWindow("month"))` → options `{country, count}`; fallback `getClustersOptional` → `countriesFromClusters` nếu API lỗi/rỗng (I5, không mock).
  - `<select className="ds-select" aria-label="Lọc biểu đồ theo quốc gia" value={country} onChange={...setCountry(...)}>` với option `ALL_COUNTRIES`.
- `RegionPicker` giữ nguyên (đã đúng).
- Thêm chip ngữ cảnh trong heading (chỉ khi có filter).
- Dùng chung CSS `.stat-page__filters`.

### 4.2. CSS
- `StatisticsPage.css`: style cho `.stat-filter-chip` (dùng token, Dark Mode), không hardcode màu.

### 4.3. Test (đồng thời khi §9 Approved — I7)
- Bổ sung test statistics: source có `CountryPicker`, `getCountryCatalog`, `setCountry`, `aria-label`, chip; đảm bảo `statistics-data.tsx` vẫn truyền geo cho 6 endpoint (assert 6 lần `...geo`).
- Lệnh: `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Chỉ dùng combobox header
Ưu: không đổi code. Nhược: không đúng yêu cầu "thêm bộ lọc cho trang Statistics". **Không chọn.**

### B (chọn): Picker local dùng chung URL `?country=&region=`
Ưu: lọc ngay trên trang, 6 biểu đồ tự refetch, vẫn đồng bộ header/deep link. Nhược: thêm 1 component nhỏ. **Chọn.**

### C: State riêng trong StatisticsDataProvider
Ưu: không đụng URL. Nhược: tách khỏi nguồn sự thật, mất deep link. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 component + CSS + test |
| Hiệu năng | 1 request catalog khi mount trang | Có cache/AbortController |
| Bảo trì / Open-Closed | Tốt | Giữ RegionPicker/header, chỉ thêm |
| Độ tin cậy | Tốt | Một nguồn URL, filter áp mọi chart |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Trùng combobox header | Thấp | Thấp | Cùng URL → đồng bộ, không state riêng |
| Catalog rỗng/404 | Trung bình | Thấp | Fallback `/clusters`, option "Tất cả" vẫn có |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-statistics-geo-filter-thien.md`
- **Code test offline:** bổ sung `apps/web/tests/statistics-subroute.test.ts` / `chart-region-filter.test.ts`.
- **Cách kiểm chứng:** FE build + test; tay: chọn quốc gia/khu vực trên trang Statistics → 6 biểu đồ đổi số liệu; đổi ngược từ header → picker cập nhật.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" trong chat 2026-11-24. Duyệt §4: thêm CountryPicker trong StatisticsLayout dùng chung URL ?country=&region=, giữ RegionPicker/header, chip ngữ cảnh, test FE. Không đổi BE/contract/logic lọc 6 endpoint. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
### Revision 2026-11-24
- Ghi §9 Approved theo chỉ thị chat.
- Sau khi implement CountryPicker, người dùng yêu cầu **dùng chung filter header, bỏ chọn quốc gia ở trang con** → đã gỡ CountryPicker; giữ RegionPicker + chip ngữ cảnh.
- FE build + 365 test pass; chờ CHECKPOINT 1.
