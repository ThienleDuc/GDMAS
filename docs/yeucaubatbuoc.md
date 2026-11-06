# 📋 YÊU CẦU BẮT BUỘC DỰ ÁN (TIME-SERIES)

> 💡 **Quy tắc triển khai quan trọng:**
> Mỗi khối trong kiến trúc hệ thống phải được chạy ở một terminal riêng biệt như một **service độc lập** (mô hình Microservices/Modular).

---

## 1. 🏗️ Sơ đồ Kiến trúc Hệ thống

### 1.1. Sơ đồ trực quan (Mermaid Diagram)

```mermaid
flowchart TD
    %% Styling Classes
    classDef yellow fill:#FFF2CC,stroke:#D6B656,stroke-width:1.5px,rx:6px,ry:6px;
    classDef purple fill:#E1D5E7,stroke:#9673A6,stroke-width:1.5px,rx:6px,ry:6px;
    classDef green fill:#D5E8D4,stroke:#82B366,stroke-width:1.5px,rx:6px,ry:6px;
    classDef blue fill:#DAE8FC,stroke:#6C8EBF,stroke-width:1.5px,rx:6px,ry:6px;
    classDef note fill:none,stroke:none,font-size:12px,font-style:italic,color:#555;

    %% Front-End Layer
    note_fe["Yêu cầu: Thẩm mỹ"]:::note -.-> FE["Front End"]:::purple
    FE --> DB_API["Database API"]:::green
    DB_API --> DB[("Database")]:::green

    %% Data Pipeline Layer
    note_ds["Nguồn dữ liệu tự chọn:<br/>• Theo thời gian<br/>• Có cập nhật"]:::note -.-> DS["Data Source"]:::yellow
    note_di["Chu kỳ:<br/>5 phút lấy dữ liệu 1 lần"]:::note -.-> DI["Data Ingestion"]:::blue

    DI --> DS
    DI --> DB

    %% Backend Services Subgraph
    subgraph Backend_Services ["Backend Services"]
        direction TB
        subgraph Top_Services [" "]
            direction LR
            DA["Data Analysis"]:::blue
            CL["Clustering"]:::blue
        end
        PR["Prediction"]:::blue

        note_da["Chu kỳ: 5 phút/lần"]:::note -.-> DA
        note_cl["Chu kỳ: 1 ngày/lần"]:::note -.-> CL
        note_pr["Chu kỳ: 5 phút/lần"]:::note -.-> PR
    end

    Backend_Services --> DB

    style Backend_Services fill:#F8F9FA,stroke:#4A90E2,stroke-width:1.5px,stroke-dasharray: 4 4;
    style Top_Services fill:none,stroke:none;
```

---

### 1.2. Sơ đồ dạng Text (ASCII)

```text
                                [ Thẩm mỹ ]
                                     │
                                     ▼
                              ┌──────────────┐
                              │  Front End   │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Database API │
                              └──────┬───────┘
                                     │
                                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────────────────────────────────────────┐
│ Data Source  │ ◄── │Data Ingestion│ ──► │   Database   │ ◄── │                Backend Services                │
└──────▲───────┘     └──────▲───────┘     └──────────────┘     │ ┌─────────────┐ ┌────────────┐ ┌─────────────┐ │
       │                    │                                  │ │Data Analysis│ │ Clustering │ │ Prediction  │ │
[Nguồn dữ liệu:      [Tần suất:                                │ └──────▲──────┘ └─────▲──────┘ └──────▲──────┘ │
 - Theo thời gian     5 phút lấy                               └────────┼──────────────┼───────────────┼────────┘
 - Có cập nhật]       dữ liệu 1 lần]                                    │              │               │
                                                                   [Tần suất:     [Tần suất:      [Tần suất:
                                                                    5 phút/lần]    1 ngày/lần]     5 phút/lần]
```

---

## 2. 📈 Các Patterns Phân Tích Bắt Buộc (Time-Series Data)

|  STT  | Nhóm Phân Tích                 | Chi Tiết Biểu Đồ & Yêu Cầu                                                                                                                                       |          Tần Suất / Phạm Vi           |
| :---: | :----------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----------------------------------: |
| **1** | **Biểu diễn theo thời gian**   | Vẽ **3 biểu đồ** tương ứng với các quãng thời gian:<br>• `Line chart` (Đường xu hướng)<br>• `Scatter plot` (Phân tán điểm)<br>• `Histogram` (Phân phối tần suất) |          Ngày / Tuần / Tháng          |
| **2** | **Trend Analysis**             | Biểu diễn xu hướng (Trend) của dữ liệu sau khi thực hiện **Re-sampling**                                                                                         | Tháng _(hoặc Tuần nếu thiếu dữ liệu)_ |
| **3** | **Seasonality**                | Biểu diễn tính chu kỳ / mùa vụ (**Seasonal line**) sau khi **Re-sampling**                                                                                       | Tháng _(hoặc Tuần nếu thiếu dữ liệu)_ |
| **4** | **Tương quan (Correlation)**   | Ma trận tương quan (Correlation Matrix / Heatmap) giữa các biến đo đạc                                                                                           |                Đa biến                |
| **5** | **Hồi quy & Dự báo**           | Hiển thị giá trị dự báo định lượng cho ngày tiếp theo _(Ví dụ: Nhiệt độ, phụ tải điện, giá cổ phiếu)_                                                            |        Ngày kế tiếp ($t + 1$)         |
| **6** | **Phân loại (Classification)** | Hiển thị nhãn phân loại dự đoán cho ngày tiếp theo _(Ví dụ: Thời tiết nắng/mưa, mức tiêu thụ cao/thấp)_                                                          |        Ngày kế tiếp ($t + 1$)         |

---

## 3. 🎯 Tiêu Chuẩn Sản Phẩm Mong Muốn (Deliverables)

### 🖥️ 3.1. Giao diện Người dùng (Frontend)

- [ ] **Độ bao phủ dữ liệu:** Hiển thị trực quan đầy đủ (hoặc mở rộng thêm) toàn bộ 6 patterns đã nêu ở mục 2.
- [ ] **Trải nghiệm & Thẩm mỹ:** Bố cục khoa học, hiện đại, phối màu trực quan, hỗ trợ tương tác lọc khoảng thời gian.

### ⚙️ 3.2. Kiến trúc & Vận hành Hệ thống

- [ ] **Chức năng:** Hệ thống chạy trơn tru, không gặp lỗi ngắt quãng chuỗi pipeline.
- [ ] **Kiến trúc module:** Tách bạch rõ rệt từng service (Ingestion, Database, API, Analysis, Prediction, UI).
- [ ] **Cập nhật tự động:** Luồng dữ liệu tự động ingest và cập nhật kết quả phân tích theo thời gian thực (định kỳ 5 phút / 1 ngày).

### 📑 3.3. Báo cáo & Tài liệu kỹ thuật

- [ ] Báo cáo trình bày sạch đẹp, bố cục chuẩn học thuật/kỹ thuật.
- [ ] Đầy đủ mô tả kiến trúc, công nghệ sử dụng, giải thuật áp dụng và phân tích kết quả.

### 🗣️ 3.4. Năng lực Phản biện & Hiểu sâu Hệ thống

- [ ] Nắm vững nguyên lý hoạt động của từng service và luồng dữ liệu truyền tải giữa các khối.
- [ ] Trả lời phản biện rõ ràng, tự tin các câu hỏi vấn đáp kỹ thuật từ hội đồng/giảng viên.
