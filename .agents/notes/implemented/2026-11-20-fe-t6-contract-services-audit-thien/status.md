# Implementation Status: Kiểm chứng hợp đồng T6 ↔ T7 và lớp Services (Task T7.02)

## Metadata
- ID: 2026-11-20-fe-t6-contract-services-audit-thien
- Status: validation
- Started: 2026-11-20
- Last Updated: 2026-11-20
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — hoàn tất đối chiếu, guards, SSE service và test offline

Completed:
- Proposal §9 Approved bởi `thien` sau Changes Requested về SSE events/stream.
- Đã grep bugs liên quan FE/contracts: chỉ `BUG-thien-001` fixed, không có critical mở.
- Endpoint matrix: 17 hàm HTTP hiện có + SSE route mới `GET /api/v1/events/stream`; giải thích 20 trong task doc là 20 thao tác/nhóm, không cần thêm HTTP endpoint không được API.md định nghĩa.
- Thêm envelope/error/UTC/WGS84 guards; api-client giữ code/details và legacy `detail`.
- Query earthquakes validate UTC Z, thời gian tăng dần và bbox WGS84.
- Tạo `services/sse-api.ts`: default API.md route, hỗ trợ legacy override.
- Test offline endpoint, errors 0/400/404/500/503, query validation, SSE URL/events/close.
- Giữ tương thích endpoint detail trả raw entity; response mang marker `success` phải qua guard envelope.

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-20-fe-t6-contract-services-audit-thien.md`; services/contract-mocks/sse-api tests |
| Frontend build | PASS | `cd apps/web && pnpm build` — OK |
| Frontend tests | PASS | `cd apps/web && pnpm test` — 63/63 pass (baseline 56) |
| Notes check | PASS | `python3 scripts/notes_index.py --check` — OK |
| Tài liệu cập nhật | N/A | Architecture Impact: none; không đổi API/schema |

---

## Known Issues
- none

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Giữ service SSE mới ở `services/sse-api.ts`; không refactor `useSSE` nếu việc đó vượt phạm vi proposal.

---

## Next Actions
- Tạo testcase từ template; bắt đầu nhánh `feat/2026-11-20-fe-t6-contract-services-audit-thien`; đối chiếu endpoint trước khi sửa code.

---

## Last Update
2026-11-20 — Hoàn tất implementation và 63/63 test; chuyển Status sang `validation`, dừng CHECKPOINT 1.
