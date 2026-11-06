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
│   ├── aggregate.json      # Schema tổng hợp dữ liệu ngày / 6 patterns
│   ├── cluster.json        # Schema cụm không gian DBSCAN / KMeans
│   ├── prediction.json     # Schema kết quả dự báo t+1
│   └── sse-event.json      # Schema sự kiện thời gian thực qua Server-Sent Events
└── examples/               # Dữ liệu JSON mẫu (Mock Payloads) phục vụ kiểm thử
    ├── earthquake_sample.json
    ├── timeseries_sample.json
    ├── cluster_sample.json
    └── prediction_sample.json
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

## 4. Tài liệu Liên quan
- Đặc tả API hoàn chỉnh: [API.md](file:///D:/KHDLKPDL/GDMAS/docs/api/API.md)
- Thiết kế cơ sở dữ liệu: [ERD.md](file:///D:/KHDLKPDL/GDMAS/docs/architecture/ERD.md)
- Hướng dẫn phát triển giao diện: [development.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/frontend/development.md)

