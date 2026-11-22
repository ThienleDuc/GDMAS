# Implementation Plan: Bỏ query param không được BE hỗ trợ khỏi 3 route analysis

## Metadata
- ID: 2026-11-22-analysis-unsupported-query-params-thien
- Proposal: .agents/notes/proposed/2026-11-22-analysis-unsupported-query-params-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Đưa FE về đúng hợp đồng `docs/api/API.md` §3.3: `/analysis/trend` chỉ gửi `resample_freq`/`metric`; `/analysis/seasonality` và `/analysis/correlation` không gửi query param. Bỏ cửa sổ 14 ngày giả trong `useOverviewData` (BE vốn bỏ qua).

---

## 2. Phạm vi
### In Scope
- `apps/web/src/services/earthquake-api.ts` — giữ chữ ký 3 hàm, đánh dấu param deprecated, bỏ khỏi `buildQuery`
- `apps/web/src/features/overview/useOverviewData.ts` — bỏ `window`/`toUtcIso`, chỉ giữ `resample_freq:"D"` cho trend
- `apps/web/tests/analysis-query-params.test.ts` — file test offline mới (mock fetch, capture URL)
- `.agents/notes/testcase/2026-11-22-analysis-unsupported-query-params-thien.md` *(đặc tả sinh đồng thời)*
### Out of Scope
- `apps/api/**` (route BE giữ nguyên), `docs/api/API.md`, file test cũ đang pass (I7), lọc client-side / feature 14 ngày mới

---

## 3. Các bước
### Step 1 — Service
Trong `getTrendAnalysis`, `getSeasonalityAnalysis`, `getCorrelationAnalysis`: giữ interface param cũ (RULE-03), thêm comment `@deprecated` dẫn API.md §3.3, bỏ `start_time`/`end_time` khỏi object `buildQuery`; bỏ thêm `resample_freq` của seasonality.
### Step 2 — Overview
Xóa khối tính `start`/`window` và import `toUtcIso`; đổi lời gọi thành `getTrendAnalysis({resample_freq:"D"}, signal)` và `getSeasonalityAnalysis({}, signal)`.
### Step 3 — Test
Tạo `apps/web/tests/analysis-query-params.test.ts`: capture URL, assert trend có `resample_freq=D` nhưng không có `start_time`/`end_time`; seasonality/correlation không có query.
### Step 4 — Validation
`pnpm test`, `pnpm build`, `uv run pytest -q`, `notes_index --check`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không đổi endpoint, param BE hỗ trợ hay wire contract.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-analysis-unsupported-query-params-thien.md`
- [ ] **Đã tạo và chạy pass file unit test offline** `apps/web/tests/analysis-query-params.test.ts`
- [ ] Frontend: `cd apps/web && pnpm test` (≥217 pass) && `pnpm build`
- [ ] Backend: `cd apps/api && uv run pytest -q` (318 test — hồi quy)
- [ ] Notes: `python3 scripts/notes_index.py --check`
- [ ] Tài liệu: Architecture Impact = none → không cần cập nhật
- [ ] Kiểm chứng chức năng: URL trend/seasonality/correlation chỉ chứa param documented

---

## 6. Rủi ro khi làm
Bỏ nhầm `resample_freq` của trend → test assert URL vẫn có `resample_freq=D`; caller cũ truyền param deprecated → thực tế BE chưa từng lọc nên hành vi không đổi.

---

## 7. Rollback
Revert 2 file service/feature và xóa file test mới (do chính agent tạo trong lượt này).

---

## 8. Ghi chú
Triển khai trên nhánh `chore/fe-be-api-linkage-audit` theo yêu cầu người dùng gom audit + 3 fix trên một nhánh.
