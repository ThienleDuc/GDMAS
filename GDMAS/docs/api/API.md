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
      "postgres": { "status": "running" },
      "data_ingestion": { "status": "active", "last_run": "2026-11-06T11:00:00Z", "cycle": "5m" },
      "data_analysis": { "status": "active", "last_run": "2026-11-06T11:00:00Z", "cycle": "5m" },
      "clustering": { "status": "active", "last_run": "2026-11-06T00:00:00Z", "cycle": "1d" },
      "prediction": { "status": "active", "last_run": "2026-11-06T11:00:00Z", "cycle": "5m" },
      "api": { "status": "active", "uptime_seconds": 86400 },
      "frontend": { "status": "connected" }
    },
    "data_feed": {
      "source": "USGS",
      "total_events": 15420,
      "latest_event_time": "2026-11-06T10:58:12Z"
    }
  }
}
```

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

#### `GET /api/v1/statistics/earthquakes`
Thống kê nhanh các chỉ số địa chấn tổng quan phục vụ thẻ Dashboard (KPI Cards).

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary_24h": {
      "total_count": 142,
      "max_magnitude": 6.2,
      "avg_magnitude": 3.4,
      "significant_count": 3
    },
    "summary_7d": {
      "total_count": 980,
      "max_magnitude": 7.1,
      "avg_magnitude": 3.1
    },
    "magnitude_distribution": {
      "minor_below_3": 65,
      "light_3_to_4": 45,
      "moderate_4_to_5": 24,
      "strong_above_5": 8
    }
  }
}
```

---

### 3.3. Nhóm 6 Patterns Phân Tích Chuỗi Thời Gian (Time-Series Analysis)

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
        { "bin": "1.0 - 2.0", "count": 120 },
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
  - `resample_freq`: `W` (Tuần) | `M` (Tháng) (Mặc định `M`)
  - `metric`: `count` | `avg_magnitude` | `max_magnitude`

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "resample_freq": "M",
    "metric": "count",
    "series": [
      { "period": "2026-05", "actual_value": 1120, "trend_value": 1105.4 },
      { "period": "2026-06", "actual_value": 1240, "trend_value": 1180.2 }
    ],
    "slope": 0.045,
    "trend_direction": "increasing"
  }
}
```

#### Pattern 3: `GET /api/v1/analysis/seasonality`
Biểu diễn tính chu kỳ / mùa vụ (**Seasonal line**) sau khi thực hiện **Re-sampling**.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "resample_freq": "M",
    "components": {
      "seasonal_line": [
        { "cycle_index": 1, "period_label": "Tháng 1", "seasonal_factor": 1.05 },
        { "cycle_index": 2, "period_label": "Tháng 2", "seasonal_factor": 0.98 }
      ],
      "residual_variance": 0.12,
      "seasonality_strength": 0.35,
      "interpretation": "Dữ liệu thể hiện tính chu kỳ yếu, không có bằng chứng mùa vụ rõ rệt theo tháng."
    }
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
    "variables": ["magnitude", "depth_km", "latitude", "longitude", "daily_event_count"],
    "matrix": [
      [1.00, -0.15, 0.02, 0.05, 0.28],
      [-0.15, 1.00, -0.08, -0.03, -0.05],
      [0.02, -0.08, 1.00, 0.12, 0.01],
      [0.05, -0.03, 0.12, 1.00, 0.04],
      [0.28, -0.05, 0.01, 0.04, 1.00]
    ],
    "method": "pearson"
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

#### Pattern 6: `GET /api/v1/classifications`
Nhãn phân loại mức độ hoạt động địa chấn dự kiến cho ngày tiếp theo ($t + 1$).

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "target_date": "2026-11-07",
    "predicted_label": "Normal Activity",
    "probabilities": {
      "Low Activity": 0.15,
      "Normal Activity": 0.72,
      "High Activity": 0.13
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

---

### 3.4. Nhóm Phân Cụm Sự Kiện (Clustering)

#### `GET /api/v1/clusters`
Lấy kết quả phân nhóm địa chấn (chu kỳ chạy 1 ngày/lần) phục vụ trực quan hóa các chùm động đất trên bản đồ.

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

#### `GET /api/v1/events/stream`
Luồng Server-Sent Events (SSE) đẩy thông báo sự kiện động đất mới đến client tức thì.

- **Header:** `Accept: text/event-stream`
- **Output:**
```text
event: earthquake_alert
data: {"id":1043,"magnitude":6.2,"place":"Tonga Region","event_time":"2026-11-06T11:08:00Z"}

event: heartbeat
data: {"timestamp":"2026-11-06T11:10:00Z"}
```

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

