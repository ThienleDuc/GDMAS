<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md.
     QUY TẮC THẢ LỎNG §9: Bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả tự duyệt hoặc đồng đội)
     đều có thể điền Decision: Approved tại §9 — KHÔNG cần chờ ThienleDuc duyệt proposal.
     Agent chỉ điền §9 khi người dùng đang thao tác xác nhận rõ ràng trong chat (ghi chỉ thị vào Comments). -->

# Proposal: Sửa bộ lọc Danh mục động đất & gom điều khiển dùng chung lên Header/Aside

## Metadata
- ID: 2026-11-23-earthquakes-filter-header-controls-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: bugfix
- Status: approved
- Priority: high
- Area: `apps/web/src/features/earthquakes/`, `apps/web/src/layouts/` (header + aside), `apps/web/dev-mock.ts`, `apps/web/tests/`
- Architecture Impact: none   <!-- FE-only: không đổi payload/contract/API/docs; chỉ chuyển vị trí widget và tôn trọng ?country=&region= có sẵn -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-darkmode-toggle-thien.md   <!-- - Overrides: chuyển nút toggle từ header sang aside -->
  - .agents/notes/proposed/2026-11-21-header-country-clock-refresh-thien.md   <!-- - Overrides: chuyển countdown ra aside, thêm region filter dùng chung -->
  - .agents/notes/proposed/2026-11-23-chart-country-region-filter-thien.md   <!-- - Overrides: bỏ select quốc gia/khu vực cục bộ trên histogram, dùng chung URL -->
  - .agents/notes/proposed/2026-11-20-earthquakes-mock-pagination-histogram-thien.md   <!-- - Overrides: histogram không còn select quốc gia riêng -->
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Trang `/earthquakes` (T7.03) có 3 nhóm điều khiển rời rạc: (a) thanh lọc Ngày/Tuần/Tháng + Độ lớn/Độ sâu
(`EarthquakeFilterBar`), (b) select quốc gia **và** khu vực ngay trong card "Phân bố theo độ lớn"
(`MagnitudeHistogramChart`), (c) header dùng chung có `GlobalCountryFilter`, `DataRefreshLabel` (đếm ngược 5 phút)
và `ThemeToggle`. Nguồn sự thật `?country=&region=` đã được thiết lập ở proposal `2026-11-21-header-country-clock-refresh-thien`.

### Vấn đề
Người dùng báo 4 lỗi:
1. **Bộ lọc không sử dụng được** — các field độ lớn/độ sâu được gửi lên API nhưng mock dev (`VITE_API_MOCKING=enabled`)
   chỉ xử lý `start_time`/`end_time`, bỏ qua `min_magnitude`/`max_magnitude`/`min_depth`/`max_depth`; thêm vào đó nút "Áp dụng"
   chỉ là icon SVG không nhãn → người dùng không biết phải bấm để commit draft.
2. **Phân bố theo độ lớn – lọc theo quốc gia dùng chung với header** — histogram đang có `<select>` quốc gia riêng,
   trùng/thừa với `GlobalCountryFilter` trên header.
3. **Lọc theo khu vực đưa lên header dùng chung** — select khu vực đang nằm trong card histogram, chưa có widget dùng chung.
4. **Header: đưa bộ đếm 5 phút đếm ngược + nút chuyển đổi light mode vào phía cùng aside nav** —
   đếm ngược hiện là cụm "Cập nhật sau 05:00" kèm icon RefreshCw ở header phải; theme toggle cũng ở header phải.
   Yêu cầu: chuyển cả hai xuống footer của aside (cùng phía với thanh điều hướng), rút gọn đếm ngược chỉ còn
   con số `5:00`, đặt **trên** nút toggle Light/Dark.

### Ảnh hưởng
Bộ lọc là chức năng cốt lõi của Danh mục động đất; việc nhân bản 2 bộ lọc quốc gia/khu vực gây lệch ngữ cảnh
giữa bảng, biểu đồ và các trang khác. Đây là lỗi FE/T7 thuần, không đụng BE (I1).

---

## 2. Hiện trạng
| Tệp | Hành vi hiện tại |
|---|---|
| `apps/web/src/features/earthquakes/EarthquakesPage.tsx` | `form` (draft) → bấm nút → `appliedForm` → `buildEarthquakeQuery` → `fetchPage`; đọc `country`/`region` từ `useCatalogSelection()` (URL). |
| `apps/web/src/features/earthquakes/components/EarthquakeFilterBar.tsx` | 1 `<select>` + 4 `NumberStepperField` + nút apply **chỉ icon SVG**. |
| `apps/web/src/features/earthquakes/components/MagnitudeHistogramChart.tsx` | Có 2 `<select>` cục bộ: "Lọc theo quốc gia" và "Lọc theo khu vực". |
| `apps/web/src/features/earthquakes/components/EarthquakeInsights.tsx` | Truyền `countries/selectedCountry/onCountryChange/regions/selectedRegion/onRegionChange` xuống histogram. |
| `apps/web/src/layouts/header/GlobalCountryFilter.tsx` | Combobox quốc gia dùng chung, ghi `?country=` qua `setCountry()`. |
| `apps/web/src/layouts/header/HeaderActions.tsx` | Xếp: `HeaderFilterContext`, `GlobalCountryFilter`, `DataRefreshLabel`, `SystemStatusPanel`, `RealtimeClock`, `ThemeToggle`. |
| `apps/web/src/layouts/header/DataRefreshLabel.tsx` | `setInterval` 1s, text "Cập nhật sau {countdownLabel}", progress bar, render cả `RefreshToast`. |
| `apps/web/src/layouts/header/header-data.ts` | `countdownLabel()` trả `mm:ss` có pad (`05:00`), `nextCountdownTick()`, `REFRESH_CYCLE_SECONDS` từ `TERMINAL_SPECS`. |
| `apps/web/src/layouts/DashboardLayout.tsx` | `<aside>` rail: brand, nav, `<div className="layout__sidebar-footer" />` **đang rỗng**. |
| `apps/web/dev-mock.ts` | `/api/v1/earthquakes` chỉ lọc `start_time`/`end_time` + phân trang; bỏ qua mọi filter khác. |
| `apps/web/tests/{theme-toggle,terminal-status,earthquakes-insights,header-global,layout-styles}.test.ts` | Có assertion về vị trí `ThemeToggle` sau `RealtimeClock`, prop `selectedCountry`, class `.layout__refresh…` — cần cập nhật khi dời widget (không xoá test). |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Bộ lọc Ngày/Tuần/Tháng + Độ lớn/Độ sâu **có tác dụng thật** ở cả chế độ API thật lẫn dev-mock; nút áp dụng có nhãn rõ ràng.
  2. Histogram "Phân bố theo độ lớn" **không còn select quốc gia riêng** — dùng chung `?country=` từ header; dữ liệu `items` đã được lọc theo URL.
  3. Thêm `GlobalRegionFilter` trên header, dùng chung `?region=` (phụ thuộc quốc gia đã chọn), có fallback khi BE chưa có dữ liệu.
  4. Chuyển `DataRefreshLabel` (rút gọn thành `5:00`) và `ThemeToggle` vào `layout__sidebar-footer`, xếp dọc: countdown ở trên, toggle ở dưới; giữ nguyên hành vi toast và SSE refresh.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi BE (`apps/api/**`), contract, schema, `docs/api/API.md`, migration, worker, SSE protocol.
  - Không đổi logic tính toán `buildEarthquakeQuery`, `resolveWindow`, `buildMagnitudeHistogram`, `filterByCountryAndRegion`, `useCatalogSelection` — chỉ dùng lại (I2).
  - Không đổi Dark Mode tokens, `useTheme`, `TimezoneProvider`, đồng hồ `RealtimeClock`, `SystemStatusPanel`, `HeaderFilterContext`.
  - Không xoá/sửa test đang pass (I7) — chỉ **bổ sung/sửa assertion cho khớp vị trí widget mới**.
  - Không commit/push/merge ở proposal này; không đụng working tree của nhánh timezone đang dở.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: giữ nguyên tên component/hàm cũ, chỉ thêm component/hàm mới và điều chỉnh nơi render.
FE thuần T7 (I1) · UTC/WGS84 không đổi (I3) · không migration (I4) · không mock thay API thật ở view chính thức,
chỉ sửa fixture dev-mock phục vụ demo (I5) · không secret (I6) · test offline (I7).

### 4.1. Sửa bộ lọc (mục 1)
- `apps/web/dev-mock.ts`: trong nhánh `/api/v1/earthquakes`, sau khi lọc thời gian, áp tiếp:
  `min_magnitude`/`max_magnitude` (so `item.magnitude`), `min_depth`/`max_depth` (so `item.depth_km`),
  rồi `country`/`region` qua helper thuần `filterByCountryAndRegion(items, country, region)` (đã có, RULE-03).
  Giữ nguyên phân trang `slicePage`. Không thêm dependency.
- `apps/web/src/features/earthquakes/components/EarthquakeFilterBar.tsx`: đổi nút apply thành
  `<button className="eq-filter-apply" type="button" aria-label="Áp dụng bộ lọc" title="Áp dụng bộ lọc">`
  chứa icon SVG **+ nhãn "Áp dụng"** (CSS `grid-template-columns` của `.eq-filter-bar` chuyển cột cuối thành `auto` đủ chứa nhãn).
  Giữ `onApply`, giữ draft model (`handleApplyFilters`) — không đổi chữ ký props.
- `apps/web/src/features/earthquakes/EarthquakesPage.css`: bổ sung `gap`/`min-width` cho `.eq-filter-apply` có nhãn,
  giữ responsive 1023/767/479px hiện có (không hardcode màu — dùng token, I5).

### 4.2. Histogram dùng chung quốc gia (mục 2)
- `apps/web/src/features/earthquakes/components/MagnitudeHistogramChart.tsx`: **bỏ** `<select aria-label="Lọc theo quốc gia">`
  và `<select aria-label="Lọc theo khu vực">` cùng header select markup. Thay bằng một dòng nhãn ngữ cảnh thuần:
  `Đang xem: <country> · <region>` (lấy từ props đã có), hoặc ẩn hẳn nếu đang `all`.
- `apps/web/src/features/earthquakes/components/EarthquakeInsights.tsx`: giữ nguyên chữ ký props (I2 — caller cũ vẫn hợp lệ)
  nhưng **không truyền** `countries`/`onCountryChange`/`onRegionChange` xuống histogram nữa; truyền `selectedCountry`/`selectedRegion` để hiển thị nhãn.
  `EarthquakesPage` vẫn truyền `items={chartFiltered}` → histogram đã lọc theo URL, KPI vẫn theo `geo`.

### 4.3. Region filter lên header (mục 3)
- Tệp mới `apps/web/src/layouts/header/GlobalRegionFilter.tsx`: combobox kiểu `GlobalCountryFilter` nhưng lấy options từ
  `getRegionCatalog(country, signal)` (service đã có); khi `country === ALL_COUNTRIES` hoặc API unavailable → disable +
  nhãn "Chọn quốc gia trước" / "Chưa có dữ liệu khu vực", **không** fallback mock (I5). Ghi chọn qua
  `useCatalogSelection().setRegion()` → `?region=`; đổi quốc gia → `setCountry()` tự reset region về `all` (helper cũ).
- `apps/web/src/layouts/header/HeaderActions.tsx`: thêm `<GlobalRegionFilter />` ngay sau `<GlobalCountryFilter />`.
- `apps/web/src/layouts/header/header-data.ts` (bổ sung, additive): hàm thuần `regionOptionsFromCatalog(payload)` trả
  danh sách nhãn đã trim/sort, xử lý `null`/sai shape → `[]` (test offline được).
- CSS `.layout__region-*` trong `layout.css` tái dùng token của `.layout__country-*`.

### 4.4. Countdown + Theme toggle xuống aside (mục 4)
- Tệp mới `apps/web/src/layouts/header/CompactRefreshCountdown.tsx` (đặt cùng thư mục header để tái dùng logic):
  giữ nguyên `setInterval` + `nextCountdownTick` + effect `onRefresh()` khi quay lại `REFRESH_CYCLE_SECONDS`,
  render **duy nhất** `<time role="timer" className="layout__refresh-compact">{compactCountdownLabel(remaining)}</time>`.
  Không icon, không chữ "Cập nhật sau", không progress bar. Giữ nguyên prop `onRefresh`.
- `apps/web/src/layouts/header/header-data.ts`: thêm `compactCountdownLabel(seconds)` — như `countdownLabel` nhưng bỏ số `0`
  đầu phút (`300 → "5:00"`, `125 → "2:05"`). **Giữ nguyên `countdownLabel`** để tương thích test/caller cũ (I2).
- `apps/web/src/layouts/header/RefreshToast.tsx` + logic toast: chuyển sang component `RefreshToastHost` (mới) nhận
  `dataRefreshKey`, render `<RefreshToast>`; đặt host này trong `HeaderActions` thay cho `DataRefreshLabel` cũ để toast
  vẫn bắn theo SSE (GAP-13) dù countdown đã dời đi.
- `apps/web/src/layouts/DashboardLayout.tsx`: `<div className="layout__sidebar-footer">` render
  `<CompactRefreshCountdown onRefresh={sse.reconnect} />` rồi `<ThemeToggle />` (countdown **trên** toggle).
  Truyền `sse.reconnect` từ shell — giữ 1 kết nối SSE duy nhất (I1).
- `apps/web/src/layouts/header/HeaderActions.tsx`: bỏ `<DataRefreshLabel />` và `<ThemeToggle />`; thêm `<RefreshToastHost dataRefreshKey={...} />`.
- `apps/web/src/layouts/layout.css`: thêm `.layout__sidebar-footer` flex column/gap/căn giữa; `.layout__refresh-compact`
  font `tabular-nums`, token màu; `.header-theme-toggle` giữ nguyên (chỉ đổi chỗ render). Giữ media query reduced-motion.

### 4.5. Test (đồng thời khi §9 Approved — I7)
- `apps/web/tests/dev-mock.test.ts`: bổ sung case mock lọc theo `min_magnitude`/`max_magnitude`/`min_depth`/`max_depth`/`country`/`region`.
- `apps/web/tests/header-region-filter.test.ts` (mới): thuần — `regionOptionsFromCatalog` trả option sort/unique, payload rỗng → `[]`;
  source assertion `GlobalRegionFilter` gọi `setRegion` và nằm trong `HeaderActions`.
- `apps/web/tests/header-aside-controls.test.ts` (mới): thuần — `compactCountdownLabel(300) === "5:00"`, `125 → "2:05"`,
  `0/NaN → "5:00"`; source assertion `DashboardLayout` render countdown trước `ThemeToggle` trong `layout__sidebar-footer`,
  `HeaderActions` không còn `<ThemeToggle`/`<DataRefreshLabel`, có `<RefreshToastHost`.
- Cập nhật assertion cũ cho khớp vị trí mới (không xoá test): `theme-toggle.test.ts` (toggle nằm trong aside, không còn sau clock),
  `terminal-status.test.ts`, `earthquakes-insights.test.ts` (histogram không còn select country/region),
  `header-global.test.ts` (giữ `countdownLabel`, thêm `compactCountdownLabel`), `layout-styles.test.ts` (class footer mới).
- Lệnh: `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### Phương án A: Giữ nguyên vị trí widget, chỉ sửa logic lọc
Ơu: diff nhỏ nhất. Nhược: không đáp ứng 3 yêu cầu gom điều khiển dùng chung của người dùng; select quốc gia/khu vực vẫn nhân bản. **Không chọn.**

### Phương án B (chọn): Dùng lại `?country=&region=` + helper thuần có sẵn, dời widget bằng component mới
Ưu: một nguồn sự thật, không đụng BE/contract, giữ chữ ký cũ (I2), test offline được, cookie/localStorage/theme không đổi.
Nhược: phải sửa vài assertion test cũ và thêm 4 tệp FE nhỏ. **Chọn.**

### Phương án C: Đưa filter vào store Zustand/context mới
Ưu: tập trung state. Nhược: thừa vì `useCatalogSelection` + URL đã là nguồn sự thật; tăng phức tạp, dễ lệch deep-link. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình — 4 tệp mới, ~8 tệp sửa | Tách widget theo đúng trách nhiệm, không đụng logic lõi |
| Hiệu năng | Không đổi | Vẫn 1 SSE, fetch theo filter như cũ; countdown 1 tick/s như cũ |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký props/hàm; thêm component thay vì xoá; helper cũ còn dùng |
| Độ tin cậy | Tốt | Một nguồn sự thật `?country=&region=`; mock chỉ sửa cho đúng demo |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Test cũ assert `ThemeToggle` sau `RealtimeClock` bị fail | Cao | Trung bình | Cập nhật assertion trong `theme-toggle.test.ts`, `terminal-status.test.ts` — không xoá test |
| Toast SSE không còn bắn sau khi dời countdown | Trung bình | Trung bình | Tách `RefreshToastHost` trong HeaderActions, giữ `dataRefreshKey` từ shell |
| `getRegionCatalog` trả 404 khi BE chưa có dữ liệu | Trung bình | Thấp | Disable widget + nhãn unavailable, không mock (I5), giữ `?region=` nếu đã có từ URL |
| Working tree nhánh timezone đang dở bị ảnh hưởng | Trung bình | Cao | Chỉ đụng file ngoài diff hiện tại; Phần A `git-ship.sh start` phải xác nhận dirty tree trước khi checkout |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-23-earthquakes-filter-header-controls-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):** `apps/web/tests/dev-mock.test.ts` (bổ sung), `apps/web/tests/header-region-filter.test.ts` (mới), `apps/web/tests/header-aside-controls.test.ts` (mới) + cập nhật 5 test cũ.
- **Cách kiểm chứng:** `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`; kiểm tra tay: đổi filter có tác dụng, đổi quốc gia/khu vực trên header cập nhật bảng+histogram+KPI, countdown `5:00` đứng trên nút toggle ở aside, toast vẫn hiện sau 5 phút.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng đang thao tác xác nhận rõ trong chat 2026-11-23: "Approved". Duyệt toàn bộ §4: sửa filter (dev-mock + nút có nhãn), bỏ select quốc gia/khu vực khỏi histogram, thêm GlobalRegionFilter trên header, dời countdown rút gọn `5:00` + ThemeToggle xuống sidebar-footer (countdown ở trên), giữ toast SSE. Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên xác nhận §9 (bất kỳ handle nào trong `.agents/team.md`, kể cả tác giả). Sau khi `Decision: Approved`,
chạy `build-implementation`: checkout nhánh `fix/2026-11-23-earthquakes-filter-header-controls-thien` (lưu ý working tree
đang có thay đổi của nhánh timezone — cần confirm trước khi checkout), tạo đồng thời `implemented/<id>/{plan.md,status.md}`
và `testcase/<id>.md`, rồi dừng ở **CHECKPOINT 1**.
