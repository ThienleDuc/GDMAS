# Implementation Status: Loại bỏ dữ liệu giả, xử lý DB rỗng/DB lỗi, sửa SSE (Terminal 6)

## Metadata
- ID: 2026-11-12-api-empty-db-sse-tai
- Status: completed
- Started: 2026-11-12
- Last Updated: 2026-11-14
- Owner: agent | tai

---

## Tiến độ
Progress: 100%
Current Phase: Hoàn tất; chờ rà Frontend và mở PR

Completed:
- `errors.py` Envelope lỗi; xóa `MOCK_USGS_DATA` và 1248 khỏi `earthquakes.py`/`statistics.py`.
- `time_series_preview` tính từ DB (8 khoảng 3 giờ, UTC).
- Generator SSE chuyển sang `realtime/sse.py`; sửa thụt lề; thêm `earthquake_alert`.
- `events.py` `/events/stream`; `stream.py` route mỏng.
- `connection.py` thêm `connect_timeout=3`.
- `contracts/schemas/sse-event.json` bổ sung enum.
- 46 test Task 3 (29 earthquakes + 6 statistics + 11 SSE) đạt; 123 test toàn bộ `tests/unit` đạt.
In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-12-api-empty-db-sse-tai.md`, `conftest.py`, `test_earthquakes_routes.py`, `test_statistics_route.py`, `test_sse_stream.py` |
| Test liên quan (`pytest`) | PASS | `uv run pytest tests/unit -q` → 123 passed |
| Lint / Build (`ruff` / `pnpm build`) | PASS (có B008) | `ruff check tests/unit` đạt; `B008` ở `src/gdmas/api` là quy tắc chung |
| Notes check (`notes_index.py --check`) | NOT_RUN | chạy khi hoàn tất bộ tài liệu |
| Tài liệu cập nhật | DONE (một phần) | `contracts/schemas/sse-event.json` đã sửa; `API.md` §3.5 cần đối chiếu |

---

## Known Issues
- Frontend có thể đang đọc `detail` của 404 cũ; chưa rà `earthquake-api.ts`.
- Frontend có thể đang dựa vào 200 + mock khi DB lỗi; chưa báo `thien`.
- `ingestion_cycle_completed` và `earthquake_alert` chưa kiểm chứng trên luồng thật (worker ingestion đã dừng từ 2026-11-09); chỉ có unit test.
- `B008` ở các tệp route là quy tắc chung của repo.
- `API.md` §3.5 ví dụ SSE chưa khớp dạng `{event, data, timestamp}`.

---

## Deviations From Plan
- **Dự kiến:** chỉ sửa `earthquakes.py`, `statistics.py`, `stream.py`, `events.py`, `router.py`, `sse.py`, `sse-event.json`. **Thực tế:** thêm `connection.py` (`connect_timeout`) sau khi phát hiện request treo khi tắt Postgres. **Lý do:** không có timeout thì không bao giờ tới nhánh `DATABASE_ERROR`. **Quyết định:** thêm 1 dòng, ghi vào proposal §1 mục 6 và §4, rủi ro 7.
- **Dự kiến:** `sse-event.json` chỉ bổ sung enum. **Thực tế:** lần đầu bị format lại cả file. **Quyết định:** khôi phục bản gốc từ `origin/develop`, chỉ sửa đúng dòng enum để diff gọn.

---

## Decisions Made During Implementation
1. Envelope lỗi dùng chung `error_response` (Task 2 cũng dùng).
2. Generator SSE đặt ở `realtime/sse.py`, hai route cùng gọi (tránh import vòng).
3. `earthquake_alert` phát song song, không thay thế `earthquake_detected`/`ingestion_cycle_completed`.
4. DB lỗi thoáng qua → bỏ qua chu kỳ, không phát `database_cleared` nhầm.
5. Lần đầu đọc DB thành công sau khi lỗi → chỉ lấy mốc, không phát sự kiện.
6. `connect_timeout=3` đủ cho PostgreSQL local/Docker.
7. Timestamp SSE luôn UTC có hậu tố `Z`.

---

## Next Actions
- Rà `earthquake-api.ts`, `useSSE.ts` với Envelope lỗi mới và event mới.
- Báo `thien` về `contracts/schemas/sse-event.json` và `connection.py`.
- Kiểm tra thủ công `ingestion_cycle_completed`/`earthquake_alert` khi worker ingestion chạy.
- Đối chiếu `API.md` §3.5 với gói tin thực tế.
- Commit/push nhánh `fix/api-empty-db-sse`, mở PR vào `develop`.

---

## Last Update
2026-11-14 — Hoàn tất Task 3, 46 test Task 3 đạt, 123 test toàn bộ đạt.