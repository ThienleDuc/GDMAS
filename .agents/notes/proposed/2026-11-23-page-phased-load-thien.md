# Proposal: Giảm tải & chống giật các page bằng phased load

## Metadata
- ID: 2026-11-23-page-phased-load-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: refactor
- Status: approved
- Priority: high
- Area: apps/web/src/features/overview/, apps/web/src/features/earthquakes/, apps/web/src/hooks/useEarthquakeInsights.ts
- Architecture Impact: none — không đổi API/contract/BE, chỉ thời điểm và số request FE.
- Related Docs: docs/coding-rules.md (I2, I5, I7), docs/agent-workflow.md
- Related Proposals:
  - Overrides: 2026-11-21-overview-dashboard-thien — **chỉ riêng** dòng 78 (`Promise.allSettled` gọi toàn bộ nguồn khi mount) và dòng 109 (tradeoff "~7 request khi mount"). Lý do: 12 request đồng thời (thực tế sau các proposal sau) làm chậm KPI/bảng và gây giật khi widget fill dần. **Giữ nguyên** §3 (4 chart A–D + bảng xếp hạng + live feed), lựa chọn §9, endpoint/contract, cơ chế 404-tolerant & abortable. Không override lại proposal `2026-11-23-overview-ranking-map-ux-thien` (ranking vẫn lấy từ catalog).
  - Liên quan: `2026-11-23-statistics-subroute-load-thien` (tái dùng mẫu cờ `enabled` / `usePanel`); `2026-11-23-chart-country-region-filter-thien` (**giữ nguyên** `country/region/window` gửi xuống BE — không bỏ filter để tiết kiệm); `2026-11-23-overview-docs-gaps-thien` (giữ 7/12 cột & màu ngưỡng).
- Related Bugs: none

---

## 1. Vấn đề
Sau khi lazy-load bundle (PR #98) và sub-route Statistics (PR #99), các page vẫn **gọi toàn bộ dữ liệu khi mount**:
- `OverviewPage`: **12 request** gần như đồng thời → KPI/bảng phải đợi request chậm nhất; widget fill dần gây **giật**.
- Trong 12 request có **2 request vô dụng**: `getTemporalAnalysis` (từ `useEarthquakeInsights`, `data.temporal` không ai đọc) và `getSeasonalityAnalysis({interval:"month"})` (call on-the-fly nặng nhất, state `seasonalityMonthly` **không có consumer**).
- `EarthquakesPage`: 5 request, trong đó `temporal` + `clusters` từ insights hook **không được dùng** (page chỉ đọc `insights.statistics`).

## 2. Hiện trạng
- `useOverviewData.ts:88-110`: `Promise.allSettled` với 9 promise; `useEarthquakeInsights.ts:49-53` thêm 3.
- `OverviewPage.tsx:162`: skeleton chỉ hiện khi `data.statistics` chưa có → sau insights xong `loading=false` dù card dưới fold chưa có data → hiện "Chưa có dữ liệu" **sai** (đang tải).
- Các card dưới fold (`ov-card--wide`, `ov-card--cycles`, forecast — `OverviewPage.css:528-547`) phục vụ bởi catalog/monthly/predictions/classifications.
- `MonitoringMapPage` đã nhẹ (3 REST, sidebar hiện sẵn desktop) → **giữ nguyên**. Shell (3 REST + 1 SSE) → **giữ nguyên**.
- Test khóa source: `overview-ranking-catalog.test.ts`, `monthly-peaks.test.ts`, `overview-range-filter.test.ts`, `overview-docs-gaps.test.ts`, `chart-region-filter.test.ts` — phải giữ tên file/call trong `useOverviewData.ts`.

## 3. Mục tiêu
- **Bỏ 2 request vô dụng** ở Overview và **2** ở Earthquakes (thêm flag optional, default `true` — I2).
- **Chia 2 phase** cho Overview: phase 1 critical (KPI, trend above-fold, 5 sự kiện, cụm) dispatch ngay; phase 2 secondary (catalog, seasonality tuần, monthly-peaks, predictions, classifications) defer sau khi phase 1 settle (`requestIdleCallback` có fallback `setTimeout(0)`).
- KPI/bảng có số **nhanh hơn ~3×** (đợi 4 request thay vì 12); phân biệt rõ **Loading** (phase 2 chưa xong) vs **Empty** (BE trả rỗng) — I5.
- Giữ nguyên UI 4 chart + ranking + SSE patch + `database_cleared` refetch + mọi filter `country/region/range`.

## 4. Giải pháp đề xuất
1. `useEarthquakeInsights(interval, refreshKey, filter, window, options?)` — options `{ includeTemporal?, includeClusters? }` default `true`; khi false thì **không gọi** service tương ứng, state để null. Overview & Earthquakes truyền `false`.
2. `useOverviewData(filter, refreshVersion, window)` — giữ chữ ký; bổ sung nội bộ:
   - Xoá promise `getSeasonalityAnalysis({interval:"month"})` + giữ field `seasonalityMonthly` trong state (null) để không phá type/consumer tiềm ẩn.
   - `secondaryEnabled` bật sau phase 1 settle; 6 promise phase 2 đi vào effect riêng có `AbortController`, dùng chung `refreshKey/refreshVersion/window` làm deps (đảm bảo SSE reset refetch cả 2 phase).
   - `loading = phase1.loading || phase2.loading` cho banner; card phase 2 có skeleton riêng thay vì empty text.
3. `EarthquakesPage.tsx:157` truyền flag `includeTemporal:false, includeClusters:false` → còn 3 request (bảng limit=10, chart limit=100, statistics KPI). Giữ detail fetch-on-click.
4. Test offline: fetch spy đếm request (Overview phase1 = 4, tổng 10; Earthquakes = 3); source assertions cờ optional; `pnpm test && pnpm build`.

## 5. Phương án đã cân nhắc
- A: Giữ nguyên 12 request, chỉ tối ưu BE → không giải quyết giật FE. **Không chọn.**
- B: IntersectionObserver defer theo viewport → thêm hạ tầng mới, khó test, card dưới fold vẫn có thể cần data ngay khi scroll nhanh. **Không chọn** cho proposal này.
- C: Phase load + bỏ request vô dụng → tái dùng `AbortController`/cờ `enabled` có sẵn, ít rủi ro. **Chọn.**

## 6. Đánh đổi
| Khía cạnh | Tác động |
|---|---|
| Số request | Overview 12 → 10 (4 ngay + 6 defer); Earthquakes 5 → 3 |
| Tốc độ KPI | Cải thiện ~3× (không đợi trend/catalog nữa) |
| Hiển thị | Card dưới fold có skeleton riêng trong lúc chờ phase 2 |
| Bảo trì | Thêm 1 effect + flag optional; giữ nguyên hook/service/contract |

## 7. Rủi ro
- `database_cleared`: tăng `refreshVersion` → phải abort+refetch cả 2 phase; Demo 6 bước (xóa → phục hồi) cần kiểm chứng lại.
- Empty vs Loading: phải sửa banner/card phase 2 (đây là lỗi hiện tại, sẽ cố tình sửa).
- Test khóa source: giữ nguyên call trong `useOverviewData.ts`, chỉ cập nhật assertion nếu cần — **không xoá test**.
- BE on-the-fly vẫn nặng khi có filter — proposal này **không bỏ** `country/region/window`.

## 8. Kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-23-page-phased-load-thien.md`
- **Code test offline:** `apps/web/tests/page-phased-load.test.ts` (mới, fetch spy + source assertions).
- **Lệnh:** `cd apps/web && pnpm test && pnpm build`; `notes_index.py --check`.

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng xác nhận "Duyệt — triển khai luôn" trong chat 2026-11-23; §9 Approved, scope giữ đúng mục 3.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ handle trong `.agents/team.md` đều duyệt được). Approved → build-implementation, code, validation, CHECKPOINT 1.
