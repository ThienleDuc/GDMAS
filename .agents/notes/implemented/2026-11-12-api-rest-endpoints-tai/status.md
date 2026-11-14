# Implementation Status: Hoàn thiện các Endpoint REST API (Terminal 6)

## Metadata
- ID: 2026-11-12-api-rest-endpoints-tai
- Status: completed
- Started: 2026-11-12
- Last Updated: 2026-11-14
- Owner: agent | tai

---

## Tiến độ
Progress: 100%
Current Phase: Hoàn tất; chờ rà `API.md` và mở PR

Completed:
- Thêm `system.py`, `predictions.py`, `analysis.py`, `clusters.py`.
- Mở rộng `/earthquakes` với `start_time/end_time` và bounding box; trả 400 `VALIDATION_ERROR` khi đảo ngược.
- Đăng ký 4 router mới trong `router.py`.
- 33 test route mới đạt; 123 test toàn bộ `tests/unit` đạt.
In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-12-api-rest-endpoints-tai.md`, `test_system_prediction_routes.py` |
| Test liên quan (`pytest`) | PASS | `uv run pytest tests/unit -q` → 123 passed |
| Lint / Build (`ruff` / `pnpm build`) | PASS (có B008) | `ruff check tests/unit` đạt; `src/gdmas/api` còn `B008` là quy tắc chung |
| Notes check (`notes_index.py --check`) | NOT_RUN | chạy khi hoàn tất bộ tài liệu |
| Tài liệu cập nhật | N/A | cần đối chiếu `API.md` §3 (drift) |

---

## Known Issues
- `/analysis/trend` trả `trend_value: null` và `/analysis/temporal` trả `line_chart: []` khi `metrics_data` không có trường tương ứng — phụ thuộc `son`, không phải lỗi API.
- `B008` (`Depends`/`Query` trong default) ở các tệp route — quy tắc chung của repo; đề xuất `extend-immutable-calls`.
- Frontend có thể đang đọc `detail` của 404 cũ; Envelope mới dùng `error.code`.

---

## Deviations From Plan
- **Dự kiến:** ép `metrics_data` về `API.md` ngay. **Thực tế:** đọc cả hai bộ tên và chuẩn hóa về `API.md`. **Lý do:** `son` chưa chốt. **Quyết định:** theo phương án C.
- **Dự kiến:** `trend_value` luôn có. **Thực tế:** `null` khi seeder không ghi. **Lý do:** dữ liệu mẫu thiếu trường.

---

## Decisions Made During Implementation
1. Bảng rỗng trả 200 `success: false`, `data: null`, `message` (khớp `/patterns`) thay vì 404.
2. `/health` nhẹ (`SELECT 1`); `/system/status` nặng (đọc `service_runs` + `earthquake_events`).
3. `_worker_status`: `active` nếu chạy trong 2 chu kỳ gần nhất; `failed` nếu lần gần nhất FAILED; `no_data` nếu chưa chạy.
4. `/analysis/*` chấp nhận alias tên trường; chuẩn hóa về `API.md`.
5. `/clusters` chuẩn hóa `id/lat/lon/events_count/avg_mag` → tên `API.md`.
6. Tham số thời gian thiếu múi giờ coi là UTC.

---

## Next Actions
- Đối chiếu `API.md` §3 với code; cập nhật nếu cần.
- Báo `thien` về Envelope lỗi mới và bảng rỗng trả `success: false`.
- Commit/push nhánh `feature/task2-rest-endpoints`, mở PR vào `develop`.

---

## Last Update
2026-11-14 — Hoàn tất Task 2, 33 test route mới đạt, 123 test toàn bộ đạt.