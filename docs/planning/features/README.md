# Danh Mục Đặc Tả Chức Năng Hệ Thống (Feature Catalog)

Thư mục này chứa toàn bộ các bản **Đặc tả Chức năng Chi tiết (Functional Specifications)** của hệ thống **GDMAS**. Mỗi tệp đại diện cho một khối chức năng độc lập, tương ứng với kiến trúc **7 Terminals** và **6 Patterns Chuỗi Thời Gian**.

> [!IMPORTANT]
> - **Nguồn chân lý nghiệp vụ (Single Source of Truth):** Các tài liệu này đóng vai trò là quy chuẩn kỹ thuật gốc (What & Why). Trước khi phát triển hoặc sửa đổi chức năng, Agent và Lập trình viên bắt buộc phải tham chiếu tệp tương ứng.
> - **Đầu vào cho `write-proposal`:** Khi cần triển khai một tính năng, sử dụng tài liệu đặc tả này làm căn cứ bối cảnh để soạn thảo proposal nhanh chóng, chính xác và tiết kiệm token.
> - **Khuôn mẫu chuẩn:** Mọi tài liệu chức năng mới phải tuân thủ khuôn mẫu tại [TEMPLATE.md](TEMPLATE.md).

---

## 🗺️ Bản Đồ 7 Chức Năng Tương Ứng 7 Terminals

```mermaid
flowchart TD
    subgraph Data_Layer ["Tầng Dữ Liệu & Nạp (Storage & Ingestion)"]
        FEAT01["[FEAT-01] CSDL & Lưu Trữ PostgreSQL<br/>(Terminal 1 - docs/planning/features/01-database-storage.md)"]
        FEAT02["[FEAT-02] Nạp Dữ Liệu USGS Định Kỳ<br/>(Terminal 2 - docs/planning/features/02-usgs-ingestion.md)"]
        FEAT02 -->|Upsert Sự Kiện 5 phút/lần| FEAT01
    end

    subgraph Service_Layer ["Tầng Xử Lý Phân Tích (Backend Processing Services)"]
        FEAT03["[FEAT-03] Phân Tích Time-Series 4 Patterns<br/>(Terminal 3 - docs/planning/features/03-timeseries-analysis.md)"]
        FEAT04["[FEAT-04] Gom Cụm Không Gian DBSCAN<br/>(Terminal 4 - docs/planning/features/04-spatial-clustering.md)"]
        FEAT05["[FEAT-05] Dự Báo & Phân Loại t+1<br/>(Terminal 5 - docs/planning/features/05-seismic-prediction.md)"]
        
        FEAT01 -->|Đọc Sự Kiện Gốc| FEAT03 & FEAT04 & FEAT05
        FEAT03 & FEAT04 & FEAT05 -->|Lưu Kết Quả Phân Tích| FEAT01
    end

    subgraph Presentation_Layer ["Tầng Giao Diện & Truyền Phát (API & UI)"]
        FEAT06["[FEAT-06] FastAPI REST & Kênh SSE Realtime<br/>(Terminal 6 - docs/planning/features/06-api-realtime-sse.md)"]
        FEAT07["[FEAT-07] Giao Diện Web Dashboard Dark Mode<br/>(Terminal 7 - docs/planning/features/07-interactive-web-client.md)"]
        
        FEAT01 -->|Truy Vấn Dữ Liệu| FEAT06
        FEAT06 -->|REST API & SSE Stream| FEAT07
    end
```

---

## 📋 Bảng Danh Mục 7 Chức Năng Chi Tiết

| Mã | Tên Chức Năng | Terminal Đảm Nhiệm | Chu Kỳ / Tần Suất | Tài Liệu Chi Tiết | Trạng Thái |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **FEAT-01** | Cơ Sở Dữ Liệu & Lưu Trữ Tập Trung | **T1 - Database** (PostgreSQL 16) | Liên tục (Always-on) | [`01-database-storage.md`](01-database-storage.md) | `In-Progress` |
| **FEAT-02** | Thu Thập & Nạp Dữ Liệu USGS | **T2 - Ingestion Worker** | 5 phút / lần | [`02-usgs-ingestion.md`](02-usgs-ingestion.md) | `In-Progress` |
| **FEAT-03** | Phân Tích Chuỗi Thời Gian (Patterns 1 - 4) | **T3 - Analysis Worker** | 5 phút / lần | [`03-timeseries-analysis.md`](03-timeseries-analysis.md) | `Planning` |
| **FEAT-04** | Gom Cụm Không Gian Địa Chấn | **T4 - Clustering Worker** (DBSCAN) | 1 ngày / lần | [`04-spatial-clustering.md`](04-spatial-clustering.md) | `Planning` |
| **FEAT-05** | Mô Hình Dự Báo & Phân Loại ($t+1$) | **T5 - Prediction Worker** (Patterns 5 & 6) | 5 phút / lần | [`05-seismic-prediction.md`](05-seismic-prediction.md) | `Planning` |
| **FEAT-06** | Máy Chủ REST API & Kênh SSE Realtime | **T6 - API Service** (FastAPI) | Liên tục (Port 8000) | [`06-api-realtime-sse.md`](06-api-realtime-sse.md) | `In-Progress` |
| **FEAT-07** | Giao Diện Web Dashboard Tương Tác | **T7 - Web Client** (React + Vite) | Liên tục (Port 3000) | [`07-interactive-web-client.md`](07-interactive-web-client.md) | `In-Progress` |

---

## 🔗 Liên Kết & Tài Liệu Phụ Trợ
- [**Khuôn Mẫu Đặc Tả (TEMPLATE.md)**](TEMPLATE.md)
- [**Yêu Cầu Bắt Buộc Đồ Án**](../../yeucaubatbuoc.md)
- [**Thiết Kế Cơ Sở Dữ Liệu (ERD)**](../../architecture/ERD.md)
- [**Tài Liệu Kiến Trúc Hệ Thống (SAD)**](../../architecture/SAD.md)
- [**Đặc Tả Hợp Đồng REST API**](../../api/API.md)
- [**Quy Trình Phát Triển Kỹ Năng**](../skills/spec-driven-workflow.md)

