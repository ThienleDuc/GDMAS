<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — ngắn, sống, cập nhật liên tục. -->

# Implementation Status: Endpoint SSE chuẩn làm default (RD-17)

## Metadata
- ID: 2026-11-22-sse-standard-endpoint-thien
- Status: completed   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-22
- Last Updated: 2026-11-22
- Merged: 2026-11-22 — PR #59, merge commit `50c7a8914d5ea053c53646a079048bc1db88a6b5`
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: completed — PR #59 đã merge vào develop, nhánh local đã sync

Completed:
- Rẽ nhánh `feat/2026-11-22-sse-standard-endpoint-thien` từ `develop`
- Proposal §9 Approved + implemented plan/status + testcase (đồng thời)
- Đọc nhật ký proposal 1/2 tại `docs/task/fe-be-integration-ready.md` mục 4
- Step 1 — `useSSE.ts` ủy quyền `getEventsStreamUrl(endpoint)`, bỏ hằng trùng, re-export legacy, giữ chữ ký
- Step 2 — `DashboardLayout.tsx` gọi `useSSE()` (1 kết nối tại shell)
- Step 3 — `sse-default.test.ts` mới, 6 case (default/override/connect legacy/source assertions)
- Step 4 — ghi nhật ký proposal 3 mục 4
- Step 5 — user duyệt: `.env.example` default chuẩn; `dev-mock.ts` + test phục vụ cả 2 route SSE

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-22-sse-standard-endpoint-thien.md` + `sse-default.test.ts` |
| FE test (`pnpm test`) | PASS | 194/194 |
| FE build (`pnpm build`) | PASS | tsc + vite build sạch |
| Notes check | PASS | OK |
| Nhật ký vào `docs/task/fe-be-integration-ready.md` | DONE | proposal 3 ghi tại mục 4 |

---

## Known Issues
- none — 2 rủi ro đã được user duyệt và xử lý trong Step 5: `.env.example` sang route chuẩn, `dev-mock.ts` phục vụ cả 2 route.

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Không sửa `services/sse-api.ts` (đã có default chuẩn); chỉ gom hook về dùng service đó.
- Giữ nguyên chữ ký `useSSE(endpoint?)` và route legacy qua đối số/`VITE_SSE_ENDPOINT` (I2).

---

## Next Actions
- Không còn — phiên tiếp theo bắt đầu proposal 4 (**RD-16**) từ `develop`; đọc mục 4 `docs/task/fe-be-integration-ready.md` để có ngữ cảnh.

---

## Last Update
2026-11-22 — RD-17 hoàn tất: PR #59 merged (`50c7a89`), `sync` xong, status = completed.
