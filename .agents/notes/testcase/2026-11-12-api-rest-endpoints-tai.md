# Testcase: Các Endpoint REST mới — /health, /system/status, /predictions, /classifications, /analysis/*, /clusters, bộ lọc /earthquakes

## Metadata
- ID: 2026-11-12-api-rest-endpoints-tai
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md
- Target: apps/api/src/gdmas/api/routes/ (system.py, predictions.py, analysis.py, clusters.py, earthquakes.py)
- Test File: apps/api/tests/unit/test_system_prediction_routes.py (+ phần bộ lọc trong test_earthquakes_routes.py)
- Author: agent | tai
- Created: 2026-11-12
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** 7 endpoint mới + bộ lọc `/earthquakes`; Envelope lỗi; trạng thái bảng rỗng và DB lỗi.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1).
  - [x] Chuẩn **UTC** (I3).
  - [x] Không fallback mock khi DB rỗng (I5).
  - [x] Unit test chạy **offline 100%** (SQLite trong bộ nhớ + `BrokenSession` — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `conftest.py` dựng SQLite trong bộ nhớ dùng đúng model ORM thật; `BrokenSession` mô phỏng PostgreSQL mất kết nối; `add_event` tạo sự kiện mẫu M4.0 cách đây 1 giờ.
```json
{
  "service_run_active": {"service_name": "ingestion", "status": "SUCCESS", "age_min": 2},
  "service_run_inactive": {"service_name": "ingestion", "status": "SUCCESS", "age_days": 3},
  "service_run_failed": {"service_name": "ingestion", "status": "FAILED", "age_min": 2},
  "prediction_row": {"target_date": "2026-11-12", "predicted_value": 120.0, "lower_bound": 100.0, "upper_bound": 150.0},
  "cluster_row": {"clusters": [{"id": 0, "lat": 38.3, "lon": 142.4, "events_count": 32, "avg_mag": 5.4}]}
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | `/health` OK | Functional | DB sống | `200`, `status=healthy`, `database=connected` | `PASS` |
| `TC-02` | `/health` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR` | `PASS` |
| `TC-03` | `/system/status` chưa có run | Resilience | DB rỗng | Các worker = `no_data`; `data_feed.total_events=0` | `PASS` |
| `TC-04` | `/system/status` active/inactive/failed | Functional | 3 mức tuổi + trạng thái | `active` / `inactive` / `failed` đúng | `PASS` |
| `TC-05` | `/system/status` tổng sự kiện | Functional | 2 sự kiện | `total_events=2`, `latest_event_time` có | `PASS` |
| `TC-06` | `/system/status` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR` | `PASS` |
| `TC-07` | `/predictions` bảng rỗng | Resilience | Không có bản ghi | `200` `success=false`, `data=null`, `message` | `PASS` |
| `TC-08` | `/predictions` bản ghi mới nhất | Functional | 2 bản ghi | Lấy `target_date` lớn nhất; $0 \le \text{lower} \le \text{predicted} \le \text{upper}$ | `PASS` |
| `TC-09` | `/predictions` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR` | `PASS` |
| `TC-10` | `/classifications` bảng rỗng | Resilience | Không có | `200` `success=false`, `data=null` | `PASS` |
| `TC-11` | `/classifications` nhãn + xác suất | Functional | 1 bản ghi | `predicted_label`, tổng `probabilities` $\approx 1.0$ | `PASS` |
| `TC-12` | `/classifications` DB lỗi | Negative | `BrokenSession` | `500` | `PASS` |
| `TC-13` | `/analysis/*` bảng rỗng | Resilience | 4 route | `200` `success=false`, `data=null` | `PASS` |
| `TC-14` | `/analysis/*` DB lỗi | Negative | 4 route | `500 DATABASE_ERROR` | `PASS` |
| `TC-15` | `/analysis/correlation` có dữ liệu | Functional | `variables`, `matrix` | Trả đúng, `method=pearson` | `PASS` |
| `TC-16` | `/analysis/temporal` nhận tên seeder | Functional | `analysis_type=time_series`, histogram dict | `magnitude_bins` chứa `{bin, count}` | `PASS` |
| `TC-17` | `/analysis/trend` map metric → series | Functional | `trend_line` với `event_count`/`avg_magnitude` | `series[0].actual_value` đúng theo metric | `PASS` |
| `TC-18` | `/analysis/seasonality` map components | Functional | `seasonal_components` | `seasonal_line[0].seasonal_factor` đúng | `PASS` |
| `TC-19` | `/analysis/temporal` tham số sai | Negative | `interval=year`, `start_time` rác, `start > end` | `400`/`422` | `PASS` |
| `TC-20` | `/analysis/trend` metric sai | Negative | `metric=x` | `422` | `PASS` |
| `TC-21` | `/clusters` bảng rỗng | Resilience | Không có | `200` `success=false`, `data=null` | `PASS` |
| `TC-22` | `/clusters` chuẩn hóa trường | Functional | Cụm `id`/`lat`/`lon`/`events_count`/`avg_mag` | `cluster_id`/`center_latitude`/`center_longitude`/`event_count`/`avg_magnitude` | `PASS` |
| `TC-23` | `/clusters` DB lỗi | Negative | `BrokenSession` | `500` | `PASS` |
| `TC-24` | `/earthquakes` lọc độ lớn | Functional | `min=4`, `max=6` | Chỉ sự kiện trong khoảng | `PASS` |
| `TC-25` | `/earthquakes` lọc độ sâu | Functional | `min_depth=100` | Chỉ sự kiện sâu | `PASS` |
| `TC-26` | `/earthquakes` bounding box | Functional | `min_lat=-30`, `max_lat=0`, `min_lon=-180`, `max_lon=-160` | Đúng 2 sự kiện | `PASS` |
| `TC-27` | `/earthquakes` khoảng thời gian ISO UTC | Functional | `start_time`/`end_time` | Chỉ sự kiện trong khoảng | `PASS` |
| `TC-28` | `/earthquakes` thời gian thiếu múi giờ = UTC | Boundary | `2026-11-09T09:00:00` | Đúng sự kiện | `PASS` |
| `TC-29` | `/earthquakes` tìm kiếm place/id | Functional | `search=fiji` / `search=ev0002` | Đúng sự kiện | `PASS` |
| `TC-30` | `/earthquakes` khoảng đảo ngược | Negative | `min_magnitude=7&max_magnitude=3` (+ depth, lat, lon, time) | `400 VALIDATION_ERROR`, đúng field | `PASS` |
| `TC-31` | `/earthquakes` thời gian sai định dạng | Negative | `start_time=hôm qua` | `400`, `field=start_time` | `PASS` |
| `TC-32` | `/earthquakes/{id}` không tồn tại | Negative | `99999999` | `404 RESOURCE_NOT_FOUND` | `PASS` |
| `TC-33` | `/earthquakes` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR`, không có `1248` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_system_prediction_routes.py -v
cd apps/api && uv run pytest tests/unit -q
cd apps/api && uv run ruff check tests/unit
cd apps/api && uv run ruff format --check tests/unit
```

- **Ngày chạy cuối:** `2026-11-14`
- **Kết quả quan sát thật:** `33 test route mới đạt; toàn bộ tests/unit 123 passed; ruff check All checks passed!; ruff format --check 7 files already formatted.`
- **Hạn chế:** SQLite không chạy cú pháp PostgreSQL riêng; đã kiểm chứng thủ công trên DB thật qua các URL trong hội thoại.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`