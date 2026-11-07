# Hệ Thống Đặc Tả Ca Kiểm Thử Toàn Diện (Master Test Cases Index)

Hệ thống kiểm thử của dự án **GDMAS (Global Disaster Monitoring & Analysis System)** được phân định rõ ràng thành hai phân hệ độc lập nhằm đáp ứng toàn diện cả yêu cầu nghiệp vụ chuyên sâu và các chỉ số kỹ thuật vận hành:

---

## 🗂️ Cấu Trúc Thư Mục Kiểm Thử

```
docs/testing/
├── TESTING.md                                   # Chiến lược kiểm thử & Kim tự tháp Test Pyramid
├── test-cases.md                                # Mục lục điều phối các bộ kiểm thử (Tệp này)
├── functional-requirement/                      # Ca kiểm thử Chức Năng (Functional Testing)
│   └── README.md                                # Danh mục ca kiểm thử chức năng 5 phân hệ
└── non-functional-requirement/                  # Ca kiểm thử Phi Chức Năng (Non-Functional Testing)
    ├── README.md                                # Tổng quan tiêu chuẩn phi chức năng
    └── test-case-clear-init-realtime.md         # Ca kiểm thử: Clear & Init Real-time Server-Client
```

---

## 1. Phân Hệ Kiểm Thử Chức Năng (Functional Testing)
👉 Chi tiết tại thư mục: [**`docs/testing/functional-requirement/README.md`**](./functional-requirement/README.md)

Bao gồm các kiểm thử về tính đúng đắn của logic nghiệp vụ:
* **FT-ING (Ingestion):** Cào USGS 5 phút/lần, chống trùng lặp sự kiện, ghi log chu kỳ `service_runs`.
* **FT-CLN (Data Preprocessing):** Chuẩn hóa tọa độ WGS84, tính năng lượng Joules $E = 10^{4.8 + 1.5M}$.
* **FT-PAT (6 Patterns & DBSCAN):** Time-Series, Trend, Seasonality, Correlation, ARIMA $t+1$, Random Forest.
* **FT-API (REST API Endpoints):** Phân trang, bộ lọc đa chiều (Mag, Depth, Place), hợp đồng Pydantic.
* **FT-UI (Frontend Web):** Trực quan hóa Recharts, chuyển đổi múi giờ UTC/UTC+7, Responsive HUD.

---

## 2. Phân Hệ Kiểm Thử Phi Chức Năng (Non-Functional Testing)
👉 Chi tiết tại thư mục: [**`docs/testing/non-functional-requirement/README.md`**](./non-functional-requirement/README.md)

Tập trung vào tính bền bỉ, độ tin cậy và trải nghiệm thời gian thực:
* [**`test-case-clear-init-realtime.md`**](./non-functional-requirement/test-case-clear-init-realtime.md): **Xóa (Clear) & Khởi Tạo (Init) Dữ Liệu Thời Gian Thực Từ Server Đến Client**
  * Kiểm thử độ trễ phát tán sự kiện xóa CSDL qua SSE: **$t < 100\text{ ms}$**.
  * Kiểm thử cơ chế **Zero-Refresh**: Client tự động cập nhật và hiển thị Banner lỗi mà **không cần nhấn F5**.
  * Kiểm thử triệt tiêu dữ liệu giả định: Không fallback ngầm về mock data khi CSDL có 0 bản ghi.
  * Kiểm thử thời gian phục hồi dịch vụ (RTO): Khởi tạo và suy luận 6 patterns trong **$t < 1.0\text{ s}$**.
  * Kiểm thử cơ chế Fallback nhịp tim `heartbeat` và chống rò rỉ bộ nhớ hàng đợi SSE.

