# Proposal: Endpoint `/earthquakes/sync` dùng `USGS_FEED_URL` từ cấu hình

## Metadata
- ID: 2026-11-22-sync-feed-env-config-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/api/src/gdmas/api/routes/earthquakes.py`, `apps/api/tests/unit/`
- Architecture Impact: none
  <!-- Không đổi endpoint, param hay payload; chỉ đọc cấu hình thay vì hardcode URL. -->
- Related Docs:
  - docs/setup.md §1.5 (biến `USGS_FEED_URL`)
  - apps/api/src/gdmas/core/config.py:32
- Related Proposals:
  - .agents/notes/proposed/2026-11-22-docker-setup-env-doc-drift-thien.md (sửa docs đặt tên biến)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Khi kiểm tra kết nối BE↔FE thật bằng Docker, người dùng bấm nút "Đồng bộ ngay" (`POST /api/v1/earthquakes/sync`) kỳ vọng dùng nguồn cấu hình qua `USGS_FEED_URL`.

### Vấn đề
`apps/api/src/gdmas/api/routes/earthquakes.py:25-26` định nghĩa hằng số module-level `USGS_FEED_URL = ".../all_day.geojson"` và dùng trực tiếp ở dòng 165. Trong khi đó `settings.USGS_FEED_URL` (`core/config.py:32`, mặc định `.../all_hour.geojson`) được worker Ingestion dùng qua `service.py:60` và được truyền vào container `ingestion` trong `docker-compose.yml:84`. Hệ quả:
- Biến môi trường `USGS_FEED_URL` trong `.env` / Docker **bị bỏ qua** bởi endpoint sync.
- Hai luồng cùng lấy USGS nhưng khác feed (`all_day` vs `all_hour`) → dữ liệu FE nhận sau sync không nhất quán với worker.

### Ảnh hưởng
Không tùy biến được nguồn dữ liệu (offline/mock server, feed khác), gây khó kiểm chứng BE→FE thật và sai kỳ vọng docs.

---

## 2. Hiện trạng
- `routes/earthquakes.py:25-26` hardcode; `:165` `resp = client.get(USGS_FEED_URL)`.
- `core/config.py:32-34` `settings.USGS_FEED_URL` mặc định `all_hour.geojson`.
- `services/ingestion/service.py:60` dùng `settings.USGS_FEED_URL`.
- `.env` / `.env.example`: `USGS_FEED_URL=.../all_hour.geojson`.

---

## 3. Mục tiêu
- **Mục tiêu:** endpoint sync dùng `settings.USGS_FEED_URL`; giữ hằng số cũ làm alias tương thích (I2); có test offline chứng minh URL được đọc từ cấu hình.
- **Out of Scope:** không đổi payload/response, không đổi worker Ingestion, không gọi USGS thật trong test (I7).

---

## 4. Giải pháp đề xuất
- Trong `routes/earthquakes.py`: thêm `from gdmas.core.config import settings`; đổi `client.get(USGS_FEED_URL)` → `client.get(settings.USGS_FEED_URL)`. Giữ nguyên hằng số `USGS_FEED_URL` module-level kèm comment "legacy alias — giữ cho import/test cũ (RULE-03)".
- Test offline `apps/api/tests/unit/test_sync_feed_config.py`: monkeypatch `settings.USGS_FEED_URL` và `httpx.Client` (hoặc patch module `httpx.Client.get`) để assert URL truyền vào đúng giá trị cấu hình, không phải hằng số hardcode; assert response vẫn `SyncResponse` envelope.

---

## 5. Phương án đã cân nhắc
### A. Xóa hằng số, chỉ dùng settings
Ưu: sạch. Nhược: phá import/test cũ có thể đang reference hằng số (I2). **Không chọn.**
### B. Giữ alias + dùng settings
Ưu: additive, an toàn, đúng cấu hình. Nhược: thừa 1 hằng số không dùng. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 import + 1 dòng + test |
| Hiệu năng | Không đổi | Đọc settings lúc request |
| Bảo trì | Tốt | Một nguồn cấu hình duy nhất |
| Độ tin cậy | Tốt | FE sync cùng feed với worker |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Test cũ assert hằng số hardcode | Trung bình | Thấp | Giữ alias; chạy toàn bộ 318 test |
| settings đọc .env thật trong test | Thấp | Trung bình | Monkeypatch settings trong fixture, không gọi mạng |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Testcase:** `.agents/notes/testcase/2026-11-22-sync-feed-env-config-thien.md`
- **Test tự động:** `apps/api/tests/unit/test_sync_feed_config.py` (mới, offline)
- **Lệnh:** `cd apps/api && uv run pytest tests/unit/test_sync_feed_config.py -q` rồi `uv run pytest -q`; `uv run ruff check . && uv run ruff format --check .`

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Ủy quyền tự động của người dùng trong chat ("cho phép workflow chạy tự động, chỉ dừng lại hỏi nếu ngoài scope"). Sửa additive trong T6 route, không đổi wire contract.
Scope of Rejection: -

---

## 10. Next Action
Sinh đồng thời implemented/testcase, implement + test, validation, tự động tiếp tục workflow.
