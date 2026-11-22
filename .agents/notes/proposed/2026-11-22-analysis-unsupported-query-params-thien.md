<!-- Proposal sinh tự động từ audit đối chiếu FE↔BE API Service ngày 2026-11-22 (nhánh chore/fe-be-api-linkage-audit). -->

# Proposal: Bỏ query param không được BE hỗ trợ khỏi `/analysis/trend`, `/analysis/seasonality`, `/analysis/correlation`

## Metadata
- ID: 2026-11-22-analysis-unsupported-query-params-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/web/src/services/earthquake-api.ts`, `apps/web/src/features/overview/useOverviewData.ts`, `apps/web/tests/services.test.ts`
- Architecture Impact: none
  <!-- Không đổi endpoint, param được BE hỗ trợ hay wire contract; chỉ bỏ param FE gửi thừa mà FastAPI đã bỏ qua. -->
- Related Docs:
  - docs/api/API.md §3.3 (bảng param của Pattern 2/3/4)
  - docs/api/API.md §1 (I3 — hợp đồng là API.md)
  - contracts/README.md §3.1
- Related Proposals:
  - .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md
  - .agents/notes/proposed/2026-11-22-analysis-contract-fields-thien.md (GAP-02/03/04 — pass-through field, khác phạm vi)
  - .agents/notes/proposed/2026-11-21-overview-dashboard-thien.md (nguồn gốc cửa sổ 14 ngày)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Audit FE↔BE ngày 2026-11-22: FE có 14 hàm service REST, BE có 19 endpoint — mọi path đều khớp. Tuy nhiên có 3 hàm service nhận query param mà route BE tương ứng **không khai báo**.

### Vấn đề
- `getTrendAnalysis()` chấp nhận `start_time`/`end_time` và đưa vào URL (`earthquake-api.ts:214-230`), trong khi BE `/api/v1/analysis/trend` chỉ nhận `resample_freq`, `metric` (`analysis.py:154-159`).
- `getSeasonalityAnalysis()` chấp nhận `resample_freq`/`start_time`/`end_time` (`earthquake-api.ts:232-247`), trong khi BE `/api/v1/analysis/seasonality` **không nhận param nào** (`analysis.py:217`).
- `getCorrelationAnalysis()` chấp nhận `start_time`/`end_time` (`earthquake-api.ts:249-259`), trong khi BE `/api/v1/analysis/correlation` **không nhận param nào** (`analysis.py:256`).
- `useOverviewData.ts:67-77` tạo cửa sổ 14 ngày (`start_time`/`end_time` + `resample_freq:"D"`) và gửi cho cả trend lẫn seasonality.

FastAPI mặc định **bỏ qua** query param thừa (không 422) → FE tưởng đang lọc theo cửa sổ 14 ngày nhưng BE luôn trả bản ghi mới nhất. Đây là liên kết "giả": service layer hứa một khả năng mà T6 không cung cấp.

### Ảnh hưởng
- Không đổi dữ liệu hiển thị hiện tại (BE vốn đã bỏ qua param), nhưng tạo hiểu nhầm khi bảo trì: dev có thể tin rằng Overview đang dùng dữ liệu 14 ngày.
- Nếu sau này BE siết validate (extra query → 422) hoặc chuyển sang strict contract, 3 luồng Overview/Statistics sẽ lỗi ngoài ý muốn.
- Việc gửi cửa sổ 14 ngày cho seasonality (chu kỳ 12 tháng) về mặt ngữ nghĩa cũng không phù hợp với dữ liệu T3.

---

## 2. Hiện trạng
- `apps/web/src/services/earthquake-api.ts:214-259` — 3 hàm buildQuery có `start_time`/`end_time` (và `resample_freq` cho seasonality).
- `apps/web/src/features/overview/useOverviewData.ts:63-77` — `window = { resample_freq:"D", start_time: toUtcIso(start), end_time: toUtcIso(end) }`.
- `apps/api/src/gdmas/api/routes/analysis.py:154-159, 216-217, 255-256` — chữ ký route không có các param trên.
- `docs/api/API.md` §3.3 — chỉ `/analysis/temporal` có `start_time`/`end_time`; `/analysis/trend` có `resample_freq`/`metric`; seasonality/correlation không có param.
- `apps/web/src/features/statistics/statistics-data.tsx:85-89` — luồng Statistics đã đúng (chỉ gửi param được hỗ trợ), chứng minh luồng Overview là nơi lệch.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. FE chỉ gửi các query param mà API.md §3.3 cho phép với từng route analysis.
  2. Giữ nguyên chữ ký public của 3 hàm service (RULE-03/I2) nhưng đánh dấu param không được hỗ trợ là `@deprecated` và **không forward** xuống `buildQuery`.
  3. `useOverviewData` bỏ cửa sổ 14 ngày giả; chỉ giữ `resample_freq:"D"` cho trend, seasonality gọi `{}`.
  4. Có test offline chặn regression: URL gửi đi không chứa `start_time`/`end_time`/`resample_freq` cho các route không hỗ trợ.
- **Không nằm trong mục tiêu (Out of Scope):** không đổi BE, không đổi API.md, không thêm lọc client-side, không đổi dữ liệu/UI Overview. Nếu team muốn tính năng "lọc 14 ngày thật" → làm proposal feature riêng (cần sửa T3/T6).

---

## 4. Giải pháp đề xuất
- `apps/web/src/services/earthquake-api.ts` (additive, không xóa alias):
  - Giữ interface tham số cũ để caller cũ không vỡ type; thêm comment `@deprecated BE /analysis/trend chỉ nhận resample_freq, metric (API.md §3.3)`.
  - Bỏ `start_time`/`end_time` khỏi object truyền vào `buildQuery()` của `getTrendAnalysis`, `getSeasonalityAnalysis`, `getCorrelationAnalysis`; bỏ `resample_freq` khỏi `getSeasonalityAnalysis`.
- `apps/web/src/features/overview/useOverviewData.ts`:
  - Xóa khối tính `start`/`window`/`toUtcIso` (kèm import `toUtcIso` nếu không còn dùng chỗ khác).
  - `getTrendAnalysis({ resample_freq: "D" }, signal)`; `getSeasonalityAnalysis({}, signal)`.
- `apps/web/tests/services.test.ts` (hoặc file mới `apps/web/tests/analysis-query-params.test.ts`): mock `fetch`, capture URL; assert trend có `resample_freq=D` nhưng KHÔNG có `start_time`/`end_time`; seasonality & correlation có URL không query.

---

## 5. Phương án đã cân nhắc
### Phương án A: Sửa BE nhận thêm `start_time`/`end_time` cho 3 route
Ưu: FE giữ nguyên. Nhược: đụng T6 (chủ vùng `tai`) và dữ liệu T3 (chủ vùng `son`); `_latest` chỉ chọn bản ghi theo `period_start/period_end`, **không cắt chuỗi `series`** nên vẫn không trả đúng cửa sổ 14 ngày; seasonality theo tháng vô nghĩa với cửa sổ 14 ngày. **Không chọn.**
### Phương án B: Đưa FE về đúng hợp đồng API.md
Ưu: diff nhỏ, FE-only, hành vi dữ liệu không đổi, chặt chẽ theo I3 (API.md là nguồn sự thật). Nhược: mất tham số "giả" trong signature (giữ lại nhưng deprecated nên không ảnh hưởng caller). **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | Bỏ vài key khỏi `buildQuery`, xóa 5 dòng tính window |
| Hiệu năng | Không đáng kể | URL ngắn hơn |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký hàm, chỉ thêm comment deprecated |
| Độ tin cậy | Tốt | Không còn param bị BE bỏ qua im lặng |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Caller cũ vẫn truyền param deprecated và mong lọc | Thấp | Trung bình | Comment deprecated + test assert URL; thực tế BE chưa từng lọc nên không đổi hành vi |
| Bỏ nhầm `resample_freq` của trend | Thấp | Cao | Test assert URL trend vẫn có `resample_freq=D` |
| `toUtcIso` còn dùng chỗ khác trong file | Thấp | Thấp | Chạy `pnpm build` (tsc) bắt import thừa |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-analysis-unsupported-query-params-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`)*
- **Code test tự động (offline):** `apps/web/tests/analysis-query-params.test.ts` *(mới — mock fetch, không gọi mạng)*; giữ nguyên `apps/web/tests/services.test.ts`, `apps/web/tests/overview-page.test.ts`.
- **Cách kiểm chứng:** `cd apps/web && pnpm test` (217 test hiện hữu không được giảm) && `pnpm build`; `cd apps/api && uv run pytest -q` (318 test); `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng xác nhận rõ "Duyệt cả 3 (Recommended)" trong chat sau báo cáo audit FE↔BE 2026-11-22. Duyệt phạm vi §4 — bỏ param FE gửi thừa, giữ chữ ký service tương thích. Triển khai trên nhánh chore/fe-be-api-linkage-audit theo yêu cầu "checkout từ develop ra nhánh mới" của người dùng.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên xác nhận §9 (bất kỳ handle nào trong `.agents/team.md`) rồi mới `build-implementation`; sinh đồng thời `implemented/<id>/{plan.md,status.md}` và `testcase/<id>.md`.
