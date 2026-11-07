# BẢNG PHÂN CÔNG CÔNG VIỆC & MỤC TIÊU PHÁT TRIỂN

## DỰ ÁN HỆ THỐNG GIÁM SÁT VÀ PHÂN TÍCH THIÊN TAI TOÀN CẦU (GDMAS)

- **Quy mô đội ngũ:** 4 Thành viên con người (1 Frontend + 3 Backend) kết hợp Đội ngũ AI Agents chuyên trách.
- **Nguyên tắc phân định ranh giới:**
  - 🎨 **Frontend (01 Dev):** Đảm nhiệm trọn vẹn mục [`docs/planning/ui/`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/README.md) (Master App Shell & 5 Views).
  - ⚙️ **Backend (03 Devs):** Phân bổ mỗi người chịu trách nhiệm chính **01 Chức Năng Chưa Hoàn Thành** trong [`docs/planning/features/`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/README.md) (FEAT-03, FEAT-04, FEAT-05).
  - 🧱 **Hạ tầng lõi dùng chung (Đã hoàn thành 100%):** FEAT-01 (CSDL PostgreSQL 16), FEAT-02 (USGS Ingestion 5p), FEAT-06 (FastAPI REST & SSE Stream) đã sẵn sàng làm bệ phóng kết nối.
  - 🧪 **Kiểm thử (QA/Testing):** Bàn giao toàn quyền cho **AI Agents** tự động hóa dựa trên [`docs/planning/testing/`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/README.md).
- **Quy ước bất biến:** **RULE-03 (Open-Closed Principle: Không sửa mã nguồn hiện có - Chỉ bổ sung thêm mới)**.

---

## 1. Phân Hệ Frontend (Đảm Nhiệm: 01 Dev)

**Phạm vi quy hoạch:** Trọn bộ thư mục [**`docs/planning/ui/`**](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/README.md)  
**Môi trường vận hành:** **Terminal 7** (`cd apps/web; pnpm dev --port 3000`)

### Mục Tiêu Cần Phát Triển:

| Mã Giao Diện  | Tệp Đặc Tả Quy Hoạch                                                                          | Mục Tiêu Kỹ Thuật & Yêu Cầu Cần Đạt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-----------: | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **LAYOUT-01** | [`00-master-app-shell.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/00-master-app-shell.md) | - Xây dựng khung bố cục dùng chung (Sidebar 260px, Header Breadcrumb, Global Toast Stack).<br>- Áp dụng chuẩn **Design Tokens Dark Mode** (`#0f172a` nền root, `#1e293b` nền card, `#38bdf8` màu nhấn cyan).<br>- Tích hợp đèn tín hiệu SSE Status Indicator (Connected / Reconnecting / Disconnected).                                                                                                                                                                                                                                                                   |
|  **VIEW-01**  | [`01-dashboard-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/01-dashboard-view.md)     | - Trực quan hóa 4 Thẻ KPI thống kê tổng quan (Tổng số trận, Richter max, Điểm nóng nhất, Trạng thái hệ thống).<br>- Mini Map Leaflet hiển thị các chùm động đất gần nhất kèm popup thông tin nhanh.<br>- Biểu đồ tóm tắt xu hướng 24h và danh sách cảnh báo mới nhất.                                                                                                                                                                                                                                                                                                     |
|  **VIEW-02**  | [`02-earthquakes-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/02-earthquakes-view.md) | - Bảng dữ liệu phân trang (20/50/100 dòng), sắp xếp đa chiều (thời gian, độ Richter, độ sâu).<br>- Thanh trượt kép Richter Slider ($0.0 - 9.0$) có Debounce 300ms.<br>- Drawer trượt cạnh phải xem chi tiết metadata JSON và tọa độ WGS84.                                                                                                                                                                                                                                                                                                                                |
|  **VIEW-03**  | [`03-analytics-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/03-analytics-view.md)     | - **Trực quan hóa trọn vẹn 6 Patterns Chuỗi Thời Gian:**<br> 1. _Temporal:_ Line chart, Scatter plot, Histogram có công tắc chuyển Ngày/Tuần/Tháng.<br> 2. _Trend Analysis:_ Đường xu hướng sau Re-sampling kèm thanh trượt Zoom Brush (§5.2).<br> 3. _Seasonality:_ Biểu đồ đường chu kỳ mùa vụ theo tuần/tháng.<br> 4. _Correlation:_ Ma trận tương quan đa biến dạng Heatmap màu tương phản.<br> 5. _Dự báo $t+1$:_ Điểm số lượng dự báo kèm dải khoảng tin cậy 95% Ribbon.<br> 6. _Phân loại $t+1$:_ Huy hiệu phân cấp mức độ rủi ro địa chấn kèm phần trăm xác suất. |
|  **VIEW-04**  | [`04-clusters-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/04-clusters-view.md)       | - Bản đồ Leaflet GIS chuyên sâu hiển thị các cụm động đất DBSCAN qua các lớp màu phân biệt.<br>- Hiển thị đa giác/vòng tròn ranh giới cụm, tâm chùm (centroid) và các điểm nhiễu ngoại lai.                                                                                                                                                                                                                                                                                                                                                                               |
|  **VIEW-05**  | [`05-system-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/05-system-view.md)           | - Giám sát sức khỏe thời gian thực của 7 Terminals và bảng lịch sử tác vụ `service_runs`.<br>- **Bảng điều khiển Kịch bản Demo Hội đồng (§4):** Nút giả lập xóa rỗng CSDL, hiển thị Empty State thẩm mỹ, và nút 1-click kích hoạt nạp phục hồi tự động.                                                                                                                                                                                                                                                                                                                   |

---

## 2. Phân Hệ Backend (Đảm Nhiệm: 03 Devs - Mỗi Người 01 Chức Năng Chưa Hoàn Thành)

**Phạm vi quy hoạch:** Trọn bộ thư mục [**`docs/planning/features/`**](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/README.md)  
**Môi trường vận hành:** Terminals 1, 2, 3, 4, 5, 6

> [!NOTE]
> **Hạ Tầng Lõi Dùng Chung (Đã hoàn thành 100%):**
>
> - **FEAT-01 (Terminal 1 - PostgreSQL 16 & Alembic):** Schema 7 bảng, kết nối pool, chỉ mục tối ưu đã sẵn sàng.
> - **FEAT-02 (Terminal 2 - USGS Ingestion Worker 5p):** Pipeline cào GeoJSON và Upsert khử trùng lặp đã chạy ổn định.
> - **FEAT-06 (Terminal 6 - FastAPI Server REST & SSE Stream):** Endpoints REST và kênh SSE Realtime đã phục vụ tại port 8000.  
>   $\rightarrow$ _Cả 3 thành viên Backend kế thừa trực tiếp hạ tầng này và tập trung hoàn thiện 3 chức năng phân tích chuyên sâu còn lại._

### Phân Bổ 3 Chức Năng Cho 3 Lập Trình Viên Backend:

| Thành Viên Đảm Nhiệm | Mã Chức Năng Phụ Trách |           Terminal Sở Hữu           | Tệp Đặc Tả Quy Hoạch                                                                                      | Mục Tiêu Kỹ Thuật Cần Phát Triển & Hoàn Thành                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :------------------- | :--------------------: | :---------------------------------: | :-------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend Dev 1**    |      **FEAT-03**       | **Terminal 3**<br>_(Chu kỳ 5m/lần)_ | [`03-timeseries-analysis.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/03-timeseries-analysis.md) | **Động Cơ Phân Tích Chuỗi Thời Gian 4 Patterns:**<br>- Bóc tách và hoàn thiện thuật toán từ `demo_seeder.py` sang worker độc lập [`services/analysis/runner.py`](file:///d:/KHDLKPDL/GDMAS/apps/api/src/gdmas/services/analysis/runner.py).<br>- Re-sampling đa chiều theo Ngày (`1D`), Tuần (`1W`), Tháng (`1ME`).<br>- Tính toán trọn vẹn 4 Patterns: _Pattern 1_ (Line/Scatter/Histogram), _Pattern 2_ (Trend Analysis & Slope), _Pattern 3_ (Seasonality theo tuần/tháng), _Pattern 4_ (Ma trận tương quan Pearson đa biến).<br>- Lưu kết quả vào bảng `analysis_results` và cung cấp dữ liệu qua API `/api/v1/patterns`.                                              |
| **Backend Dev 2**    |      **FEAT-04**       | **Terminal 4**<br>_(Chu kỳ 1d/lần)_ | [`04-spatial-clustering.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/04-spatial-clustering.md)   | **Động Cơ Gom Cụm Không Gian Địa Chấn DBSCAN:**<br>- Bóc tách và hoàn thiện thuật toán từ `demo_seeder.py` sang worker độc lập [`services/clustering/runner.py`](file:///d:/KHDLKPDL/GDMAS/apps/api/src/gdmas/services/clustering/runner.py).<br>- Gom cụm địa chấn DBSCAN dựa trên tọa độ WGS84 (`latitude`, `longitude`).<br>- Xác định tâm chùm động đất (centroid), bán kính cụm, số lượng sự kiện thuộc cụm và lọc các điểm nhiễu ngoại lai (`noise`).<br>- Lưu kết quả vào bảng `clustering_results` và `clustering_event_mapping`, cung cấp dữ liệu cho bản đồ Leaflet View 04.                                                                                     |
| **Backend Dev 3**    |      **FEAT-05**       | **Terminal 5**<br>_(Chu kỳ 5m/lần)_ | [`05-seismic-prediction.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/05-seismic-prediction.md)   | **Mô Hình Dự Báo Định Lượng & Phân Loại Rủi Ro ($t+1$):**<br>- Bóc tách và hoàn thiện mô hình từ `demo_seeder.py` sang worker độc lập [`services/prediction/runner.py`](file:///d:/KHDLKPDL/GDMAS/apps/api/src/gdmas/services/prediction/runner.py).<br>- _Pattern 5 (Dự báo định lượng):_ Dự báo số lượng sự kiện ngày tiếp theo ($t+1$) kèm dải khoảng tin cậy 95% (Lower/Upper Bound).<br>- _Pattern 6 (Phân loại rủi ro):_ Phân loại mức độ rủi ro ngày tiếp theo ($t+1$) theo 4 cấp độ: `Low`, `Moderate`, `High`, `Critical` kèm phân bổ xác suất.<br>- Lưu kết quả vào bảng `prediction_results`, `classification_results` và cung cấp dữ liệu qua API cho View 03. |

---

## 3. Phân Hệ Kiểm Thử (Bàn Giao Toàn Quyền Cho AI Agents)

**Phạm vi quy hoạch:** Trọn bộ 12 bản đặc tả trong [**`docs/planning/testing/`**](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/README.md)  
**Vai trò phụ trách:** **AI QA & Test Automation Specialist** (Kích hoạt qua hệ kỹ năng và quy trình phát triển)

### Mục Tiêu Tự Động Hóa Kiểm Thử Của AI Agents:

| Nhóm Kiểm Thử                    | Các Bản Đặc Tả Phụ Trách                                                                                                                                                                                                      | Mục Tiêu Tự Động Hóa & Đo Lường                                                                                                                                                         |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend & Services (T1 - T6)** | [`01-test-database-storage.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/01-test-database-storage.md) đến [`06-test-api-realtime-sse.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/06-test-api-realtime-sse.md) | - Sinh mã Pytest tự động cho CSDL, Ingestion Worker, 6 Patterns thuật toán, SSE stream.<br>- Đo lường hiệu năng: Ingestion $<5$s, tính toán Patterns $<5$s, độ trễ API $<100$ms.        |
| **Frontend & UI (T7)**           | [`07-test-master-app-shell.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/07-test-master-app-shell.md) đến [`11-test-clusters-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/11-test-clusters-view.md)       | - Sinh mã test component tự động (Vitest + React Testing Library) cho App Shell và 5 Views.<br>- Kiểm tra chuẩn Tokens Dark Mode, tương tác Slider Debounce, thanh Zoom Brush Recharts. |
| **Resilience & Demo §4**         | [`12-test-system-demo-view.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/12-test-system-demo-view.md)                                                                                                                  | - Tự động hóa kịch bản xóa rỗng CSDL (`Empty State`), kiểm tra giao diện không crash và xác thực khả năng tự phục hồi khi Ingestion chạy lại.                                           |

---

## 4. Bảng Đăng Ký & Xác Nhận Thành Viên (Member Sign-Off Table)

_Các thành viên trong nhóm điền thông tin và ký xác nhận phân công trách nhiệm dưới đây:_

|  STT  | Họ và Tên Thành Viên     | Mã Số Sinh Viên | Email Liên Hệ | Vai Trò Đảm Nhiệm       | Chức Năng Cần Phát Triển (Đảm Nhiệm Chính)                                                                                                                        | Chữ Ký / Xác Nhận |
| :---: | :----------------------- | :-------------: | :-----------: | :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------: |
| **1** | Lê Đức Thiện             | 22115053122138  |               | **Frontend Developer**  | [`docs/planning/ui/`](file:///d:/KHDLKPDL/GDMAS/docs/planning/ui/README.md) (Master App Shell & 5 Views)                                                          |                   |
| **2** | Nguyễn Trung Sơn         | 21115053120241  |               | **Backend Dev 1**       | **FEAT-03:** [`03-timeseries-analysis.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/03-timeseries-analysis.md) (T3: Time-Series Analysis Worker)          |                   |
| **3** | Nguyễn Đình Văn          | 23115053122248  |               | **Backend Dev 2**       | **FEAT-04:** [`04-spatial-clustering.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/04-spatial-clustering.md) (T4: DBSCAN Spatial Clustering Worker)       |                   |
| **4** | Trần Đức Tài             |  2415053122241  |               | **Backend Dev 3**       | **FEAT-05:** [`05-seismic-prediction.md`](file:///d:/KHDLKPDL/GDMAS/docs/planning/features/05-seismic-prediction.md) (T5: Seismic Prediction & Risk $t+1$ Worker) |                   |
| **—** | _Core Infrastructure_    |    _Shared_     |   _Shared_    | **Backend Platform**    | **FEAT-01, FEAT-02, FEAT-06** (CSDL, Ingestion, API/SSE - _Đã Xong 100%_)                                                                                         |    ✅ _Ready_     |
| **—** | **AI Agent Coordinator** |    _System_     |  _Automated_  | **QA & Test Automator** | [`docs/planning/testing/`](file:///d:/KHDLKPDL/GDMAS/docs/planning/testing/README.md) (12 Test Suites Tự Động Hóa)                                                |    ✅ _Active_    |

---

_Tài liệu này là căn cứ chính thức để đối chiếu trách nhiệm cá nhân trong toàn bộ chu kỳ phát triển hệ thống GDMAS._
