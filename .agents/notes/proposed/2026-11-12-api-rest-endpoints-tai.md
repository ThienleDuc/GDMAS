# Proposal: Hoàn thiện các Endpoint REST API theo đặc tả API.md (Terminal 6)

## Metadata
- ID: 2026-11-12-api-rest-endpoints-tai
- Author: agent | tai
- Created: 2026-11-12
- Type: feature
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/api/routes/ (system.py, predictions.py, analysis.py, clusters.py, earthquakes.py), apps/api/src/gdmas/api/router.py
- Architecture Impact: docs/api/API.md
  <!-- API.md §3 hiện có mô tả các endpoint này nhưng chưa khớp hoàn toàn với code:
       - /analysis/temporal, /analysis/trend, /analysis/seasonality, /analysis/correlation
       - /clusters
       - /predictions, /classifications
       - bộ lọc start_time / end_time / bounding box của /earthquakes
       Cần đối chiếu lại để API.md khớp code (dạng field, mã lỗi) hoặc ngược lại.
       Ghi nhận drift, KHÔNG sửa API.md trong proposal này. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md (I1, I2, I3, I7)
  - docs/task/tai.md (Task 2, một phần Task 4)
  - docs/yeucaubatbuoc.md (§4 Demo)
  - docs/api/API.md (§2 Envelope, §3 các endpoint, §4 mã lỗi)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md (Task 1; /predictions và /classifications đọc hai bảng của Task 1)
  - .agents/notes/proposed/2026-11-12-api-empty-db-sse-tai.md (Task 3; dùng chung errors.py, earthquakes.py, router.py)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 6 (Database API, cổng 8000) là cổng giao tiếp duy nhất của Frontend. `docs/api/API.md` §3 cam kết nhiều endpoint cho màn hình giám sát 7 Terminals, View 03 (StatisticsPage) và MonitoringMapPage. Trong khi đó `router.py` mới đăng ký 4 router (`earthquakes`, `statistics`, `stream`, `patterns`).

### Vấn đề
Khảo sát mã nguồn trên `develop` cho thấy thiếu các endpoint đã cam kết:
1. **Nhóm hệ thống:** chưa có `/health`, `/system/status`.
2. **Nhóm 6 Patterns tách biệt:** chưa có `/analysis/temporal`, `/analysis/trend`, `/analysis/seasonality`, `/analysis/correlation`, `/predictions`, `/classifications`, `/clusters`.
3. **Bộ lọc `/earthquakes`:** chưa có `start_time`, `end_time`, `min_lat`, `max_lat`, `min_lon`, `max_lon`; chưa chuẩn hóa Envelope lỗi theo `API.md` §2/§4.

### Ảnh hưởng
`StatisticsPage.tsx` và `MonitoringMapPage.tsx` chưa lấy được chuỗi số liệu tách biệt cho từng biểu đồ và cụm DBSCAN. Màn hình giám sát 7 Terminals không có dữ liệu trạng thái từng worker. Demo §4 khó trình bày đầy đủ các Pattern.

---

## 2. Hiện trạng
- `apps/api/src/gdmas/api/router.py`: đăng ký 4 router (`earthquakes`, `statistics`, `stream`, `patterns`).
- `apps/api/src/gdmas/api/routes/`: chưa có `system.py`, `predictions.py`, `analysis.py`, `clusters.py`.
- `apps/api/src/gdmas/api/routes/earthquakes.py`: có lọc độ lớn/độ sâu/tìm kiếm, chưa có thời gian và bounding box.
- `apps/api/src/gdmas/models/analysis.py`, `clustering.py`, `prediction.py`, `service_run.py`: ORM đã đủ cột (không cần migration).
- `demo_seeder.py`: ghi `metrics_data` của analysis theo cấu trúc khác `API.md` (ví dụ `trend_line`, `seasonal_components` thay vì `line_chart`, `series`, `seasonal_line`).
- `apps/api/tests/unit/`: chưa có test cho các endpoint này.

---

## 3. Mục tiêu
- **Mục tiêu:**
  - Thêm `GET /health` và `GET /system/status` (kiểm tra `SELECT 1`, đọc `service_runs` mới nhất cho mỗi worker, tổng sự kiện và thời điểm sự kiện mới nhất).
  - Thêm `GET /analysis/temporal`, `/analysis/trend`, `/analysis/seasonality`, `/analysis/correlation` (đọc `analysis_results`).
  - Thêm `GET /predictions`, `GET /classifications` (đọc `prediction_results`, `classification_results`).
  - Thêm `GET /clusters` (đọc `clustering_results`).
  - Mở rộng `GET /earthquakes` với `start_time`, `end_time`, `min_lat`, `max_lat`, `min_lon`, `max_lon`; trả 400 `VALIDATION_ERROR` khi khoảng bị đảo ngược.
  - DB lỗi → 500 `DATABASE_ERROR`; bảng rỗng → 200 với `success: false`, `data: null`, `message` (giống `/patterns` để Frontend hiện Empty State).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Sửa `/statistics/earthquakes` cho khớp `API.md` §3.2 (Frontend đang phụ thuộc) — thuộc Task 3.
  - Sửa SSE, `/events/stream` — thuộc Task 3.
  - Sửa `demo_seeder.py`, ORM, migration, `main.py`, `contracts/`, `apps/web/`.
  - Ép định dạng `metrics_data` của analysis về đúng `API.md`; chờ `son` chốt (xem §7, rủi ro 3).

---

## 4. Giải pháp đề xuất
Tuân thủ **I1** (không đụng `main.py`), **I2 / RULE-03** (thêm tệp mới; `earthquakes.py`/`router.py` chỉ sửa phần bộ lọc và đăng ký, giữ nguyên đường dẫn), **I3** (UTC), **I7** (kèm test offline).

**Tệp dự kiến:**
- `apps/api/src/gdmas/api/routes/system.py` *(mới)*: `GET /health`, `GET /system/status`. Hàm `_iso` và `_worker_status` dùng chung.
- `apps/api/src/gdmas/api/routes/predictions.py` *(mới)*: `GET /predictions`, `GET /classifications`; hàm `_empty` dùng chung.
- `apps/api/src/gdmas/api/routes/analysis.py` *(mới)*: 4 route analysis. Chấp nhận cả tên trường của `API.md` (`line_chart`, `series`, `seasonal_line`) lẫn tên `demo_seeder.py` đang ghi (`trend_line`, `seasonal_components`); chuẩn hóa về dạng `API.md`.
- `apps/api/src/gdmas/api/routes/clusters.py` *(mới)*: `GET /clusters`; chuẩn hóa trường cụm (`id/lat/lon/events_count/avg_mag` → `cluster_id/center_latitude/center_longitude/event_count/avg_magnitude`).
- `apps/api/src/gdmas/api/routes/earthquakes.py` *(sửa)*: thêm tham số thời gian và bounding box; trả 400 `VALIDATION_ERROR` khi `min > max` hoặc `start_time > end_time`; tham số thời gian không có múi giờ coi là UTC.
- `apps/api/src/gdmas/api/router.py` *(sửa)*: đăng ký `system`, `predictions`, `analysis`, `clusters`.

**Envelope:** dùng `error_response` từ `api/errors.py` (đã tạo ở Task 3). DB lỗi → 500 `DATABASE_ERROR`. Bảng rỗng → 200 `{"success": false, "data": null, "message": "..."}`.

**Phụ thuộc dữ liệu của `son`:** `/analysis/trend` trả `trend_value: null` và `/analysis/temporal` trả `line_chart: []` khi `metrics_data` không có trường tương ứng. Không phải lỗi API; sẽ khớp khi `son` chốt định dạng.

---

## 5. Phương án đã cân nhắc
### Phương án A: Ép `metrics_data` về đúng `API.md` ngay trong route
Ưu: dữ liệu ra luôn đúng đặc tả. Nhược: dễ sai khi `son` chưa chốt định dạng; route phải biết nhiều biến thể. Không chọn.

### Phương án B: Chuyển nguyên `metrics_data` ra ngoài, không chuẩn hóa
Ưu: ít mã. Nhược: Frontend nhận cấu trúc khác nhau tùy phiên bản seeder, khó dùng. Không chọn.

### Phương án C: Đọc được cả hai bộ tên, chuẩn hóa về `API.md` (chọn)
Ưu: API không phải sửa khi `son` chốt; Frontend luôn nhận một dạng. Nhược: thêm mã chuẩn hóa trong route. **Chọn.**

### Phương án D: Trả 404 khi bảng rỗng
Ưu: đúng nghĩa "không có tài nguyên". Nhược: Frontend đang dùng `/patterns` với `success: false` để hiện Empty State; đổi sẽ phải sửa Frontend. Không chọn.

### Phương án E: Gộp `/system/status` vào `/health`
Ưu: một endpoint. Nhược: `/health` phải nhẹ (healthcheck), `/system/status` nặng hơn (đọc nhiều bảng). Không chọn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | Thêm 4 tệp route; thêm mã chuẩn hóa cho analysis/clusters |
| Hiệu năng | Thấp | Mỗi route một truy vấn "mới nhất"; `/system/status` đọc `service_runs` 4 lần |
| Bảo trì / Open-Closed | Tốt | Thêm tệp mới; `earthquakes.py`/`router.py` chỉ sửa phần bộ lọc và đăng ký |
| Độ tin cậy | Tăng | Bảng rỗng và DB lỗi phân biệt rõ; Frontend có dữ liệu cho mọi Pattern |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| 1. `API.md` §3 mô tả field khác code (ví dụ `/analysis/trend` trả `series` thay vì `trend_line`) | Trung bình | Trung bình | Route đọc cả hai bộ tên; cập nhật API.md sau khi `son` chốt |
| 2. `/predictions` / `/classifications` rỗng khi worker prediction chưa chạy | Trung bình | Thấp | Trả `success: false` + message; Frontend hiện Empty State |
| 3. `metrics_data` của analysis hiện thiếu `line_chart` / `trend_value` | Cao | Thấp | Ghi rõ trong §4; không phải lỗi API; chờ `son` |
| 4. `/clusters` phụ thuộc tên trường cụm của seeder | Trung bình | Thấp | Chuẩn hóa cả `id/lat/lon/events_count/avg_mag` lẫn tên chuẩn |
| 5. Cùng sửa `earthquakes.py` và `router.py` với Task 3 | Thấp | Thấp | Task 3 đã xong trước; Task 2 chỉ thêm bộ lọc và dòng đăng ký |
| 6. Thêm `Query` mới vào `/earthquakes` ảnh hưởng Frontend | Thấp | Thấp | Tham số mới đều tùy chọn; mặc định giữ hành vi cũ |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-12-api-rest-endpoints-tai.md`
- **Code test tự động (offline):** `apps/api/tests/unit/test_system_prediction_routes.py` (33 test), và các test bộ lọc `/earthquakes` đã có trong `test_earthquakes_routes.py` (29 test).
- **Cách kiểm chứng:**
  - `cd apps/api && uv run pytest tests/unit -q`, `uv run ruff check .`, `uv run ruff format --check .`
  - Test: `/health` 200 và 500 khi DB lỗi; `/system/status` trạng thái `active/inactive/failed/no_data`; `/predictions`, `/classifications` rỗng và có dữ liệu; `/analysis/*` 4 route rỗng và có dữ liệu; `/clusters` chuẩn hóa trường; `/earthquakes` thêm bộ lọc thời gian và bounding box, trả 400 khi đảo ngược.
  - Thủ công: mở `/api/v1/health`, `/api/v1/system/status`, `/api/v1/predictions`, `/api/v1/classifications`, `/api/v1/analysis/correlation`, `/api/v1/clusters`, `/api/v1/earthquakes?min_lat=-30&max_lat=0&min_magnitude=4`, `/api/v1/earthquakes?min_magnitude=7&max_magnitude=3` (phải ra 400).

---

## 9. Human Review
Decision: Approved
Reviewer: tai
Review Date: 2026-11-14
Comments: Tác giả tự duyệt theo docs/agent-workflow.md. Triển khai đã chạy và kiểm chứng: 33 test route đạt, 123 test toàn bộ `tests/unit` đạt. Chưa ép định dạng `metrics_data` của analysis; chờ `son` chốt.
Scope of Rejection: -

---

## 10. Next Action
Đã triển khai và kiểm thử tự động. Còn lại: rà `API.md` §3 với code, báo `thien` về dạng lỗi mới (Envelope), và mở PR. Xem `implemented/2026-11-12-api-rest-endpoints-tai/plan.md` và `status.md`.