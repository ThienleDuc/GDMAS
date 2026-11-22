# Implementation Plan: SSE contract events (GAP-09)

## Metadata
- ID: 2026-11-22-sse-contract-events-thien
- Proposal: .agents/notes/proposed/2026-11-22-sse-contract-events-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
BE phát event `alert` và field `id`/`retry` đúng `sse-event.json`.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/realtime/sse.py`
- `apps/api/tests/unit/test_sse_stream.py`
- `docs/task/fe-be-integration-gaps.md`
- `.agents/notes/testcase/2026-11-22-sse-contract-events-thien.md`

### Out of Scope
`contracts/**` (đã định nghĩa sẵn), FE, docs API, GAP-12.

---

## 3–8
1. `_packet()` thêm id/retry (wire + inner JSON); 2. phát `alert` alias; 3. test; 4. validation + merge tự động.
Không migration/schema/env. Rollback: revert sse.py + test + nhật ký.
