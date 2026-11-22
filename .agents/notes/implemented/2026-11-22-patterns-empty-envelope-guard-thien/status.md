# Implementation Status: Sửa guard envelope cho response rỗng của `/patterns`

## Metadata
- ID: 2026-11-22-patterns-empty-envelope-guard-thien
- Status: completed
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
- `isApiEmptyEnvelope()` chấp nhận aggregate rỗng `/patterns` (không có `data`) — additive
- `fetchApi()` có comment giải thích ngoại lệ API.md §2
- `apps/web/tests/api-empty-envelope.test.ts` — 6/6 pass

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` (passed) + `apps/web/tests/api-empty-envelope.test.ts` (6/6) |
| Test liên quan | PASS | `pnpm test` → 228/228 (217 cũ + 11 mới); `uv run pytest -q` → 318 pass |
| Lint / Build | PASS | `pnpm build` OK |
| Notes check | PASS | `notes_index.py --check`: OK |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- none

---

## Deviations From Plan
- Không chạy `./scripts/git-ship.sh start fix/<id>` riêng cho từng proposal: người dùng yêu cầu checkout **một** nhánh mới từ develop (`chore/fe-be-api-linkage-audit`) và gom cả audit + 3 fix trên nhánh đó. Cả 3 proposal §9 ghi rõ quyết định này.

---

## Decisions Made During Implementation
- Không đổi BE/services trả `data:null` để tránh vi phạm `contracts/schemas/patterns.json` và API.md §2 (GAP-11); chỉ mở rộng guard FE với điều kiện chặt (có `total_patterns` + `patterns` + `message`, không có `error`/`data`).

---

## Next Actions
- CHECKPOINT 1: chờ người dùng chọn `tiếp tục workflow` / `dừng lại` / `sửa thêm`. Chưa commit/push.

---

## Last Update
2026-11-22 — Validation xanh; CHECKPOINT 1 & 2 xác nhận; PR #83 merge vào develop tại `079d6dd` → `completed`.
