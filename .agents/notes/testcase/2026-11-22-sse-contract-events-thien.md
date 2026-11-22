# Testcase: SSE contract events (GAP-09)

## Metadata
- ID: 2026-11-22-sse-contract-events-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-sse-contract-events-thien.md
- Target: apps/api/src/gdmas/realtime/sse.py
- Test File: apps/api/tests/unit/test_sse_stream.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1/2. Mục tiêu & Fixtures
- Packet có `id` duy nhất, `retry` (ms) cả wire lẫn inner JSON; event `alert` phát cùng payload `earthquake_alert`.
- Fixture: state có `new_events` chứa event M≥4.5.

## 3. Ma trận
| TC | Tên | Kết quả | Status |
|---|---|---|---|
| TC-01 | id/retry wire | dict có `id`, `retry=5000` | PASS |
| TC-02 | id/retry inner JSON | payload JSON có `id`, `retry` | PASS |
| TC-03 | event alert | Có packet `alert` cùng data với `earthquake_alert` | PASS |
| TC-04 | Packet cũ | Bọc `{event,data,timestamp}`, timestamp `Z` vẫn đúng | PASS |

## 4. Lệnh
`cd apps/api && uv run pytest tests/unit/test_sse_stream.py && uv run pytest`, ruff.
Kết quả: targeted 16/16 PASS; full BE 317/317; ruff sạch; FE 217/217 + build PASS.

## 5. Bug Logs
- none
