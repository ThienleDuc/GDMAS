# Testcase: Động cơ phân tích 4 Patterns chuỗi thời gian (Terminal 3)

## Metadata
- ID: 2026-11-12-analysis-four-patterns-son
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md
- Target: apps/api/src/gdmas/services/analysis/
- Test File: apps/api/tests/unit/test_analysis_patterns.py, apps/api/tests/unit/test_analysis_service.py, apps/api/tests/unit/test_analysis_runner.py
- Author: agent | son
- Created: 2026-11-12
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** các hàm thuần trong `analysis/patterns.py` (Pattern 1–4, chọn tần suất re-sampling, làm sạch JSON, snapshot),
  `AnalysisService.execute_cycle` (ghi snapshot + `service_runs`, DB rỗng, lỗi) và `analysis/runner.py` (`--once`).
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — không nhúng worker vào `main.py`).
  - [x] Chuẩn **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / kịch bản Demo §4).
  - [x] Unit test chạy **offline 100%** (mock HTTP/USGS/DB ngoài — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:**
  - `make_events(...)`: tạo DataFrame sự kiện xác định (seed cố định), `event_time` UTC, lat/lon trong WGS84, trải ~10 tuần.
  - Chuỗi tăng / giảm / phẳng dựng tay để kiểm `slope`, `trend_direction`.
  - Chuỗi có tín hiệu theo thứ trong tuần (cuối tuần nhiều sự kiện hơn) để kiểm mùa vụ chu kỳ tuần.
  - `FakeSession` thay `SessionLocal`; `_load_events` được thay bằng hàm trả DataFrame fixture (không cần PostgreSQL).
```json
{
  "sample_event": {
    "id": 1,
    "event_time": "2026-09-01T00:00:00Z",
    "latitude": 38.29,
    "longitude": 142.38,
    "depth_km": 24.5,
    "magnitude": 5.8
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Temporal — line chart 3 mức | Functional | fixture 10 tuần, `interval` = `day`/`week`/`month` | Tổng `event_count` = số sự kiện; `max ≥ avg`; nhãn kỳ đúng ngày bắt đầu | `PASS` |
| `TC-02` | Temporal — scatter & histogram | Functional | fixture | `timestamp` kết thúc `Z`; scatter ≤ giới hạn và lấy sự kiện mới nhất; tổng bin = số sự kiện; 5 bin chuẩn | `PASS` |
| `TC-03` | Chọn tần suất re-sampling | Boundary | trải 3 ngày / 20 ngày / 90 ngày | `day` / `week` / `month` (fallback < 7 ngày) | `PASS` |
| `TC-04` | Trend tăng / giảm / phẳng | Functional | số sự kiện/ngày tăng dần, giảm dần, hằng | `increasing` / `decreasing` / `stable`; dấu `slope` đúng; `trend_value` có đủ điểm | `PASS` |
| `TC-05` | Trend thiếu dữ liệu | Empty Data | < 3 kỳ | `status = insufficient_data`, `trend_direction = stable`, không NaN | `PASS` |
| `TC-06` | Seasonality chu kỳ tuần | Functional | 8 tuần có tín hiệu cuối tuần | 7 điểm `seasonal_line`, `cycle_index` 1..7, `seasonality_strength` ∈ [0, 1] và cao; nhãn thứ cuối tuần có `seasonal_factor` > 1 | `PASS` |
| `TC-07` | Seasonality không đủ chu kỳ | Empty Data | 5 ngày dữ liệu | `seasonal_line = []`, `seasonality_strength = null`, câu "chưa xác định mùa vụ rõ" (P-03) | `PASS` |
| `TC-08` | Ma trận tương quan Pearson | Functional | fixture | 5×5, đối xứng, đường chéo 1, mọi giá trị ∈ [-1, 1]; kèm Spearman & ghi chú không nhân quả | `PASS` |
| `TC-09` | Tương quan phương sai 0 | Boundary | toàn bộ `depth_km` bằng nhau | Hàng/cột `depth_km` là `null`, có trong `undefined_pairs`, không NaN | `PASS` |
| `TC-10` | 0 và 1 sự kiện | Empty Data | DataFrame rỗng; 1 dòng | Không ném `ZeroDivisionError`; `json.dumps(..., allow_nan=False)` thành công | `PASS` |
| `TC-11` | Snapshot đúng quy ước | Functional | `build_analysis_snapshot(fixture)` | Bộ (`analysis_type`, `time_interval`) = `time_series`×3, `trend`, `seasonality`, `correlation`; `period_start ≤ period_end` UTC | `PASS` |
| `TC-12` | Service — DB rỗng | Resilience | `_load_events` trả rỗng | Xóa snapshot cũ, không chèn `AnalysisResult`, `ServiceRun` `SUCCESS` với `records_processed = 0` | `PASS` |
| `TC-13` | Service — có dữ liệu | Functional | fixture | Chèn 6 `AnalysisResult` có `service_run_id`, `calculated_at` UTC; `records_processed` = số sự kiện; 1 commit cho cả snapshot | `PASS` |
| `TC-14` | Service — lỗi | Negative | `_load_events` ném ngoại lệ | `rollback`, `ServiceRun` `FAILED` + thông báo, không ném ra ngoài | `PASS` |
| `TC-15` | Runner `--once` | Functional | `main(["--once"])` | Gọi `execute_cycle` đúng 1 lần, không `sleep`, mã thoát 0 (1 khi thất bại) | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_analysis_patterns.py tests/unit/test_analysis_service.py tests/unit/test_analysis_runner.py -v
```

- **Ngày chạy cuối:** `2026-11-12`
- **Kết quả quan sát thật:** `36 passed in 2.89s` (test_analysis_patterns: 27, test_analysis_service: 5, test_analysis_runner: 4), chạy với `-W error::FutureWarning`. Ruff check/format sạch trên các file đã đụng. `python -m gdmas.services.analysis.runner --help` hiển thị `--once`.
- **Kiểm tích hợp thủ công trên PostgreSQL 16 (Docker T1, 2026-11-12):**
  - 9847 sự kiện thật (USGS `all_month`, 2026-10-13 → 2026-11-12) → `python -m gdmas.services.analysis.runner --once` mã thoát 0, 0.97s, 6 bản ghi `analysis_results` (`time_series` × day/week/month, `trend`/week, `seasonality`/day, `correlation`/day) cùng `service_run_id`.
  - Trend tuần: 3 tuần đầy đủ, 2 tuần dở dang có `is_complete=false`, p = 0.13 → `stable`. Seasonality tuần: độ mạnh 0.14 → "Chu kỳ yếu". Correlation 5×5 đối xứng, không NaN. Histogram tổng 9847.
  - Chạy lại: snapshot cũ bị thay (chỉ còn id 7–12). Cửa sổ 0 ngày (mô phỏng DB rỗng, không xóa dữ liệu thô): 0 bản ghi, run `SUCCESS` 0, `GET /api/v1/patterns` trả `success: false`; chạy lại tự tính đủ.
  - `GET /api/v1/patterns`: HTTP 200, ~34 ms; Pattern 1–4 `COMPUTED`.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
