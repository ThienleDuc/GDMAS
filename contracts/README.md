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
│   ├── aggregate.json      # (sẽ bổ sung) Schema tổng hợp dữ liệu ngày
│   ├── cluster.json        # (sẽ bổ sung) Schema cụm không gian DBSCAN / KMeans
│   └── prediction.json     # (sẽ bổ sung) Schema kết quả dự báo t+1
└── examples/               # Dữ liệu JSON mẫu (Mock Payloads) phục vụ kiểm thử
    ├── earthquake_sample.json
    ├── patterns_sample.json # Mock đầy đủ 6 Patterns dùng làm fixture test Frontend
    ├── timeseries_sample.json  # (sẽ bổ sung)
    ├── cluster_sample.json     # (sẽ bổ sung)
    └── prediction_sample.json  # (sẽ bổ sung)
```

---

## 3. Danh Mục Các Hợp Đồng Cốt Lõi

### 3.1 Thực thể Động đất (`schemas/earthquake.json`)
Mô tả một sự kiện địa chấn đơn lẻ được nạp từ USGS và lưu trong bảng `earthquakes`:
```json
{
  "$id": "https://gdmas.local/schemas/earthquake.json",
  "type": "object",
  "properties": {
    "id": { "type": "string", "example": "us7000m8v8" },
    "time": { "type": "string", "format": "date-time" },
    "latitude": { "type": "number", "minimum": -90, "maximum": 90 },
    "longitude": { "type": "number", "minimum": -180, "maximum": 180 },
    "depth": { "type": "number", "description": "Độ sâu chấn tiêu tính bằng km" },
    "magnitude": { "type": "number", "description": "Độ lớn theo thang Richter" },
    "place": { "type": "string" },
    "status": { "type": "string", "enum": ["reviewed", "automatic"] }
  },
  "required": ["id", "time", "latitude", "longitude", "depth", "magnitude", "place"]
}
```

### 3.2 Hợp đồng Luồng Sự kiện Realtime (`schemas/sse-event.json`)
Mô tả cấu trúc gói tin đẩy qua endpoint `/api/v1/stream/earthquakes`:
```json
{
  "$id": "https://gdmas.local/schemas/sse-event.json",
  "type": "object",
  "properties": {
    "event": {
      "type": "string",
      "enum": ["new_earthquake", "prediction_updated", "cluster_updated", "ping"]
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

## 4. Tài liệu Liên quan
- Đặc tả API hoàn chỉnh: [API.md](GDMAS/docs/api/API.md)
- Thiết kế cơ sở dữ liệu: [ERD.md](GDMAS/docs/architecture/ERD.md)
- Hướng dẫn phát triển giao diện: [development.md](GDMAS/docs/guides/frontend/development.md)

