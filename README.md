# GDMAS — Global Disaster Monitoring & Analysis System

> **Hệ thống giám sát, phân tích chuỗi thời gian (Time-Series) và dự báo thiên tai địa chấn toàn cầu.**

---

## 🌍 Giới Thiệu Dự Án

**GDMAS** (Global Disaster Monitoring & Analysis System) là giải pháp phần mềm phân tán hiện đại, cung cấp khả năng thu thập, chuẩn hóa, phân tích chuyên sâu chuỗi thời gian và trực quan hóa dữ liệu động đất toàn cầu từ Cục Khảo sát Địa chất Hoa Kỳ (**USGS**). 

Hệ thống được thiết kế theo kiến trúc vi dịch vụ phân tán vận hành đồng thời trên **7 Terminals độc lập**, tích hợp cơ chế nạp dữ liệu thuần Python có khả năng tự phục hồi, kênh truyền dữ liệu thời gian thực **Server-Sent Events (SSE)** và bảng điều khiển tác chiến (Mission Control Dashboard) với tiêu chuẩn thẩm mỹ cao.

---

## ⚡ Các Tính Năng Cốt Lõi

1. **Nạp Dữ liệu Tự động & Bền bỉ (Automated Ingestion):**
   - Định kỳ quét và thu thập dữ liệu GeoJSON từ USGS API mỗi 5 phút.
   - Cơ chế tự phục hồi Exponential Backoff chống gián đoạn mạng và tính bất biến (Idempotent Upsert) chống trùng lặp dữ liệu.
2. **Trọn Vẹn 6 Patterns Phân Tích Chuỗi Thời Gian (Time-Series Analytics):**
   - **Pattern 1:** Biểu diễn trực quan chuỗi thời gian với 3 dạng biểu đồ (Line Chart, Scatter Plot, Histogram) theo Ngày / Tuần / Tháng.
   - **Pattern 2 (Trend Analysis):** Phân tích xu hướng dài hạn sau khi Re-sampling bằng kỹ thuật Rolling Mean / STL.
   - **Pattern 3 (Seasonality):** Bóc tách tính chu kỳ và biến động mùa vụ theo tuần và tháng.
   - **Pattern 4 (Correlation):** Ma trận tương quan nhiệt (Correlation Matrix Heatmap) giữa độ lớn, độ sâu, tần suất và tổng năng lượng giải phóng.
   - **Pattern 5 (Regression & Forecasting):** Dự báo định lượng giá trị hoạt động địa chấn ngày kế tiếp ($t + 1$).
   - **Pattern 6 (Classification):** Phân loại mức độ cảnh báo nguy cơ địa chấn ngày kế tiếp ($t + 1$) thành các cấp độ.
3. **Phân Cụm Không Gian (Spatial Clustering):**
   - Thuật toán DBSCAN / K-Means nhận diện các ổ động đất tập trung và phân tách nhiễu ngoại lai.
4. **Luồng Dữ Liệu Thời Gian Thực (Server-Sent Events - SSE):**
   - Đẩy thông báo tức thời khi có sự kiện địa chấn mới từ FastAPI tới React Client mà không cần F5 trình duyệt.
5. **Giao Diện Điều Khiển Thẩm Mỹ Cao (High-Aesthetic UI/UX):**
   - Thiết kế giao diện Dark Mode hiện đại, hiệu ứng Glassmorphism, bản đồ Leaflet tương tác mượt mà và hệ thống biểu đồ Recharts responsive.

---

## 🏛️ Kiến Trúc Vận Hành: Mô Hình 7 Terminals

Hệ thống tách biệt hoàn toàn thành 7 khối dịch vụ độc lập vận hành trên 7 terminals riêng biệt:

```
+-----------------------------------------------------------------------------------+
|                           HỆ THỐNG GDMAS (7 TERMINALS)                            |
+-----------------------------------------------------------------------------------+
| [Term 1] PostgreSQL 16 Database Container (Port 5432)                             |
|          └── docker compose up postgres                                           |
+-----------------------------------------------------------------------------------+
| [Term 2] Ingestion Service Runner (Chu kỳ 5 phút/lần)                             |
|          └── uv run python -m gdmas.services.ingestion.runner                     |
+-----------------------------------------------------------------------------------+
| [Term 3] Analysis Service Runner (Chu kỳ 5 phút/lần)                              |
|          └── uv run python -m gdmas.services.analysis.runner                      |
+-----------------------------------------------------------------------------------+
| [Term 4] Clustering Service Runner (Chu kỳ 1 ngày/lần)                            |
|          └── uv run python -m gdmas.services.clustering.runner                    |
+-----------------------------------------------------------------------------------+
| [Term 5] Prediction Service Runner (Chu kỳ 5 phút/lần)                            |
|          └── uv run python -m gdmas.services.prediction.runner                    |
+-----------------------------------------------------------------------------------+
| [Term 6] Database REST API Server (Port 8000)                                     |
|          └── uv run uvicorn gdmas.main:app --reload --port 8000                   |
+-----------------------------------------------------------------------------------+
| [Term 7] Frontend Web Client (Port 3000)                                          |
|          └── pnpm dev --port 3000                                                 |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Phân hệ | Công nghệ cốt lõi |
| :--- | :--- |
| **Backend Runtime** | Python 3.12, Quản lý môi trường siêu tốc với **uv** |
| **API Framework** | FastAPI, Uvicorn, Pydantic v2, SSE-Starlette |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0, Psycopg 3, Alembic |
| **Data Science / ML**| Pandas, NumPy, Statsmodels, Scikit-learn, Scipy |
| **HTTP & Resilience**| HTTPX, Tenacity (Exponential Backoff) |
| **Frontend Framework**| React 18, TypeScript, Vite |
| **UI & Styling** | TailwindCSS, Lucide Icons, Glassmorphism Design System |
| **Data Visualization**| Leaflet / React-Leaflet (Map), Recharts (6 Patterns) |
| **Code Quality** | Ruff (Linting & Formatting), MyPy, Pytest, Coverage |

---

## 🚀 Khởi Chạy Nhanh (Quick Start)

### 1. Chuẩn bị môi trường
Yêu cầu máy tính đã cài đặt:
- **Git** (v2.38+)
- **Docker Desktop** (v24+)
- **uv** (v0.4+)
- **Node.js** (v18+) & **pnpm** (v8+)

### 2. Thiết lập dự án

```bash
# 1. Cấu hình biến môi trường
cp .env.example .env

# 2. Khởi tạo Backend
cd apps/api
uv venv
uv sync --all-extras --dev
uv pip install -e .
cd ../..

# 3. Khởi tạo Frontend
cd apps/web
pnpm install
cd ../..
```

### 3. Vận hành theo 7 Terminals

Mở 7 cửa sổ terminal riêng biệt và thực thi các lệnh:

- **Terminal 1 (Database):** `docker compose up postgres`
- **Terminal 2 (Ingestion):** `cd apps/api && uv run python -m gdmas.services.ingestion.runner`
- **Terminal 3 (Analysis):** `cd apps/api && uv run python -m gdmas.services.analysis.runner`
- **Terminal 4 (Clustering):** `cd apps/api && uv run python -m gdmas.services.clustering.runner`
- **Terminal 5 (Prediction):** `cd apps/api && uv run python -m gdmas.services.prediction.runner`
- **Terminal 6 (Database API):** `cd apps/api && uv run uvicorn gdmas.main:app --reload --port 8000` *(Swagger docs: `http://localhost:8000/docs`)*
- **Terminal 7 (Frontend Web):** `cd apps/web && pnpm dev --port 3000` *(Dashboard: `http://localhost:3000`)*

---

## 🧪 Kiểm Thử Tự Động (Local Test Suite)

```bash
# Thực thi toàn bộ kiểm tra cú pháp, Type-check và Unit/Integration test
bash scripts/test.sh
```

---

## 📖 Hệ Thống Tài Liệu Kỹ Thuật

Mọi tài liệu chi tiết của dự án được lưu trữ tại thư mục [docs/](GDMAS/docs/README.md):

- 📘 [Hướng dẫn Cài đặt & Cấu hình Local (setup.md)](GDMAS/docs/setup.md)
- ⚙️ [Sổ tay Vận hành Hệ thống 7 Terminals (workflow.md)](GDMAS/docs/workflow.md)
- 📐 [Thiết kế Kiến trúc Hệ thống (SAD.md)](GDMAS/docs/architecture/SAD.md)
- 🗄️ [Thiết kế Cơ sở Dữ liệu & ERD (ERD.md)](GDMAS/docs/architecture/ERD.md)
- 🔌 [Đặc tả REST API & SSE (API.md)](GDMAS/docs/api/API.md)
- 📝 [Quy ước Chung & Open-Closed Principle (quyuocchung.md)](GDMAS/docs/quyuocchung.md)
- 🧪 [Chiến lược Kiểm thử Tự động (TESTING.md)](GDMAS/docs/testing/TESTING.md)
