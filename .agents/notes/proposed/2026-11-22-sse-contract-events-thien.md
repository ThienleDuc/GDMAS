# Proposal: SSE phát `alert` và `id`/`retry` theo contract (GAP-09)

## Metadata
- ID: 2026-11-22-sse-contract-events-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: feature
- Status: approved
- Priority: low
- Area: apps/api/src/gdmas/realtime/, apps/api/tests/unit/
- Architecture Impact: none
- Related Docs: contracts/schemas/sse-event.json, docs/api/API.md §3.5, docs/task/fe-be-integration-gaps.md (GAP-09)
- Related Proposals: 2026-11-22-sse-marker-fields-thien (GAP-06)
- Related Bugs: none

---

## 1/2. Vấn đề & Hiện trạng
`sse-event.json` liệt kê event `"alert"` và field `id`/`retry` optional, nhưng BE `_packet()` (`realtime/sse.py:59-62`) chỉ trả `{event,data:json.dumps({event,data,timestamp})}` — không phát `alert`, không có id/retry. User quyết định **bổ sung BE**.

## 3. Mục tiêu
- `earthquake_alert` vẫn phát như cũ + thêm event `"alert"` cùng payload (alias theo contract).
- Mọi packet có `id` duy nhất và `retry` gợi ý, cả ở wire header lẫn inner JSON để FE đọc.

## 4. Giải pháp
1. `realtime/sse.py`: hằng `SSE_RETRY_MS = 5000`, bộ đếm `itertools.count`; `_packet()` thêm `id`, `retry` vào dict trả và vào payload JSON.
2. Nhánh `earthquake_alert`: `yield _packet("alert", data)` sau packet hiện tại (giữ nguyên `earthquake_alert`).
3. Test `test_sse_stream.py`: assert outer có `id`/`retry`, inner JSON có `id`/`retry`, có event `alert` cùng data; packet cũ vẫn đúng.

## 5/6/7. Cân nhắc/Đánh đổi/Rủi ro
Additive — FE đã đăng ký `alert` và có guard dedup theo `source_event_id`, không đổi UI. Rủi ro trùng marker: FE dedup theo field phẳng từ GAP-06.

## 8. Test
`cd apps/api && uv run pytest <file> && uv run pytest`, ruff; FE drift check.

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: User chọn "1,2,3 đều bổ sung BE" — GAP-09 phát event/field theo contract.
Scope of Rejection: -

## 10. Next Action
Code + test + merge tự động + nhật ký GAP-09.
