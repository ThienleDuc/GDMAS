# Testcase: Động cơ phân tích 4 Patterns chuỗi thời gian (Terminal 3)

## Metadata
- ID: 2026-11-12-analysis-four-patterns-son
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md
- Target: apps/api/src/gdmas/services/analysis/
- Test File: apps/api/tests/unit/test_analysis_patterns.py, apps/api/tests/unit/test_analysis_service.py, apps/api/tests/unit/test_analysis_runner.py, apps/api/tests/integration/test_analysis_transactions.py, apps/api/tests/integration/test_ingestion_pipeline.py
- Author: agent | son
- Created: 2026-11-12
- Status: passed
- Related Bugs: BUG-son-004, BUG-son-005

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
  - Integration Analysis: SQLite `:memory:` chạy service/ORM thật; chỉ thay type variant `BigInteger`/`JSONB` cho dialect SQLite trong fixture rồi khôi phục, không sửa model/schema sản phẩm.
  - Integration Ingestion: `httpx.MockTransport` và session ghi nhận câu SQL; dùng parser, deduplicate, build statement và thống kê thật, không gọi USGS/DB ngoài. Test này kiểm kết nối các module, không thay cho kiểm ngữ nghĩa PostgreSQL thật.
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
| `TC-03` | Chọn tần suất re-sampling | Boundary | 3 / 20 / 40 / 200 ngày | `day` / `day` / `week` / `month`, theo ngưỡng thực tế trong plan/status | `PASS` |
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
| `TC-16` | Kỳ hiện tại còn dở dang (BUG-son-004) | Regression | 20 ngày đầy đủ + 1 ngày đang dở; mùa vụ mới có 13 ngày đầy đủ; biên nửa đêm UTC/+07 | Kỳ cuối không tham gia hồi quy/phân rã; nhận đầy đủ đúng nửa đêm UTC; service truyền started_at | `PASS` |
| `TC-17` | time_interval mùa vụ thiếu dữ liệu (BUG-son-005) | Regression | Snapshot 1 sự kiện | Bản ghi seasonality có time_interval=day, metrics interval=null và status=insufficient_data | `PASS` |
| `TC-18` | Giao dịch snapshot và phục hồi | Integration | SQLite tạm: snapshot cũ → 2 chu kỳ mới; DB rỗng → nạp lại; cố tình lỗi JSON sau DELETE | Chỉ 6 dòng mới nhất, giữ dữ liệu thô, gắn run đúng; DB rỗng không số giả; rollback giữ snapshot cũ và lưu FAILED | `PASS` |
| `TC-19` | Pipeline Ingestion qua nhiều module | Integration | MockTransport → parser/upsert thật; 2 phiên bản cùng ID + một bản cập nhật + tọa độ sai; lỗi db.execute | SQL giữ bản mới nhất, WHERE đúng; inserted/updated/skipped đúng; DB lỗi ghi FAILED và đóng session | `PASS` |
| `TC-20` | Kiểm chứng số học độc lập | Functional | Số sự kiện mỗi ngày bằng số tháng; các biến tuyến tính thuận/nghịch dựng tay | Tổng tháng 1/2/3 đúng 31/56/93; slope tăng; Pearson/Spearman có giá trị ±1 và daily_event_count đúng | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_analysis_patterns.py tests/unit/test_analysis_service.py tests/unit/test_analysis_runner.py -v
```

- **Ngày chạy cuối:** `2026-11-13`
- **Kết quả quan sát thật:** toàn backend `126 passed in 6.73s` (121 unit + 5 integration), không gọi mạng thật. Lệnh Windows: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -W error::FutureWarning -o asyncio_default_fixture_loop_scope=function`.
- **Trước/sau bản sửa:** bộ unit Analysis và integration mới trước sửa có `7 failed, 34 passed`; sau sửa bộ đó đạt `41 passed`, rồi toàn backend đạt 126 sau khi bổ sung pipeline và kiểm chứng số học. Các lỗi trước sửa gồm chưa có tham số as_of và interval mùa vụ sai.
- **Lint/format:** 8 tệp Python trong diff sạch; toàn repo còn 172 lỗi lint và 28 tệp cần format ngoài diff, không ghi PASS cho lint toàn backend.
- **Kiểm tích hợp thủ công trên PostgreSQL 16 (Docker T1, 2026-11-12):**
  - 9847 sự kiện thật (USGS `all_month`, 2026-10-13 → 2026-11-12) → `python -m gdmas.services.analysis.runner --once` mã thoát 0, 0.97s, 6 bản ghi `analysis_results` (`time_series` × day/week/month, `trend`/week, `seasonality`/day, `correlation`/day) cùng `service_run_id`.
  - Trend tuần: 3 tuần đầy đủ, 2 tuần dở dang có `is_complete=false`, p = 0.13 → `stable`. Seasonality tuần: độ mạnh 0.14 → "Chu kỳ yếu". Correlation 5×5 đối xứng, không NaN. Histogram tổng 9847.
  - Chạy lại: snapshot cũ bị thay (chỉ còn id 7–12). Cửa sổ 0 ngày (mô phỏng DB rỗng, không xóa dữ liệu thô): 0 bản ghi, run `SUCCESS` 0, `GET /api/v1/patterns` trả `success: false`; chạy lại tự tính đủ.
  - `GET /api/v1/patterns`: HTTP 200, ~34 ms; Pattern 1–4 `COMPUTED`.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `BUG-son-004` — ngày hiện tại còn dở dang bị coi là kỳ đầy đủ; đã fixed, có TC-16.
- `BUG-son-005` — snapshot mùa vụ thiếu dữ liệu ghi time_interval ngoài quy ước; đã fixed, có TC-17/TC-18.
