# TÀI LIỆU ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (REST API SPECIFICATION)

# HỆ THỐNG GIÁM SÁT VÀ PHÂN TÍCH THIÊN TAI TOÀN CẦU (GDMAS)

- **Dự án:** Global Disaster Monitoring & Analysis System (GDMAS)
- **Phiên bản API:** `v1`
- **Giao thức:** HTTP / RESTful & Server-Sent Events (SSE)
- **Định dạng dữ liệu:** JSON (`application/json`) / Event Stream (`text/event-stream`)
- **Base URL:** `http://localhost:8000/api/v1`

---

## Mục lục
1. [Nguyên tắc thiết kế & Tiêu chuẩn giao tiếp](#1-nguyên-tắc-thiết-kế--tiêu-chuẩn-giao-tiếp)
2. [Cấu trúc Envelope chuẩn của API](#2-cấu-trúc-envelope-chuẩn-của-api)
3. [Danh mục Endpoints chi tiết](#3-danh-mục-endpoints-chi-tiết)
   - [3.1. Nhóm Hệ thống & Giám sát (System & Health)](#31-nhóm-hệ-thống--giám-sát-system--health)
   - [3.2. Nhóm Dữ liệu Động đất (Earthquake Events)](#32-nhóm-dữ-liệu-động-đất-earthquake-events)
   - [3.3. Nhóm 6 Patterns Phân Tích Chuỗi Thời Gian (Time-Series Analysis)](#33-nhóm-6-patterns-phân-tích-chuỗi-thời-gian-time-series-analysis)
   - [3.4. Nhóm Phân Cụm Sự Kiện (Clustering)](#34-nhóm-phân-cụm-sự-kiện-clustering)
   - [3.5. Nhóm Sự kiện Thời gian thực (Real-time SSE)](#35-nhóm-sự-kiện-thời-gian-thực-real-time-sse)
4. [Bảng mã lỗi chuẩn (Error Codes)](#4-bảng-mã-lỗi-chuẩn-error-codes)

---

## 1. Nguyên tắc thiết kế & Tiêu chuẩn giao tiếp

- **Kiến trúc phân tầng:** Frontend chỉ giao tiếp duy nhất với Backend thông qua Database API (`gdmas-api`), không kết nối trực tiếp với PostgreSQL hay các service phân tích ngầm.
- **Quy chuẩn thời gian:** Mọi mốc thời gian đều sử dụng định dạng chuẩn **ISO 8601** theo múi giờ **UTC** (`YYYY-MM-DDTHH:mm:ssZ`).
- **Hệ tọa độ địa lý:** Sử dụng chuẩn **WGS84** (Vĩ độ: $-90.0$ đến $+90.0$; Kinh độ: $-180.0$ đến $+180.0$).
- **Đơn vị đo lường:** Độ sâu tính bằng Kilomet (`km`); Độ lớn địa chấn là chỉ số `magnitude` trên thang đo động đất.
- **Phân tách dữ liệu:** Dữ liệu thực tế quan sát và dữ liệu dự báo được tách bạch rõ ràng qua các trường và endpoint riêng.

---

## 2. Cấu trúc Envelope chuẩn của API

Tất cả các endpoint trả về dữ liệu đều được đóng gói theo định dạng phong bì (Envelope) thống nhất:

### Phản hồi thành công (HTTP 200 / 201)
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "last_updated": "2026-11-06T11:00:00Z"
  }
}
```

### Phản hồi rỗng hợp lệ (HTTP 200)
Một số endpoint phân tích trả về trạng thái "không có dữ liệu" bằng **HTTP 200** với `success: false`,
`data: null` và `message` giải thích lý do. Đây **không phải lỗi** — client phải hiển thị Empty State
kèm nội dung `message`, không ném lỗi 4xx/5xx.

```json
{
  "success": false,
  "data": null,
  "message": "Chưa có bản ghi pattern trong cơ sở dữ liệu."
}
```

Áp dụng cho: `/analysis/*`, `/predictions`, `/classifications`, `/clusters`
khi worker chưa chạy hoặc dữ liệu đã bị xóa rỗng.

> **Ngoại lệ `GET /api/v1/patterns` (GAP-11):** endpoint tổng hợp trả rỗng bằng shape riêng
> `{ "success": false, "total_patterns": 0, "patterns": [], "message": "..." }` (HTTP 200),
> **không có khóa `data`**. Shape này khớp `contracts/schemas/patterns.json` (không định nghĩa
> `data` ở root) và FE vẫn hiển thị Empty State; không sửa schema.

### Phản hồi thất bại (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Giá trị tham số min_magnitude không được lớn hơn max_magnitude",
    "details": {
      "field": "min_magnitude",
      "value": 7.5
    }
  }
}
```

---

## 3. Danh mục Endpoints chi tiết

### 3.1. Nhóm Hệ thống & Giám sát (System & Health)

#### `GET /api/v1/health`
Kiểm tra khả năng hoạt động của Database API và kết nối tới cơ sở dữ liệu PostgreSQL.

- **Request:** Không tham số
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "version": "1.0.0",
    "timestamp": "2026-11-06T11:05:00Z"
  }
}
```

#### `GET /api/v1/system/status`
Kiểm tra trạng thái hoạt động và thời điểm cập nhật gần nhất của 7 khối service.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "services": {
      "postgres": { "status": "active", "last_run": "2026-11-06T11:00:00Z" },
      "ingestion": { "status": "active", "last_run": "2026-11-06T11:00:00Z", "cycle": "5m" },
      "analysis": { "status": "active", "last_run": "2026-11-06T11:00:00Z", "cycle": "5m" },
      "clustering": { "status": "idle", "last_run": "2026-11-06T00:00:00Z", "cycle": "1d" },
      "prediction": { "status": "active", "last_run": "2026-11-06T11:00:00Z", "cycle": "5m" },
      "api": { "status": "active", "uptime_seconds": 86400 },
      "frontend": { "status": "active" }
    },
    "data_feed": {
      "source": "USGS",
      "total_events": 15420,
      "latest_event_time": "2026-11-06T10:58:12Z"
    }
  }
}
```

> `status` của mỗi service nhận một trong các giá trị: `active`, `idle`, `error`, `unknown`, `running`.
> (`running` là giá trị BE trả cho `postgres` — `system.py`; FE cũng chấp nhận alias `stopped`.)
> Khi chưa có `last_run`, FE hiển thị trạng thái "không xác định" thay vì giả định đang chạy.

---

### 3.2. Nhóm Dữ liệu Động đất (Earthquake Events)

#### `GET /api/v1/earthquakes`
Truy vấn danh sách sự kiện động đất có phân trang và hỗ trợ đa tiêu chí lọc.

- **Query Parameters:**
  | Tên tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
  | :--- | :--- | :--- | :--- | :--- |
  | `page` | integer | Không | `1` | Số trang truy vấn ($\ge 1$) |
  | `limit` | integer | Không | `20` | Số bản ghi trên mỗi trang (tối đa 100) |
  | `start_time` | string | Không | - | Lọc sự kiện từ thời điểm (ISO 8601 UTC) |
  | `end_time` | string | Không | - | Lọc sự kiện đến thời điểm (ISO 8601 UTC) |
  | `min_magnitude` | float | Không | - | Độ lớn tối thiểu |
  | `max_magnitude` | float | Không | - | Độ lớn tối đa |
  | `min_depth` | float | Không | - | Độ sâu tối thiểu (km) |
  | `max_depth` | float | Không | - | Độ sâu tối đa (km) |
  | `search` | string | Không | - | Tìm theo khu vực (`place`) hoặc mã sự kiện (`source_event_id`), không phân biệt hoa thường |
  | `country` | string | Không | - | Lọc theo quốc gia do BE suy từ `place` (vd. `Japan`); không truyền → không lọc |
  | `region` | string | Không | - | Lọc theo khu vực do BE suy từ `place` (vd. `Honshu`); dùng cùng `country` |
  | `min_lat` / `max_lat` | float | Không | - | Phạm vi vĩ độ bounding box |
  | `min_lon` / `max_lon` | float | Không | - | Phạm vi kinh độ bounding box |
  | `sort_by` | string | Không | `event_time` | Trường sắp xếp (`event_time`, `magnitude`, `depth_km`) |
  | `order` | string | Không | `desc` | Thứ tự sắp xếp (`asc`, `desc`) |

- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1042,
      "source": "USGS",
      "source_event_id": "us7000m123",
      "event_time": "2026-11-06T10:45:22Z",
      "latitude": 35.6895,
      "longitude": 139.6917,
      "depth_km": 15.4,
      "magnitude": 5.8,
      "magnitude_type": "mww",
      "place": "82 km ENE of Tokyo, Japan",
      "country": "Japan",
      "region": "Tokyo",
      "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m123",
      "ingested_at": "2026-11-06T10:50:00Z"
    }
  ],
  "metadata": {
    "total": 15420,
    "page": 1,
    "limit": 20,
    "total_pages": 771
  }
}
```

#### `GET /api/v1/earthquakes/{id}`
Lấy thông tin chi tiết một sự kiện động đất theo ID nội bộ hoặc mã nguồn `source_event_id`.

- **Response (200 OK):** Trả về đối tượng sự kiện đầy đủ, bao gồm cả trường `raw_data` chứa GeoJSON gốc nếu có.

#### `GET /api/v1/earthquakes/countries`
Danh mục quốc gia do BE suy từ `place`, dùng để dựng bộ lọc toàn cục (không phải FE tự suy từ trang dữ liệu đang nạp). Sắp theo số sự kiện giảm dần, rồi tên chữ cái.

- **Query Parameters:** không có.
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "country": "USA", "count": 18, "avg_magnitude": 1.62, "max_magnitude": 5.0 },
    { "country": "Japan", "count": 4, "avg_magnitude": 2.1, "max_magnitude": 4.3 }
  ]
}
```
DB rỗng trả `data: []`.

#### `GET /api/v1/earthquakes/regions`
Danh mục khu vực trong một quốc gia, cũng suy từ `place`.

- **Query Parameters:** `country` (string, không bắt buộc) — nếu truyền thì chỉ trả khu vực của quốc gia đó.
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "region": "Anchorage", "count": 6, "avg_magnitude": 1.9, "max_magnitude": 4.1 },
    { "region": "Igiugig", "count": 2, "avg_magnitude": 2.2, "max_magnitude": 3.4 }
  ]
}
```

#### `GET /api/v1/statistics/monthly-peaks`
Số sự kiện theo tháng UTC (1..12) — biểu đồ cao điểm theo tháng trên trang Tổng quan. Nhận 2 query param tùy chọn `country`/`region` như `/statistics/earthquakes`. Dữ liệu đếm trực tiếp từ sự kiện thật, không phụ thuộc snapshot mùa vụ (`seasonal_decompose` cần ≥24 tháng).

- **Response (200 OK):** `{ "success": true, "data": [{ "month": 1, "label": "Tháng 1", "count": 0 }, …] }`

#### `GET /api/v1/statistics/earthquakes`
Thống kê nhanh các chỉ số địa chấn tổng quan phục vụ thẻ Dashboard (KPI Cards).

- **Query Parameters (tùy chọn, bổ sung 2026-11-23):**
  | Tên | Kiểu | Mặc định | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `country` | string | - | Giới hạn KPI theo quốc gia do BE suy từ `place` |
  | `region` | string | - | Giới hạn tiếp theo khu vực (dùng cùng `country`) |
  | `start_time` / `end_time` | string | - | Cửa sổ UTC cho bộ lọc Ngày/Tuần/Tháng (Overview & Danh mục) |
  | `min_magnitude` / `max_magnitude` | number | - | Giới hạn độ lớn cho KPI Danh mục (bổ sung 2026-11-24) |
  | `min_depth` / `max_depth` | number | - | Giới hạn độ sâu km cho KPI Danh mục (bổ sung 2026-11-24) |

  Không truyền → số liệu toàn cục y hệt trước đây. `/analysis/trend` cũng nhận `start_time`/`end_time` và tính on-the-fly; `/analysis/seasonality` (chu kỳ tuần) và `/statistics/monthly-peaks` (12 tháng) **không** chịu cửa sổ này.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_events": 15420,
    "strong_events_count": 312,
    "moderate_events_count": 1240,
    "minor_events_count": 12048,
    "recent_24h_count": 142,
    "avg_magnitude": 3.4,
    "max_magnitude": 7.1,
    "latest_event_time": "2026-11-06T10:58:12Z",
    "time_series_preview": [
      { "time": "2026-11-06T09:00:00Z", "count": 6, "avg_mag": 3.2 }
    ]
  }
}
```

---

### 3.3. Nhóm 6 Patterns Phân Tích Chuỗi Thời Gian (Time-Series Analysis)

> **Chu kỳ mùa vụ (bổ sung 2026-11-23):** `GET /api/v1/analysis/seasonality` nhận thêm `interval=week|month` để ép chu kỳ 7 ngày hoặc 12 tháng thay vì tự chọn; khi có filter hoặc `interval`, BE tính on-the-fly. Với dữ liệu <24 tháng, `interval=month` trả `status=insufficient_data` — dùng `/statistics/monthly-peaks` để có số đếm ngay.

> **Lọc phạm vi (bổ sung 2026-11-23):** `GET /api/v1/analysis/{temporal,trend,seasonality,correlation}`, `GET /api/v1/predictions` và `GET /api/v1/classifications` đều nhận 2 query param tùy chọn `country` và `region`. Khi có ít nhất một param, BE tính lại metrics/dự báo **on-the-fly từ sự kiện đã lọc** bằng chính hàm thuần của T3/T5 (`prepare_events` + `compute_*`, `build_series` + `forecast_next`/`classify_next`) — **không ghi snapshot, không đổi payload**. Không truyền → đúng đường cũ đọc bảng tổng hợp. Với P5/P6, artifact mô hình vẫn là bản huấn luyện toàn cầu; nếu phạm vi có ít hơn 10 ngày dữ liệu, BE trả Empty State `insufficient_data` (`success:false, data:null`) thay vì bịa số.

#### Tổng hợp: `GET /api/v1/patterns`
Trả về cả 6 bản ghi pattern trong một phản hồi, dùng làm hợp đồng chính cho FE (`contracts/schemas/patterns.json`).
Mỗi phần tử gồm `id` (`pattern_1` … `pattern_6`), `name`, `type`, `status` (`COMPUTED` / `PENDING`),
`period`, `metrics` (dạng object theo từng pattern) và `total_patterns`, `clustering_summary`, `last_updated`.
Khi chưa có bản ghi → `{ "success": false, "total_patterns": 0, "patterns": [], "message": "..." }`
(HTTP 200, **không có khóa `data`** — xem ngoại lệ ở §2; FE vẫn hiển thị Empty State).

#### Pattern 1: `GET /api/v1/analysis/temporal`
Cung cấp dữ liệu vẽ 3 biểu đồ bắt buộc: Line chart, Scatter plot và Histogram.

- **Query Parameters:**
  - `interval`: `day` | `week` | `month` (Mặc định `day`)
  - `start_time`, `end_time`: Khoảng thời gian phân tích

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "interval": "day",
    "line_chart": [
      { "date": "2026-11-01", "event_count": 42, "max_magnitude": 5.2, "avg_magnitude": 3.1 },
      { "date": "2026-11-02", "event_count": 38, "max_magnitude": 4.8, "avg_magnitude": 2.9 }
    ],
    "scatter_plot": [
      { "id": 101, "timestamp": "2026-11-01T04:12:00Z", "magnitude": 5.2, "depth_km": 20.1 },
      { "id": 102, "timestamp": "2026-11-01T08:33:00Z", "magnitude": 3.4, "depth_km": 10.0 }
    ],
    "histogram": {
      "magnitude_bins": [
        { "bin": "< 2.0", "count": 120 },
        { "bin": "2.0 - 3.0", "count": 340 },
        { "bin": "3.0 - 4.0", "count": 210 },
        { "bin": "4.0 - 5.0", "count": 65 },
        { "bin": ">= 5.0", "count": 14 }
      ]
    }
  }
}
```

#### Pattern 2: `GET /api/v1/analysis/trend`
Biểu diễn xu hướng của dữ liệu sau khi thực hiện **Re-sampling** (Moving Average / Decomposition).

- **Query Parameters:**
  - `resample_freq`: `D` (Ngày) | `W` (Tuần) | `M` (Tháng) (Mặc định `M`)
  - `metric`: `count` | `avg_magnitude` | `max_magnitude` (Mặc định `count`)
  - `timezone` (bổ sung 2026-11-24): `UTC` | `UTC+7` — bucket nhãn kỳ theo múi giờ hiển thị. Có param này → tính on-the-fly như `/analysis/temporal`; không truyền → giữ snapshot T3 bucket UTC.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "resample_freq": "M",
    "metric": "count",
    "series": [
      { "period": "2026-05", "actual_value": 1120, "trend_value": 1105.4, "is_complete": true },
      { "period": "2026-06", "actual_value": 1240, "trend_value": 1180.2, "is_complete": true }
    ],
    "slope": 0.045,
    "intercept": 1090.5,
    "r_squared": 0.62,
    "p_value": 0.031,
    "sample_size": 6,
    "trend_direction": "increasing",
    "status": "computed"
  }
}
```

- **Ghi chú:**
  - Terminal 3 ghi sẵn kết quả cho cả 3 tần suất (`day`/`week`/`month`) × 3 metric; route chỉ trả đúng tần suất và metric được yêu cầu.
  - `series` của `avg_magnitude`/`max_magnitude` bỏ các kỳ không có sự kiện (không điền 0).
  - `status: "insufficient_data"` khi chưa đủ ≥ 3 kỳ đầy đủ để hồi quy (khi đó `trend_direction` là `stable`).
  - Chưa có kết quả đúng tần suất yêu cầu → Empty State (`success: false`, `data: null`), không trả tần suất khác thay thế.

#### Pattern 3: `GET /api/v1/analysis/seasonality`
Biểu diễn tính chu kỳ / mùa vụ (**Seasonal line**) sau khi thực hiện **Re-sampling**.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "computed",
    "resample_freq": "M",
    "period": 12,
    "components": {
      "seasonal_line": [
        { "cycle_index": 1, "period_label": "Tháng 1", "seasonal_factor": 1.05 },
        { "cycle_index": 2, "period_label": "Tháng 2", "seasonal_factor": 0.98 }
      ],
      "residual_variance": 0.12,
      "seasonality_strength": 0.35,
      "interpretation": "Dữ liệu thể hiện tính chu kỳ yếu, không có bằng chứng mùa vụ rõ rệt theo tháng."
    },
    "data_points": 24
  }
}
```

#### Pattern 4: `GET /api/v1/analysis/correlation`
Cung cấp ma trận tương quan (**Correlation Matrix / Heatmap**) giữa các biến đo đạc định lượng.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "computed",
    "variables": ["magnitude", "depth_km", "latitude", "longitude", "daily_event_count"],
    "matrix": [
      [1.00, -0.15, 0.02, 0.05, 0.28],
      [-0.15, 1.00, -0.08, -0.03, -0.05],
      [0.02, -0.08, 1.00, 0.12, 0.01],
      [0.05, -0.03, 0.12, 1.00, 0.04],
      [0.28, -0.05, 0.01, 0.04, 1.00]
    ],
    "method": "pearson",
    "sample_size": 24,
    "note": "Ma trận tương quan Pearson giữa 5 biến đo đạc — không suy diễn nhân quả."
  }
}
```

#### Pattern 5: `GET /api/v1/predictions`
Giá trị dự báo định lượng cho ngày tiếp theo ($t + 1$) kèm khoảng sai số.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "target_date": "2026-11-07",
    "forecasted_metric": "event_count",
    "predicted_value": 46.2,
    "confidence_interval": {
      "lower": 38.0,
      "upper": 54.4
    },
    "model_name": "Ridge-TimeSeries-Forecaster",
    "model_version": "v1.0.0",
    "evaluation_metrics": {
      "mae": 4.12,
      "rmse": 5.84,
      "baseline_mae": 6.20
    },
    "generated_at": "2026-11-06T11:00:00Z"
  }
}
```

> **Hai dạng payload:** endpoint riêng `/predictions` trả `confidence_interval: {lower, upper}` lồng nhau
> và `forecasted_metric`. Endpoint tổng hợp `/patterns` trả alias phẳng `lower_bound`/`upper_bound` và
> `metric_name`. FE chuẩn hóa cả hai về một dạng trong `asPrediction()` — không thay thế giá trị thiếu.

#### Pattern 6: `GET /api/v1/classifications`
Nhãn phân loại mức độ hoạt động địa chấn dự kiến cho ngày tiếp theo ($t + 1$).

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "target_date": "2026-11-07",
    "predicted_label": "Moderate",
    "probabilities": {
      "Low": 0.12,
      "Moderate": 0.55,
      "High": 0.27,
      "Critical": 0.06
    },
    "model_name": "RandomForest-Seismic-Classifier",
    "model_version": "v1.0.0",
    "evaluation_metrics": {
      "f1_macro": 0.78,
      "accuracy": 0.82
    },
    "generated_at": "2026-11-06T11:00:00Z"
  }
}
```

> **Hai dạng payload:** endpoint riêng `/classifications` trả `probabilities`; endpoint tổng hợp
> `/patterns` trả alias `probability_scores`. FE chuẩn hóa trong `asClassification()`.
> Nhãn canonical gồm 4 mức: `Low`, `Moderate`, `High`, `Critical` — FE cũng chấp nhận alias cũ
> `Low Activity`, `Normal Activity`, `High Activity` nhưng không dùng trong dữ liệu mới.

---

### 3.4. Nhóm Phân Cụm Sự Kiện (Clustering)

#### `GET /api/v1/clusters`
Lấy kết quả phân nhóm địa chấn (chu kỳ chạy 1 ngày/lần) phục vụ trực quan hóa các chùm động đất trên bản đồ. Nhận 2 query param tùy chọn `country`/`region` — lọc theo địa danh đại diện (`dominant_place`) của từng cụm; `clusters_count` phản ánh số cụm sau lọc (dùng cho KPI "Cụm địa chấn" trên Tổng quan).

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "algorithm": "DBSCAN",
    "parameters": { "eps_km": 150, "min_samples": 5 },
    "clusters_count": 8,
    "noise_count": 24,
    "clusters": [
      {
        "cluster_id": 1,
        "center_latitude": 38.2,
        "center_longitude": 142.4,
        "event_count": 48,
        "avg_magnitude": 4.6,
        "max_magnitude": 6.1
      }
    ]
  }
}
```

---

### 3.5. Nhóm Sự kiện Thời gian thực (Real-time SSE)

Backend phục vụ **hai** route SSE (cùng cơ chế):

- `GET /api/v1/stream/earthquakes` — route đang chạy, dùng mặc định.
- `GET /api/v1/events/stream` — route theo đặc tả gốc, vẫn được giữ tương thích.

- **Header:** `Accept: text/event-stream`
- **Tên sự kiện:** `earthquake_detected`, `earthquake_alert`, `heartbeat`,
  `ingestion_cycle_completed`, `database_cleared`, `alert`.
- **Cấu trúc `data`:** luôn là một đối tượng bọc ba khóa `event`, `data`, `timestamp`; trong đó
  `data` là nội dung riêng của từng sự kiện.

```text
event: earthquake_detected
data: {"event":"earthquake_detected","data":{"source_event_id":"us7000m123","magnitude":6.2,"place":"Tonga Region","event_time":"2026-11-06T11:08:00Z"},"timestamp":"2026-11-06T11:08:01Z"}

event: heartbeat
data: {"event":"heartbeat","data":{"timestamp":"2026-11-06T11:10:00Z"},"timestamp":"2026-11-06T11:10:00Z"}

event: database_cleared
data: {"event":"database_cleared","data":{},"timestamp":"2026-11-06T11:12:00Z"}
```

FE parse đúng cấu trúc bọc này; sự kiện `database_cleared` chuyển toàn bộ trang sang Empty State,
không thay bằng dữ liệu mẫu.

---

## 4. Bảng mã lỗi chuẩn (Error Codes)

| Mã lỗi (`code`) | HTTP Status | Diễn giải |
| :--- | :---: | :--- |
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào sai định dạng hoặc không hợp lệ |
| `RESOURCE_NOT_FOUND` | 404 | Không tìm thấy sự kiện hoặc tài nguyên yêu cầu |
| `DATA_SOURCE_UNAVAILABLE`| 503 | Nguồn cấp dữ liệu USGS tạm thời không phản hồi |
| `DATABASE_ERROR` | 500 | Lỗi kết nối hoặc thực thi truy vấn PostgreSQL |
| `SERVICE_UNAVAILABLE` | 503 | Dịch vụ phân tích chưa sẵn sàng hoặc đang khởi động lại |
| `INTERNAL_SERVER_ERROR` | 500 | Lỗi ngoại lệ chưa được bắt trong Backend API |

