# Implementation Plan: Giảm tải Statistics bằng fetching theo sub-route

## Metadata
- ID: 2026-11-23-statistics-subroute-load-thien
- Proposal: .agents/notes/proposed/2026-11-23-statistics-subroute-load-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: in_progress

## 1. Mục tiêu
Mỗi sub-route `/statistics/<slug>` chỉ fetch nguồn của nó (1 request, riêng P5+P6 = 2).

## 2. Phạm vi
### In Scope
- `apps/web/src/features/statistics/statistics-data.tsx` (giữ hàm thuần, bỏ provider/context)
- `apps/web/src/features/statistics/StatisticsLayout.tsx` (bỏ provider, xử lý ExpertInsightsPanel)
- `apps/web/src/features/statistics/patterns/TemporalPatternPage.tsx`
- `apps/web/src/features/statistics/patterns/TrendPatternPage.tsx`
- `apps/web/src/features/statistics/patterns/SeasonalityPatternPage.tsx`
- `apps/web/src/features/statistics/patterns/CorrelationPatternPage.tsx`
- `apps/web/src/features/statistics/patterns/ForecastClassificationPatternPage.tsx`
- `apps/web/src/features/statistics/patterns/{ForecastPatternPage,ClassificationPatternPage}.tsx` (giữ tương thích, tự fetch nếu dùng)
- `apps/web/src/features/statistics/ExpertInsightsPanel.tsx` (đổi nguồn dữ liệu)
- `apps/web/tests/statistics-subroute.test.ts` (mới)
- `.agents/notes/testcase/2026-11-23-statistics-subroute-load-thien.md`

### Out of Scope
- BE/API/contracts, migration, SSE, 4 page khác, `App.tsx`.

## 3. Các bước
1. Tách `usePanel` thành hook export dùng được ở page (giữ AbortController).
2. Mỗi pattern page tự gọi service tương ứng với `?country=&region=` + interval local.
3. `ExpertInsightsPanel` nhận dữ liệu từ page thay vì context; layout không còn provider.
4. Giữ export thuần của `statistics-data.tsx` cho caller cũ (I2).
5. Test fetch spy (1 request cho temporal) + source assertions; `pnpm test/build`.

## 4. Thay đổi dữ liệu/API/cấu hình
- Không đổi payload/schema; chỉ số lượng request FE.

## 5. Validation
- [x] testcase note sinh đồng thời
- [ ] `pnpm test` + `pnpm build`
- [ ] fetch spy: mở temporal không gọi trend/seasonality/correlation/predictions
- [ ] `notes_index.py --check`

## 6. Rủi ro
- ExpertInsightsPanel mất data khi rời layout → render trong page.
- Test cũ assert provider → cập nhật, không xoá.

## 7. Rollback
Revert PR; provider cũ có thể khôi phục từ notes (`statistics-data.tsx` giữ hàm thuần).

## 8. Ghi chú
I2 (giữ export), I5 (không mock), I7 (test offline).
