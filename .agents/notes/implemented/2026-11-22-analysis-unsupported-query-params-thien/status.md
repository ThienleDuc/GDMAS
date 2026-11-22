# Implementation Status: Bỏ query param không được BE hỗ trợ khỏi 3 route analysis

## Metadata
- ID: 2026-11-22-analysis-unsupported-query-params-thien
- Status: validation
- Started: 2026-11-22
- Last Updated: 2026-11-22
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — chờ CHECKPOINT 1

Completed:
- Đã duyệt §9 proposal (Reviewer: thien)
- Sinh đồng thời `implemented/{plan,status}` + `testcase/<id>.md`
- 3 hàm service giữ chữ ký (param `@deprecated`), không forward param BE không hỗ trợ
- `useOverviewData` bỏ cửa sổ 14 ngày giả, chỉ gửi `resample_freq:"D"` cho trend
- `apps/web/tests/analysis-query-params.test.ts` — 5/5 pass

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` (passed) + `apps/web/tests/analysis-query-params.test.ts` (5/5) |
| Test liên quan | PASS | `pnpm test` → 228/228; `uv run pytest -q` → 318 pass |
| Lint / Build | PASS | `pnpm build` OK (tsc -b + vite build) |
| Notes check | PASS | `notes_index.py --check`: OK |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- none

---

## Deviations From Plan
- Không chạy `git-ship.sh start` riêng: gom trên nhánh `chore/fe-be-api-linkage-audit` theo yêu cầu người dùng (một nhánh mới duy nhất).

---

## Decisions Made During Implementation
- Chọn sửa FE theo API.md thay vì mở rộng BE: `_latest()` của BE chỉ chọn bản ghi theo `period_start/period_end`, không cắt chuỗi `series` → không trả đúng cửa sổ 14 ngày; seasonality theo tháng cũng vô nghĩa với cửa sổ đó. Param cũ được giữ nhưng đánh dấu `@deprecated` để không vỡ caller (I2/RULE-03).

---

## Next Actions
- CHECKPOINT 1: chờ người dùng chọn `tiếp tục workflow` / `dừng lại` / `sửa thêm`. Chưa commit/push.

---

## Last Update
2026-11-22 — Validation xanh; chuyển `validation`, dừng CHECKPOINT 1.
