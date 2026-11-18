# Hợp Đồng Dữ Liệu & Giao Tiếp Giữa Các Dịch Vụ (Data Contracts)

Thư mục này đóng vai trò là kho lưu trữ trung tâm các **Hợp đồng dữ liệu (Data Contracts)**, định dạng trao đổi JSON Schema và các tệp mẫu payload giữa tầng Backend (FastAPI, Ingestion, Analysis, Prediction) và Frontend Client (React/TypeScript).

---

## 1. Mục Đích & Nguyên Tắc Hoạt Động

Trong kiến trúc tách rời của GDMAS (Microservices 7 Terminals), việc xác định trước hợp đồng dữ liệu mang lại các lợi ích cốt lõi:
1. **Phát triển song song (Parallel Development):** Frontend Developer có thể sử dụng các tệp mẫu trong `examples/` để dựng giao diện và biểu đồ ngay cả khi Backend chưa hoàn tất endpoint.
2. **Ngăn ngừa vỡ giao diện (Zero Breaking Changes):** Mọi sự thay đổi cấu trúc dữ liệu trả về từ API hoặc luồng SSE phải được cập nhật tại schema trước khi sửa mã nguồn triển khai.
3. **Tính nhất quán giữa Python & TypeScript:** Đảm bảo kiểu dữ liệu Pydantic Model ở Backend tương thích 1:1 với TypeScript Interfaces ở Frontend.

---

## 2. Cấu Trúc Thư Mục

```text
contracts/
├── README.md               # Tài liệu hướng dẫn sử dụng và nguyên tắc hợp đồng
├── schemas/                # Đặc tả JSON Schema chuẩn hóa cho các thực thể
│   ├── earthquake.json     # Schema bản ghi động đất đơn lẻ
│   ├── patterns.json       # Schema response GET /api/v1/patterns (6 Patterns chuỗi thời gian)
│   ├── sse-event.json      # Schema sự kiện thời gian thực qua Server-Sent Events
│   ├── health.json         # Schema GET /api/v1/health (Database API + PostgreSQL)
│   ├── system-status.json  # Schema GET /api/v1/system/status (7 Terminals + last_run)
│   ├── analysis.json       # Schema GET /api/v1/analysis/{temporal,trend,seasonality,correlation}
│   ├── predictions.json    # Schema GET /api/v1/predictions (Pattern 5 — t+1)
│   ├── classifications.json # Schema GET /api/v1/classifications (Pattern 6 — t+1)
│   ├── clusters.json       # Schema GET /api/v1/clusters (DBSCAN) + alias legacy
│   ├── aggregate.json      # (sẽ bổ sung) Schema tổng hợp dữ liệu ngày
│   └── prediction.json     # (đã thay bằng predictions.json + classifications.json)
└── examples/               # Dữ liệu JSON mẫu (Mock Payloads) phục vụ kiểm thử
    ├── earthquake_sample.json
    ├── patterns_sample.json # Mock đầy đủ 6 Patterns dùng làm fixture test Frontend
    ├── health_sample.json
    ├── system_status_sample.json  # Mock 7 Terminals (có 1 dịch vụ idle)
    ├── analysis_sample.json       # Bundle 4 payload temporal/trend/seasonality/correlation
    ├── predictions_sample.json
    ├── classifications_sample.json
    ├── clusters_sample.json       # Canonical cluster_id/center_latitude/...
    ├── timeseries_sample.json     # (sẽ bổ sung)
    └── cluster_sample.json        # (đã thay bằng clusters_sample.json)
```

---

## 3. Danh Mục Các Hợp Đồng Cốt Lõi

### 3.1 Thực thể Động đất (`schemas/earthquake.json`)
Mô tả một sự kiện địa chấn đơn lẻ theo shape canonical từ `docs/api/API.md` §3.2 và BE `apps/api/src/gdmas/schemas/earthquake.py`. ID nội bộ là integer; `source_event_id` là mã USGS. Timestamp dùng UTC ISO 8601 `Z`, tọa độ WGS84.

- Trường canonical: `id`, `source`, `source_event_id`, `event_time`, `latitude`, `longitude`, `depth_km`, `magnitude`, `magnitude_type?`, `place?`, `source_url?`, `ingested_at?`, `raw_data?`.
- Alias legacy (`time`, `depth`, `status`) chỉ optional để tương thích payload cũ; test/mock mới chỉ dùng canonical.
- Sample payload: [`examples/earthquake_sample.json`](examples/earthquake_sample.json).

### 3.2 Hợp đồng Luồng Sự kiện Realtime (`schemas/sse-event.json`)
Mô tả cấu trúc gói tin đẩy qua `GET /api/v1/stream/earthquakes` (mặc định) và `GET /api/v1/events/stream`. Fixture mẫu nằm tại [`examples/sse-event_sample.json`](examples/sse-event_sample.json) và chỉ dùng cho test/offline, không import runtime.
- `event ∈ {earthquake_detected, earthquake_alert, heartbeat, alert, ingestion_cycle_completed, database_cleared}`.
- `earthquake_detected` (route hiện có) và `earthquake_alert` (đặc tả `docs/api/API.md` §3.5) là **hai tên của cùng một loại sự kiện** → FE lắng nghe hợp của cả hai.
- Optional: `id` (header `id:`, chống trùng khi reconnect), `retry` (ms, gợi ý backoff).
- Mở rộng enum mang tính **additive** (không xoá/đổi giá trị cũ) — xem lịch sử `git log contracts/schemas/sse-event.json`.
```json
{
  "$id": "https://gdmas.local/schemas/sse-event.json",
  "type": "object",
  "properties": {
    "event": {
      "type": "string",
      "enum": ["earthquake_detected", "earthquake_alert", "heartbeat", "alert", "ingestion_cycle_completed", "database_cleared"]
    },
    "timestamp": { "type": "string", "format": "date-time" },
    "data": { "type": "object" }
  },
  "required": ["event", "timestamp", "data"]
}
```

---

### 3.3 Hợp đồng 6 Patterns Chuỗi Thời Gian (`schemas/patterns.json`)

Mô tả response của `GET /api/v1/patterns` — nguồn dữ liệu duy nhất cho trang Thống kê (Terminal 7) hiển thị 6 Patterns bắt buộc:

| Pattern | `id` | `type` | Trường `metrics` chính |
|---|---|---|---|
| 1. Biểu diễn theo thời gian | `pattern_1` | `time_series` | `line_chart`, `scatter_plot`, `histogram.magnitude_bins`, `interval`, `avg_depth` |
| 2. Trend sau Re-sampling | `pattern_2` | `trend` | `series[].actual_value/trend_value`, `slope`, `trend_direction`, `r_squared`, `p_value` |
| 3. Seasonality | `pattern_3` | `seasonality` | `components.seasonal_line`, `seasonality_strength`, `interpretation` |
| 4. Correlation Matrix | `pattern_4` | `correlation` | `variables[5]`, `matrix[5][5]`, `method`, `sample_size` |
| 5. Dự báo $t+1$ | `pattern_5` | `prediction` | `predicted_value`, `lower_bound`, `upper_bound`, `model_name` |
| 6. Phân loại $t+1$ | `pattern_6` | `classification` | `predicted_label`, `probability_scores`, `model_name` |

Quy ước bắt buộc:
- `status ∈ {COMPUTED, PENDING}`; `PENDING` hoặc `success: false` (CSDL trống) → Frontend **chỉ hiển thị Empty State**, không dùng số liệu dự phòng.
- `metrics.status = insufficient_data` → `seasonal_line`/`matrix` có thể rỗng và `null`; FE hiển thị `interpretation`/`note` của backend.
- Timestamp UTC ISO 8601 (hậu tố `Z`); tọa độ WGS84.
- **Optional fields của Pattern 5** (BE có thể bổ sung sau, FE đã sẵn sàng đọc): `metric_name`, `model_version`, `evaluation_metrics.{mae,rmse,baseline_mae,confidence_level}`, `generated_at`. Khi thiếu, FE hiển thị "chưa có dữ liệu kiểm định" — không bịa số.

Mock payload dùng cho test Frontend (offline): [`examples/patterns_sample.json`](examples/patterns_sample.json). Mock **không** được import vào runtime.

---

### 3.4 Hợp đồng Phân cụm Không gian (`schemas/clusters.json`)

Response của `GET /api/v1/clusters` — nguồn duy nhất cho lớp cụm DBSCAN trên bản đồ (T7) và mục "Cụm địa chấn" của trang Báo cáo.

**Trường canonical (bắt buộc dùng khi BE triển khai route):**

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `cluster_id` | integer ≥ 0 | Định danh cụm trong lần chạy |
| `center_latitude` | number `[-90, 90]` | WGS84 |
| `center_longitude` | number `[-180, 180]` | WGS84 |
| `event_count` | integer ≥ 0 | Số sự kiện thuộc cụm |
| `avg_magnitude` | number \| null | Độ lớn trung bình |
| `max_magnitude` | number \| null | Độ lớn cực đại |
| `radius_km` | number \| null | Bán kính phạm vi; thiếu → FE fallback `parameters.eps_km` |
| `name` | string \| null | Tên gợi nhớ (đới đứt gãy/khu vực) |
| `dominant_place` | string \| null | Địa danh xuất hiện nhiều nhất |

**Bảng ánh xạ alias → canonical** (payload legacy lấy từ `GET /api/v1/patterns` → `clustering_summary.clusters[]`, hiện do `demo_seeder.py` sinh):

| Alias legacy | Canonical |
|---|---|
| `id` | `cluster_id` |
| `lat` | `center_latitude` |
| `lon` | `center_longitude` |
| `events_count` | `event_count` |
| `avg_mag` | `avg_magnitude` |
| `name` | `name` (giữ nguyên) |

Quy tắc cho Frontend: adapter `normalizeClusters()` trong `apps/web/src/components/map/map-data.ts` **phải** chấp nhận cả hai shape; `max_magnitude`/`radius_km` thiếu thì hiển thị "—" / dùng `eps_km`, **không** bịa số.

Mock: [`examples/clusters_sample.json`](examples/clusters_sample.json).

---

### 3.5 Hợp đồng Sức khoẻ & Trạng thái Hệ thống (`schemas/health.json`, `schemas/system-status.json`)

- `GET /api/v1/health` → `{success, data{status ∈ healthy|degraded|unhealthy, database ∈ connected|disconnected, version?, timestamp, uptime_seconds?}}`.
- `GET /api/v1/system/status` → `{success, data{services{postgres, ingestion, analysis, clustering, prediction, api, frontend}, data_feed?, generated_at?}}`.
  - Mỗi service: `status ∈ running|active|idle|stopped|error|unknown`, `last_run?` (UTC), `cycle?` (`5m`, `1d`), `uptime_seconds?`, `records_processed?`, `error_message?`.
  - `last_run` là nguồn để Frontend cảnh báo dữ liệu cũ theo `docs/architecture.md` §9.4: chu kỳ **5 phút** → `stale` khi trễ > **15 phút**, `interrupted` khi trễ > **60 phút**; chu kỳ **1 ngày** → `stale` khi trễ > **26 giờ**. Thiếu `last_run` → `unknown` (không suy diễn là đang chạy).

Mock: [`examples/health_sample.json`](examples/health_sample.json), [`examples/system_status_sample.json`](examples/system_status_sample.json).

---

### 3.6 Hợp đồng 4 Endpoint Phân tích (`schemas/analysis.json`)

Một tệp schema chứa 4 `$defs`, mỗi route map 1:1:

| Route | `$ref` | Trường chính |
|---|---|---|
| `GET /api/v1/analysis/temporal` | `analysis.json#/$defs/temporalResponse` | `interval`, `line_chart[]`, `scatter_plot[]`, `histogram.magnitude_bins[]`, `stats?` |
| `GET /api/v1/analysis/trend` | `#/$defs/trendResponse` | `resample_freq`, `metric`, `series[{period,actual_value,trend_value?}]`, `slope?`, `r_squared?`, `p_value?`, `trend_direction?` |
| `GET /api/v1/analysis/seasonality` | `#/$defs/seasonalityResponse` | `components.seasonal_line[]`, `components.seasonality_strength?`, `components.interpretation?`, `period?` |
| `GET /api/v1/analysis/correlation` | `#/$defs/correlationResponse` | `variables[]`, `matrix[][]`, `method ∈ pearson|spearman`, `sample_size?` |

Quy ước: timestamp UTC ISO 8601 `Z`; `status = insufficient_data` hoặc mảng rỗng → FE hiển thị Empty State kèm `interpretation`/`note`, không thay bằng số liệu khác.

Mock: [`examples/analysis_sample.json`](examples/analysis_sample.json) — **bundle** 4 payload (`temporal`, `trend`, `seasonality`, `correlation`) dùng làm fixture test offline; mỗi giá trị validate theo `$defs.<name>Response` tương ứng.

---

### 3.7 Hợp đồng Dự báo & Phân loại t+1 (`schemas/predictions.json`, `schemas/classifications.json`)

- `GET /api/v1/predictions` (Pattern 5): `target_date` (`YYYY-MM-DD`), `forecasted_metric`, `predicted_value`, `confidence_interval{lower,upper}` **hoặc** alias phẳng `lower_bound`/`upper_bound` (payload `/patterns` hiện tại), `model_name?`, `model_version?`, `evaluation_metrics?{mae,rmse,baseline_mae,confidence_level}`, `generated_at?`.
- `GET /api/v1/classifications` (Pattern 6): `target_date`, `predicted_label` (canonical `LOW|MEDIUM|HIGH|CRITICAL`, BE có thể trả nhãn dài "Normal Activity" — FE chuẩn hoá), `probabilities{<label>: number}` **hoặc** alias `probability_scores` (payload `/patterns`), `evaluation_metrics?{accuracy,f1_macro,classes}`.

Mock: [`examples/predictions_sample.json`](examples/predictions_sample.json), [`examples/classifications_sample.json`](examples/classifications_sample.json).

---

### 3.8 Quy tắc chung cho Frontend khi Backend chưa triển khai endpoint

1. **Không mock, không số liệu dự phòng.** Endpoint 404/503 → `getOptionalApi()` trả `{ data: null, unavailable: true }` → UI hiển thị nhãn *"BE chưa triển khai endpoint"* (kèm đường dẫn) và Empty State.
2. **Không bịa trạng thái dịch vụ.** `last_run` thiếu → `unknown`; `p95`/`mae`/`rmse` thiếu → "chưa có dữ liệu".
3. **Ưu tiên nguồn dữ liệu thật đang chạy**: lớp cụm lấy `/api/v1/clusters`; nếu 404 thì fallback sang `GET /api/v1/patterns` → `clustering_summary` (đã có dữ liệu thật) qua adapter alias ở §3.4.
4. **Kiểm thử offline** dùng đúng các tệp trong `examples/`, không gọi mạng.

---

## 4. Tài liệu Liên quan
- Đặc tả API hoàn chỉnh: [API.md](GDMAS/docs/api/API.md)
- Thiết kế cơ sở dữ liệu: [ERD.md](GDMAS/docs/architecture/ERD.md)
- Hướng dẫn phát triển giao diện: [development.md](GDMAS/docs/guides/frontend/development.md)

