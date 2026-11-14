# Testcase: Bộ kiểm thử offline cho Prediction Worker và REST/SSE

## Metadata
- ID: 2026-11-12-offline-test-suite-tai
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-offline-test-suite-tai.md
- Target: apps/api/src/gdmas/services/prediction/ (inference.py, service.py), apps/api/src/gdmas/api/routes/ (earthquakes.py, statistics.py, system.py, predictions.py, analysis.py, clusters.py), apps/api/src/gdmas/realtime/sse.py
- Test File: apps/api/tests/unit/conftest.py, test_prediction_inference.py, test_prediction_service.py, test_earthquakes_routes.py, test_statistics_route.py, test_system_prediction_routes.py, test_sse_stream.py
- Author: agent | tai
- Created: 2026-11-12
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** toàn bộ code của Task 1–3 (prediction, REST, SSE), cả hành vi đúng và hành vi lỗi (DB rỗng, DB lỗi, tham số sai, USGS không truy cập được).
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1).
  - [x] Chuẩn **UTC** (I3).
  - [x] Không fallback mock khi DB rỗng (I5 / Demo §4).
  - [x] Unit test chạy **offline 100%** (SQLite trong bộ nhớ + `BrokenSession` + `FakeSession` + `FakeRequest` — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `conftest.py` SQLite trong bộ nhớ (`StaticPool`, `check_same_thread=False`), ánh xạ `JSONB`→`JSON`, `BigInteger`→`INTEGER`, đăng ký hàm `floor`; `BrokenSession` ném `OperationalError` mọi thao tác; `FakeSession` cho service prediction; `FakeRequest` cho SSE (ngắt sau `n` lần); fixture ARIMA(1,0,0) nhỏ trên chuỗi 100 ± 10.
```json
{
  "sample_event": {
    "source_event_id": "ev0001",
    "event_time": "2026-11-12T09:00:00Z",
    "latitude": 10.0, "longitude": 100.0, "depth_km": 10.0, "magnitude": 4.0
  },
  "prediction_thresholds": [90.0, 105.0, 120.0],
  "sse_initial": {"success": true, "total": 5, "max_id": 10, "latest_run_id": 1}
}
```

---

## 3. Ma trận Kịch bản Test Cases (nhóm theo tệp)

| Nhóm | Tệp | Số test | Nội dung chính | Kết quả |
|---|---|---|---|---|
| Prediction inference | `test_prediction_inference.py` | 28 | `build_series` ghép history + DB, ngày thiếu `NaN`; `forecast_next` bất đẳng thức, cận dưới cắt 0, lịch sử ngắn, model type khác; `classify_next` tổng xác suất = 1, nhãn max, chuỗi mức cao; `label_of_count` biên; model_info; thiếu file model | `PASS` |
| Prediction service | `test_prediction_service.py` | 16 | `_complete_day_counts` rỗng/hôm nay/hôm qua/map rows; `_fill_actuals` điền đúng/DB thiếu/DB rỗng; `_predict` end-to-end, ghi đè, ưu tiên DB, cắt tên model 64, lỗi sạch; `execute_cycle` SUCCESS/FAILED/cắt lỗi 1000/thiếu model | `PASS` |
| Earthquakes route | `test_earthquakes_routes.py` | 29 | DB rỗng, DB lỗi (500, không 1248), không còn `MOCK_USGS_DATA`, phân trang, sắp xếp, lọc độ lớn/độ sâu/bounding box/thời gian/tìm kiếm, 400 đảo ngược, thiếu múi giờ = UTC, 404, `/sync` chèn/bỏ trùng/thiếu magnitude/USGS lỗi/DB lỗi | `PASS` |
| Statistics route | `test_statistics_route.py` | 6 | DB rỗng (toàn 0, series rỗng, không 1248), DB lỗi, KPI từ DB, time series 8 điểm, không phải danh sách cứng, sự kiện >24h bị loại | `PASS` |
| System + prediction routes | `test_system_prediction_routes.py` | 33 | `/health` OK/lỗi; `/system/status` 4 trạng thái + tổng sự kiện + lỗi; `/predictions`/`/classifications` rỗng/mới nhất/tổng xác suất/lỗi; `/analysis/*` rỗng/lỗi/correlation/temporal seeder/trend metric/seasonality components/tham số sai; `/clusters` rỗng/chuẩn hóa trường/lỗi | `PASS` |
| SSE test | `test_sse_stream.py` | 11 | Gói chào mừng, heartbeat định kỳ, `earthquake_detected` không alert, `earthquake_alert` M≥4.5, `ingestion_cycle_completed`, `database_cleared` khi tổng về 0, DB lỗi không phát cleared, DB lỗi rồi rỗng vẫn báo đúng 1 lần, gói tin + timestamp Z, broadcast, cả hai đường dẫn đăng ký | `PASS` |

*Tổng: 123 test.*

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit -q
cd apps/api && uv run ruff check tests/unit
cd apps/api && uv run ruff format --check tests/unit
```

- **Ngày chạy cuối:** `2026-11-14`
- **Kết quả quan sát thật:** `123 passed (~3.75 giây); ruff check All checks passed!; ruff format --check 7 files already formatted.`
- **Kiểm chứng test thật sự bắt lỗi:** Cố ý bỏ điều kiện "bỏ qua chu kỳ khi DB lỗi" trong SSE → 2 test báo lỗi; đổi ngưỡng M≥5.0 trong statistics → test KPI báo lỗi. Đã trả code về như cũ.
- **Hạn chế:** SQLite không chạy cú pháp PostgreSQL riêng (`func.timezone` trong statistics) — đã kiểm thủ công trên DB thật.
- **Cảnh báo không ảnh hưởng:** `PytestDeprecationWarning` (`asyncio_default_fixture_loop_scope`), `StarletteDeprecationWarning` (`httpx` testclient) — có sẵn từ trước.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`