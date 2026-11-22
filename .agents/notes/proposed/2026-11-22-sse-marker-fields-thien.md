# Proposal: SSE packet bổ sung field phẳng cho marker bản đồ (GAP-06)

## Metadata
- ID: 2026-11-22-sse-marker-fields-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/realtime/, apps/api/tests/unit/
- Architecture Impact: none
  <!-- Không đổi wire contract: outer {event,data,timestamp} và mảng new_events/alert_events giữ nguyên.
       Chỉ bổ sung field phẳng vào inner data theo API.md:455 — additive. -->
- Related Docs: docs/api/API.md §3.5, contracts/schemas/sse-event.json, docs/task/fe-be-integration-gaps.md (GAP-06)
- Related Proposals: 2026-11-12-api-empty-db-sse-tai (generator), 2026-11-21-monitoring-leaflet-map-markers-thien (FE `applySseEvent`), 2026-11-22-sse-standard-endpoint-thien (đã merge)
- Related Bugs: none

---

## 1. Vấn đề
BE phát `earthquake_detected`/`earthquake_alert` với `data` chỉ chứa `title/message/new_events[]/alert_events[]`. FE `monitoring-view.ts:112-118` đọc trực tiếp `payload.data.latitude/magnitude` → ba giá trị đều `null` → marker realtime gần như không bao giờ được thêm trên bản đồ, dù `docs/api/API.md:455` mô tả inner data dạng phẳng.

---

## 2. Hiện trạng
- `realtime/sse.py:59-62` `_packet()` — bọc `{event,data:json.dumps(payload),timestamp}` đúng contract.
- `sse.py:269-279` `earthquake_detected` — inner data có `new_events`, `latest_event`.
- `sse.py:284-293` `earthquake_alert` — inner data có `alert_events`, `max_magnitude`.
- `_event_to_dict()` `sse.py:43-56` đã trả đủ field phẳng (`source_event_id`, `event_time`, `latitude`, `longitude`, `depth_km`, `magnitude`, `place`, `magnitude_type`, `source_url`).
- FE `sse.ts:19-28` `SSEEventPayload` chấp nhận field phẳng; `contracts/schemas/sse-event.json` chỉ ràng `data` là object (không `additionalProperties:false`).

---

## 3. Mục tiêu
- Inner `data` của 2 packet earthquake có thêm field phẳng từ sự kiện **đầu tiên** trong mảng; giữ nguyên mảng gốc, bọc ngoài, event names, backoff.
- **Out of Scope:** đổi FE, contract/schema, event names khác (`alert`, `id`/`retry` — GAP-09), packet `ingestion_cycle_completed`.

---

## 4. Giải pháp đề xuất
1. Thêm hàm thuần `_marker_fields(events: list[dict]) -> dict` trong `realtime/sse.py`: lấy phần tử đầu, copy các key từ `_EVENT_MARKER_FIELDS` có mặt; trả `{}` khi mảng rỗng.
2. 2 packet `earthquake_detected` (`:269-279`) và `earthquake_alert` (`:284-293`): `**_marker_fields(new_events)` / `**_marker_fields(alerts)` — không xóa field cũ (RULE-03).
3. Test `apps/api/tests/unit/test_sse_stream.py` bổ sung case: inner data có field phẳng, outer vẫn `{event,data,timestamp}`, mảng rỗng → không emit field phẳng.

---

## 5. Phương án đã cân nhắc
- **A (chọn):** BE bổ sung field phẳng — đúng API.md, FE không đổi, additive.
- B: FE đọc `new_events[0]` — sửa FE, nhưng task yêu cầu "thay đổi phía BE để đồng bộ FE".
- C: thay inner data bằng 1 event đơn — breaking change, mất danh sách cho consumer khác.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 helper + 2 dòng `**` |
| Hiệu năng | Không đổi | Copy vài key |
| Bảo trì / OCP | Tốt | Giữ field/mảng cũ |
| Độ tin cậy | Tăng | Marker realtime hoạt động |

---

## 7. Rủi ro
- Nhiều sự kiện trong mảng → chỉ lấy sự kiện đầu làm field phẳng; mảng gốc vẫn đủ cho FE xử lý tiếp.
- Payload SSE lớn hơn vài trăm byte — chấp nhận được.

---

## 8. Cách kiểm chứng
- Testcase: `.agents/notes/testcase/2026-11-22-sse-marker-fields-thien.md`
- Test: bổ sung `apps/api/tests/unit/test_sse_stream.py`
- Lệnh: `cd apps/api && uv run pytest <file> && uv run pytest`, ruff; FE test/build; notes check.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`) xác nhận "được" để tiếp tục GAP-06 theo nhật ký `docs/task/fe-be-integration-gaps.md` mục 5. Giới hạn §3; chỉ BE, additive, không đổi wire contract.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` → code + test → validation → dừng CHECKPOINT 1 → ghi nhật ký GAP-06.
