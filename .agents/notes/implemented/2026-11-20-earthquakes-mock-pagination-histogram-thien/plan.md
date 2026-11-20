# Implementation Plan: Mock bảng, phân trang theo trang, histogram độ lớn

## Metadata
- ID: 2026-11-20-earthquakes-mock-pagination-histogram-thien
- Proposal: .agents/notes/proposed/2026-11-20-earthquakes-mock-pagination-histogram-thien.md
- Approved By: thien
- Approved At: 2026-11-20
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Mock ~40 bản ghi cho dev server, pagination chọn trang, chart histogram độ lớn từ dữ liệu bảng đã lọc, dịch “Magnitude” → “Độ lớn”. Không đổi API/schema, không xóa file cũ.

---

## 2. Phạm vi
### In Scope
- `apps/web/tests/mocks/earthquakes-list.ts` — fixture danh sách + cắt trang.
- `apps/web/dev-mock.ts` — phân trang endpoint earthquakes, statistics từ list.
- `apps/web/src/features/earthquakes/magnitude-histogram.ts` — helper thuần histogram.
- `apps/web/src/features/earthquakes/earthquake-view.ts` — page size 10 cho bảng, `CHART_PAGE_SIZE` cho chart.
- `apps/web/src/features/earthquakes/country-filter.ts` — helper thuần lọc quốc gia từ `place`.
- `apps/web/src/features/earthquakes/components/MagnitudeHistogramChart.tsx` — chart mới.
- `apps/web/src/features/earthquakes/components/EarthquakeInsights.tsx` — thay country chart bằng histogram; đổi label tiếng Việt.
- `apps/web/src/features/earthquakes/components/EarthquakePagination.tsx` — số trang + first/last.
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` — truyền rows vào chart.
- `apps/web/src/features/earthquakes/earthquake-insights.ts` — text “Độ lớn”.
- `apps/web/tests/mock-earthquakes.test.ts` (mới, gồm test country filter), `apps/web/tests/earthquakes-insights.test.ts`, `apps/web/tests/earthquakes-page.test.ts` (cập nhật).
- `.agents/notes/testcase/2026-11-20-earthquakes-mock-pagination-histogram-thien.md`
- Các file đã duyệt từ các proposal trước trên cùng nhánh — chỉ khai báo scope, không sửa (3 bộ note đã thử đã bị xóa theo proposal gộp; giữ `catalog-filter` đã commit):
  - `apps/web/src/app/App.tsx`, `apps/web/src/layouts/DashboardLayout.tsx`, `apps/web/src/layouts/layout.css`, `apps/web/src/lib/transforms/settings-data.ts`, `apps/web/src/styles/globals.css`, `apps/web/src/styles/index.css`, `apps/web/src/hooks/useTheme.ts`, `apps/web/src/lib/theme.ts`, `apps/web/tests/layout-styles.test.ts`, `apps/web/tests/theme.test.ts`
  - `apps/web/src/contracts/country-clusters.ts`, `apps/web/src/contracts/index.ts`, `apps/web/src/features/earthquakes/country-clusters.ts`, `apps/web/src/features/earthquakes/components/CountryClusterChart.tsx`, `apps/web/src/features/earthquakes/components/AsyncStatePanel.tsx`, `apps/web/src/features/earthquakes/components/EarthquakeFilterBar.tsx`, `apps/web/src/features/earthquakes/components/EarthquakeTable.tsx`, `apps/web/src/features/earthquakes/components/NumberStepperField.tsx`, `apps/web/src/features/earthquakes/components/SeverityReferenceTable.tsx`, `apps/web/src/features/earthquakes/EarthquakesPage.css`, `apps/web/src/hooks/useEarthquakeInsights.ts`, `apps/web/tests/country-clusters.test.ts`, `apps/web/tests/dev-mock.test.ts`, `apps/web/vite.config.ts`

### Out of Scope
- API/schema/endpoint thật, backend/migration, xóa file country-clusters cũ.

---

## 3. Các bước
1. Fixture list + slicePage + test.
2. dev-mock paginate.
3. Helper histogram + component chart; thay country chart.
4. Pagination số trang.
5. Dịch thuật ngữ + CSS; validation build/test/notes/scope; CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi schema/endpoint. Mock chỉ chạy trong Vite dev (`VITE_API_MOCKING=enabled`) và test.

---

## 5. Validation
- [x] Testcase paired
- [x] `pnpm build`
- [x] `pnpm test` (không giảm baseline)
- [x] `notes_index.py --check`, scope, 0 deletion
- [x] Kiểm tra mock không import vào view runtime

---

## 6. Rủi ro khi làm
- Mock lộ production → chỉ dev-mock/test; test structural.
- page/limit sai → test slicePage.
- Chart lệch filter → helper nhận items đã lọc.

---

## 7. Rollback
Revert commit/PR; không có DB/API change.

---

## 8. Ghi chú
Giữ Light Only; “Magnitude” trong UI đổi thành “Độ lớn” kèm giải thích ngắn.
