# Proposal: Giảm tải Statistics bằng fetching theo sub-route

## Metadata
- ID: 2026-11-23-statistics-subroute-load-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: refactor
- Status: approved
- Priority: medium
- Area: apps/web/src/features/statistics/
- Architecture Impact: none — không đổi API/contract/BE, chỉ chuyển nơi gọi API ở FE.
- Related Docs: docs/coding-rules.md (I2, I5, I7), docs/agent-workflow.md
- Related Proposals:
  - Overrides: 2026-11-21-statistics-six-patterns-charts-thien — **chỉ riêng** dòng 143: *"statistics-data.tsx giữ context nạp 6 nguồn một lần tại sublayout → chuyển tab không refetch"*. Lý do: gọi 6 endpoint ngay khi mở `/statistics` dù người dùng chỉ xem 1 pattern → tải API không cần thiết. Các quyết định khác của proposal cũ (6 component chart, shape payload, interval refetch) giữ nguyên.
- Related Bugs: none

---

## 1. Vấn đề
`StatisticsDataProvider` (`statistics-data.tsx:75-163`) nạp **6 nguồn** (`temporal`, `trend`, `seasonality`, `correlation`, `predictions`, `classifications`) ngay khi sublayout `/statistics` mount — bất kể user vào pattern nào. Ví dụ mở `/statistics/temporal` vẫn gọi 5 endpoint không dùng. Cộng với `ExpertInsightsPanel` trong `StatisticsLayout` đọc toàn bộ context.

## 2. Hiện trạng
- `StatisticsRoutes.tsx`: 5 sub-route dùng chung `StatisticsLayout` (có `<Outlet/>`); `StatisticsLayout.tsx` bọc `StatisticsDataProvider` + vẫn render `ExpertInsightsPanel` ở header.
- Mỗi pattern page gọi `useStatisticsData()` để lấy đúng field của mình (`TemporalPatternPage` → temporal; `TrendPatternPage` → trend; …) nhưng **api đã được gọi sẵn** từ provider.
- `usePanel(fetcher, deps)` là hook dùng chung, đã có AbortController — tái dùng được.
- Filter `?country=&region=` đã được truyền vào mọi service (proposal 2026-11-23-chart-country-region-filter-thien).

## 3. Mục tiêu
- Khi mở sub-route `/statistics/<slug>` chỉ gọi endpoint(pattern đó) — tối đa 1 request (riêng Pattern 5+6 gộp gọi 2).
- Giữ nguyên UI, tên component, contract, filter quốc gia/khu vực và hành vi đổi `interval` refetch (Pattern 1).
- Không refetch khi chuyển qua lại giữa các tab đã mở trong cùng phiên nếu dữ liệu còn dùng được (cache nhẹ theo deps).

## 4. Giải pháp đề xuất
1. Bỏ `StatisticsDataProvider` khỏi `StatisticsLayout.tsx`; mỗi pattern page tự gọi `usePanel` cho nguồn của mình (tái dùng hook hiện có) — ví dụ `TemporalPatternPage` giữ `interval` local + `getTemporalAnalysis`.
2. `ExpertInsightsPanel` chuyển từ layout vào từng pattern page (hoặc chỉ giữ ở trang tổng hợp Pattern 5+6) để không cần context toàn cục. Giữ nguyên nội dung insight, không mock.
3. `statistics-data.tsx` chỉ giữ các hàm thuần (`metricsFor`, `asPrediction`, `intervalToParams`, `combineState`) + type `PanelState` — xoá phần provider/context (RULE-03: giữ export cũ nếu còn caller khác).
4. Test: assert source mỗi page chỉ import service tương ứng; `pnpm test && pnpm build`; so sánh số request bằng fetch spy (1 cho temporal, 2 cho forecast/classification).

## 5. Phương án đã cân nhắc
- A: Giữ provider nhưng fetch lazy theo field (`enabled` flag) → vẫn cần context và khó tách ExpertInsightsPanel. **Không chọn.**
- B: Mỗi sub-route tự fetch (không context) → đúng mục tiêu, ít phụ thuộc. **Chọn.**
- C: Thêm cache Apollo/React Query → dependency mới, quá tay cho 6 endpoint. **Không chọn.**

## 6. Đánh đổi
| Khía cạnh | Tác động |
|---|---|
| Số request | 6 → 1 (hoặc 2 cho P5+P6) |
| Chuyển tab | Có thể fetch lại khi mount lại — chấp nhận (đúng dữ liệu mới nhất) |
| Bảo trì | Mỗi page tự quản loading/error — dùng chung `usePanel` nên không nhân bản nhiều |

## 7. Rủi ro
- `ExpertInsightsPanel` mất dữ liệu tổng hợp khi chuyển khỏi layout → xử lý bằng cách render trong page phù hợp.
- Test cũ `statistics-view.test.ts` / `analysis-query-params.test.ts` có assert source provider → cập nhật assertion, **không xoá test**.

## 8. Kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-23-statistics-subroute-load-thien.md`
- **Code test offline:** `apps/web/tests/statistics-subroute.test.ts` (mới, fetch spy + source assertions).
- **Lệnh:** `cd apps/web && pnpm test && pnpm build`; `notes_index.py --check`.

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng xác nhận "Duyệt — triển khai luôn" trong chat 2026-11-23; §9 Approved, scope giữ đúng mục 3.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ handle trong `.agents/team.md` đều duyệt được, không cần `ThienleDuc`). Sau Approved → build-implementation (plan/status/testcase), code, validation, CHECKPOINT 1.
