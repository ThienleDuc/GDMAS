# Proposal: Sửa `docs/setup.md` để khởi chạy Docker đúng biến môi trường thật

## Metadata
- ID: 2026-11-22-docker-setup-env-doc-drift-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: docs
- Status: approved
- Priority: high
- Area: `docs/setup.md`, `scripts/tests/test_setup_docs.py`
- Architecture Impact: docs/setup.md
  <!-- Sự thật thay đổi: tên biến FE, giá trị base URL, cú pháp tạo .env, shape health, tên bảng, biến USGS, yêu cầu tắt mock. -->
- Related Docs:
  - docs/setup.md §1.5, §2.1, §2.2, §3.5, §5.1
  - apps/web/.env.example, apps/web/src/lib/api-client.ts, apps/web/src/services/sse-api.ts
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-api-docs-contract-sync-thien.md (đồng bộ API.md — không đụng setup.md)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Audit khởi chạy Docker theo `docs/setup.md` trên nhánh `chore/docker-fe-be-connection-thien` ngày 2026-11-22. Postgres + Alembic chạy OK; phát hiện tài liệu hướng dẫn sai nhiều điểm khiến người dùng không kết nối được FE↔BE thật (hoặc lầm tưởng đang dùng mock).

### Vấn đề
1. `docs/setup.md` §1.5B, §2.1, §2.2 ghi `VITE_API_URL` / `VITE_SSE_URL` — code FE đọc `VITE_API_BASE_URL` / `VITE_SSE_ENDPOINT` (`lib/api-client.ts:13`, `services/sse-api.ts:23`). Hơn nữa giá trị docs gồm `/api/v1` trong base URL, trong khi service lại nối `/api/v1/...` → nếu đổi đúng tên mà giữ giá trị sẽ ra URL nhân đôi prefix.
2. §2.2 dùng `echo "VITE_API_URL=...\nVITE_SSE_URL=..." > apps/web/.env` — `echo` bash không dịch `\n`, tạo file env chỉ có **1 dòng sai**.
3. §5.1 mẫu response health bỏ envelope: thực tế BE trả `{success:true, data:{status,database,version,timestamp,uptime_seconds}}`.
4. §3.5 liệt kê bảng `earthquakes`, `daily_aggregates`, … — thực tế migration tạo `earthquake_events`, `analysis_results`, `clustering_results`, `prediction_results`, `classification_results`, `service_runs`, `clustering_event_mapping`.
5. §1.5 ghi `USGS_API_BASE_URL=...fdsnws/event/1/query` — biến thực là `USGS_FEED_URL` (xem proposal `2026-11-22-sync-feed-env-config-thien`).
6. Không nhắc `VITE_API_MOCKING` phải `disabled`; local `apps/web/.env` đang `enabled` → FE dùng dữ liệu mock dù BE thật đang chạy (đúng điều người dùng muốn tránh).

### Ảnh hưởng
Người làm theo docs setup được một file `.env` FE vô dụng, smoke test so sánh sai shape, và có thể tưởng mock là dữ liệu thật. Ảnh hưởng trực tiếp mục tiêu "kết nối BE→FE thay vì mock".

---

## 2. Hiện trạng
- `docs/setup.md:127,130,158-159,209,109,388`
- `apps/web/src/lib/api-client.ts:11-16`, `apps/web/src/services/sse-api.ts:9-24`
- `apps/api/src/gdmas/api/routes/system.py:67-76`, `apps/api/alembic/versions/001_initial*.py`
- `apps/web/.env.example` chỉ có `VITE_API_BASE_URL`, `VITE_SSE_ENDPOINT` (không có `VITE_API_MOCKING`)
- `docker compose config --quiet` OK; Postgres healthy; `alembic upgrade head` OK (8 bảng)

---

## 3. Mục tiêu
- **Mục tiêu:** sửa 6 điểm drift trên thành giá trị/chuỗi lệnh đúng với code; thêm test offline chặn tái diễn; ghi rõ cách tắt mock.
- **Out of Scope:** không đổi code BE/FE, không đổi `docker-compose.yml`, không đổi `.env` thật (gitignored).

---

## 4. Giải pháp đề xuất
- Sửa `docs/setup.md`:
  - `VITE_API_BASE_URL=http://localhost:8000` (không kèm `/api/v1`), `VITE_SSE_ENDPOINT=/api/v1/events/stream` (hoặc `/api/v1/stream/earthquakes` cho legacy).
  - Thay `echo "...\n..."` bằng `printf '%s\n' 'VITE_API_BASE_URL=...' 'VITE_SSE_ENDPOINT=...' 'VITE_API_MOCKING=disabled' > apps/web/.env`.
  - Thêm dòng cảnh báo: muốn dùng dữ liệu BE thật thì `VITE_API_MOCKING` phải `disabled`; Docker compose không truyền biến này nên mặc định tắt.
  - Cập nhật mẫu health response có `success`/`data`; cập nhật danh sách bảng thật; đổi `USGS_API_BASE_URL` → `USGS_FEED_URL`.
- Thêm `scripts/tests/test_setup_docs.py` (offline, đọc text): assert docs chứa `VITE_API_BASE_URL`, `VITE_SSE_ENDPOINT`, `VITE_API_MOCKING`, `printf`, không còn `VITE_API_URL`/`VITE_SSE_URL`/`USGS_API_BASE_URL`, có `"success": true` trong mẫu health và tên bảng `earthquake_events`.

---

## 5. Phương án đã cân nhắc
### A. Giữ docs, đổi code FE để đọc VITE_API_URL
Ưu: docs không đổi. Nhược: phá 18 hàm service + contract đã duyệt, đụng I2. **Không chọn.**
### B. Sửa docs theo code thật
Ưu: đúng nguồn sự thật, diff nhỏ. Nhược: phải test chặn drift. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | Chỉ docs + 1 test file |
| Hiệu năng | Không đổi | Test đọc file |
| Bảo trì | Tốt | Test bắt drift ngay |
| Độ tin cậy | Tốt | Setup lặp lại được |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Docs có token cũ ở chỗ khác | Trung bình | Thấp | grep toàn bộ `docs/setup.md` trước/sau |
| Test quá cứng | Thấp | Thấp | Assert theo token, không cả câu |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Testcase:** `.agents/notes/testcase/2026-11-22-docker-setup-env-doc-drift-thien.md`
- **Test tự động:** `scripts/tests/test_setup_docs.py` (mới, offline)
- **Lệnh:** `python3 -m unittest scripts/tests/test_setup_docs.py -v`; `python3 scripts/notes_index.py --check`; `docker compose config --quiet`

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng xác nhận rõ trong chat "cho phép workflow chạy tự động, chỉ dừng lại hỏi và đề xuất giải pháp nếu nằm ngoài scope" — đây là ủy quyền trước cho cả 3 checkpoint và §9. Các sửa đổi nằm trọn trong docs setup + test docs, không đụng secret hay wire contract.
Scope of Rejection: -

---

## 10. Next Action
Sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, implement docs + test, validation, rồi tự động tiếp tục workflow theo ủy quyền.
