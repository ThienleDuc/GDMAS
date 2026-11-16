# `.agents/notes/bugs/`: Nhật ký lỗi GDMAS

Log phẳng, chỉ thêm, ghi mọi bug tìm thấy trong repo: cái gì hỏng, vì sao, đã sửa chưa. Trước khi debug,
grep ở đây trước: bug có thể đã biết, đã sửa rồi tái phát, hoặc cố ý để `wont-fix`.

Thư mục này **không** thuộc vòng đời proposal: `proposed/` và `implemented/` giữ *quyết định*, thư mục này
giữ *lỗi*. Bug cần bản sửa không-tầm-thường (> 1 file) vẫn phải có proposal; file bug link tới proposal.

## Cấu trúc

```text
bugs/
├── README.md                  # file này
├── INDEX.md                   # trỏ tới lệnh sinh bảng bug (không ghi tay)
├── _TEMPLATE.md               # copy để ghi bug mới
└── BUG-<handle>-NNN-<slug>.md # mỗi bug một file
```

## ID

`BUG-<handle>-NNN`: `<handle>` = handle người ghi bug (`./scripts/git-ship.sh me`), `NNN` = 3 chữ số **riêng từng người**, tăng dần (`001`, `002`...).
ID tiếp theo = số lớn nhất của đúng `<handle>` đó + 1 (xem qua `python3 scripts/notes_index.py --bugs` hoặc `ls .agents/notes/bugs/BUG-<handle>-*`). Không tái sử dụng hay đánh lại.

Ghi ID ở mọi chỗ đụng tới bug để `grep -r BUG-<handle>-NNN` thấy cả dấu vết: commit (`fix(scope): ... (BUG-son-001)`), tên/docstring test hồi quy, `Related Bugs:`.

## Mức độ (Severity)

| Severity | Khi nào | Ví dụ trong GDMAS | Xử lý |
|---|---|---|---|
| `critical` | Mất/hỏng dữ liệu; lộ secret/password; vi phạm I1 (nhúng worker vào `main.py`); sửa migration Alembic cũ (I4); toàn hệ thống/API chết | Commit `.env` hoặc DB password; sửa `001_initial_gdmas_schema.py`; nhúng vòng lặp cron vào `main.py`; mất bảng `earthquake_events` ngoài kịch bản Demo §4 | Dừng việc khác, báo người dùng ngay (dòng đầu: `CRITICAL BUG: BUG-<handle>-NNN — <tiêu đề>`), sửa trước mọi việc khác. Bắt buộc test hồi quy |
| `high` | Sai múi giờ (không dùng UTC) hoặc sai tọa độ (non-WGS84); mất idempotency Upsert `UNIQUE(source, source_event_id)`; một worker crash khi dữ liệu thiếu/NaN; SSE không đẩy sự kiện | `earthquake_events` bị trùng bản ghi khi chạy Ingestion; worker Analysis/Prediction crash khi DB rỗng ở Demo §4; timestamp lưu local time thay vì UTC | Sửa trong đợt đang làm hoặc kế tiếp |
| `medium` | Lỗi có cách né; biểu đồ 6 patterns lệch API; drift `docs/api/API.md` hoặc `contracts/`; UI không có Loading/Error/Empty state | Biểu đồ Trend/Seasonality lỗi render khi thiếu dữ liệu tháng; `API.md` sai tên trường payload | Lên lịch, ghi vào proposal liên quan |
| `low` | Lỗi nhỏ, chữ, giao diện, căn lề Dark Mode không ảnh hưởng dữ liệu | Sai chính tả nhãn tiếng Việt, lệch margin nhỏ | Sửa khi tiện |

Không chắc giữa hai mức thì chọn mức cao hơn và ghi lý do.

## Status

| Status | Ý nghĩa |
|---|---|
| `open` | Đã ghi nhận, chưa điều tra |
| `investigating` | Đang tái hiện / tìm nguyên nhân |
| `fix-in-progress` | Đã rõ nguyên nhân, đang sửa |
| `fixed` | Đã sửa **và** đã kiểm chứng (test hoặc tái hiện không còn lỗi) |
| `wont-fix` | Cố ý không sửa, bắt buộc ghi lý do |
| `duplicate` | Trùng bug khác, bắt buộc `Duplicate of: BUG-<handle>-NNN` |
| `invalid` | Không phải bug, bắt buộc ghi lý do |

## Quy trình

Bug thật: tạo file từ `_TEMPLATE.md` (bảng bug tự sinh qua `python3 scripts/notes_index.py --bugs`, không thêm dòng tay);
ghi `BUG-<handle>-NNN` vào commit và test hồi quy.

---

## Lưu ý môi trường đã biết (Setup / Local Environment)

1. **Lỗi App Execution Alias trên Windows 10/11:** Lệnh `python` bị chuyển hướng mở Microsoft Store → dùng `uv run python` trong `apps/api`.
2. **Xung đột Port 5432 PostgreSQL:** Postgres host chiếm port → dừng service host hoặc cấu hình port trong `.env`.
3. **Trùng lặp sự kiện USGS:** Đảm bảo giữ `INSERT ... ON CONFLICT (source, source_event_id) DO UPDATE`.
4. **Lệch Múi Giờ (UTC vs UTC+7):** Lưu `TIMESTAMPTZ` / `timezone.utc` ở DB & API; Frontend tự quy đổi hiển thị qua `utils/timezone.ts`.
