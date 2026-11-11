# Danh sách Task — Lê Đức Thiện (`thien` / `ThienleDuc`)

Vai trò: Frontend Developer & Techlead (Terminal 7 — `apps/web/`, cổng `3000`).
Phạm vi phụ trách: Xây dựng giao diện React + TypeScript + Vite phong cách Dark Mode, trực quan hóa đầy đủ 6 Patterns chuỗi thời gian, bản đồ GIS tương tác Leaflet, kết nối Real-time SSE và đáp ứng Kịch bản Demo 6 bước từ dữ liệu thật của Backend API.

Lưu ý kiến trúc và quy ước:
- Giao diện chỉ giao tiếp với Backend thông qua Database API (`apps/web/src/services/`), không kết nối trực tiếp tới PostgreSQL và tuyệt đối không hiển thị dữ liệu mock tĩnh khi hệ thống chạy chính thức.
- Tôn trọng nguyên tắc Open-Closed (`RULE-03`): các component biểu đồ mới đặt trong `apps/web/src/components/charts/`, component bản đồ mới đặt trong `apps/web/src/components/map/`, không làm vỡ các hook và tiện ích đang ổn định.
- Mọi tọa độ tuân thủ chuẩn WGS84 (`latitude`, `longitude`) và xử lý mốc thời gian theo chuẩn UTC (`apps/web/src/utils/timezone.ts`).

---

### Task 1: Xây dựng bộ component biểu đồ cho 6 Patterns chuỗi thời gian và nâng cấp trang Thống kê

**Mô tả task:**

Hiện tại thư mục `apps/web/src/components/charts/` chỉ mới có tệp `README.md` (chưa có component biểu đồ thực tế), còn trang `apps/web/src/features/statistics/StatisticsPage.tsx` mới chỉ hiển thị 6 thẻ thông số văn bản và vẫn còn giá trị dự phòng tĩnh khi thiếu trường dữ liệu (ví dụ `"+0.0125"`, `"24.5 km"`).

Bạn cần xây dựng bộ component biểu đồ tương tác thực sự bằng thư viện Recharts (đã cài trong `apps/web/package.json`) tại `apps/web/src/components/charts/` và tích hợp đầy đủ vào `StatisticsPage.tsx` cho toàn bộ 6 Patterns bắt buộc của đồ án:

- Với **Pattern 1 (Biểu diễn theo thời gian)**: xây dựng 3 biểu đồ gồm Line chart thể hiện biến thiên số lượng và độ lớn theo thời gian, Scatter plot thể hiện phân tán giữa `depth_km` và `magnitude`, cùng Histogram phân phối tần suất theo các khoảng độ lớn; kèm nút chuyển đổi khung thời gian Ngày, Tuần, Tháng (`day`, `week`, `month`).
- Với **Pattern 2 (Trend Analysis sau Re-sampling)**: vẽ đường so sánh giá trị thực tế và đường xu hướng (`trend_value`) sau khi Re-sampling theo Tuần/Tháng, kèm thanh kéo Zoom Brush cho phép người dùng phóng to hoặc thu hẹp khoảng thời gian phân tích và hiển thị độ dốc xu hướng (`slope`, `trend_direction`).
- Với **Pattern 3 (Seasonality sau Re-sampling)**: vẽ biểu đồ đường chu kỳ mùa vụ (`seasonal_line` / `seasonal_components`), hiển thị chỉ số cường độ mùa vụ và phần diễn giải kết quả phân tích.
- Với **Pattern 4 (Correlation Matrix)**: xây dựng ma trận tương quan đa biến dạng Heatmap trên 5 biến định lượng (`magnitude`, `depth_km`, `latitude`, `longitude`, tần suất sự kiện) với thang màu tương phản rõ trên nền Dark Mode và tooltip hiển thị hệ số Pearson chính xác.
- Với **Pattern 5 (Dự báo định lượng t+1)**: trực quan hóa giá trị dự báo ngày kế tiếp kèm dải khoảng tin cậy 95% (`lower_bound` đến `upper_bound`), tên mô hình và sai số đánh giá (`mae`, `rmse`), phân biệt trực quan rõ ràng giữa dữ liệu quan sát thực tế và dữ liệu dự báo (`docs/architecture.md` §10.4).
- Với **Pattern 6 (Phân loại mức độ hoạt động t+1)**: hiển thị nhãn dự báo rủi ro (`LOW`, `MEDIUM`/`NORMAL`, `HIGH`, `CRITICAL`) kèm biểu đồ hoặc thanh phân phối xác suất từng lớp và ghi chú đây là chỉ báo thống kê thử nghiệm (không thay thế cảnh báo thiên tai chính thức).
- Khi bất kỳ pattern nào ở trạng thái `PENDING` hoặc chưa có bản ghi trong CSDL, component biểu đồ phải hiển thị trạng thái rỗng rõ ràng thay vì chèn số liệu dự phòng tĩnh.

---

### Task 2: Tích hợp bản đồ GIS tương tác Leaflet và lớp cụm địa chấn DBSCAN

**Mô tả task:**

Hiện tại `apps/web/src/features/monitoring/MonitoringMapPage.tsx` mới chỉ là khung nền lưới SVG mô phỏng radar, còn thư mục `apps/web/src/components/map/` chưa có component bản đồ thật.

Bạn cần dùng `leaflet` và `react-leaflet` (đã có trong `apps/web/package.json`) để xây dựng bản đồ địa chấn toàn cầu thực sự đặt tại `apps/web/src/components/map/` và gắn vào `MonitoringMapPage.tsx`:

- Nạp bản đồ nền Dark Mode tương thích giao diện chung và vẽ các marker sự kiện động đất theo đúng tọa độ WGS84 (`latitude`, `longitude`) lấy từ API `GET /api/v1/earthquakes`. Kích thước và màu sắc điểm đánh dấu thay đổi trực quan theo `magnitude` và `depth_km`.
- Khi nhấn vào một điểm động đất trên bản đồ, hiển thị Popup hoặc Panel chi tiết gồm địa điểm (`place`), mã nguồn USGS (`source_event_id`), thời gian UTC/Local, độ sâu và độ lớn.
- Tích hợp lớp hiển thị kết quả phân cụm không gian DBSCAN lấy từ `GET /api/v1/clusters` (hoặc trường `clustering_summary`), vẽ tâm cụm (`center_latitude`, `center_longitude`), vòng tròn phạm vi cụm và thông tin tổng hợp từng cụm (số lượng sự kiện, độ lớn trung bình/cực đại), cho phép người dùng bật tắt nhanh bằng công tắc `Hiển thị cụm DBSCAN`.
- Hoàn thiện bộ điều khiển lọc nổi trên bản đồ gồm thanh trượt `magnitude` (có debounce tránh gọi API liên tục), bộ lọc khoảng thời gian và hiển thị tọa độ tâm bản đồ thực tế thay cho số tĩnh hiện tại.

---

### Task 3: Chuẩn hóa dữ liệu động cho trang Báo cáo, hoàn thiện trang Cài đặt Hệ thống và Kịch bản Demo 6 bước

**Mô tả task:**

Hiện tại trang `apps/web/src/features/reports/ReportsPage.tsx` vẫn đang hardcode tĩnh toàn bộ số liệu (`1,248` trận động đất, `16` cụm) và dùng sai tên 6 loại pattern (`Cyclic`, `Swarm`, `Quiet`, `Burst`, `Aftershock`, `Foreshock`) không khớp với 6 patterns chuỗi thời gian bắt buộc trong `docs/yeucaubatbuoc.md`. Bên cạnh đó, tuyến đường dẫn `APP_ROUTES.SETTINGS` (`/settings`) trong `apps/web/src/app/routes.tsx` chưa có màn hình chuyên trách hoàn chỉnh.

Bạn cần thực hiện đồng bộ cả hai phần sau:

- Thay toàn bộ dữ liệu tĩnh trong `ReportsPage.tsx` bằng dữ liệu thật truy vấn từ API (`/api/v1/statistics/earthquakes`, `/api/v1/patterns`, `/api/v1/clusters`, `/api/v1/system/status`), cập nhật bảng thống kê và phần tóm tắt thành đúng 6 Patterns phân tích chuỗi thời gian của hệ thống (Temporal, Trend, Seasonality, Correlation, Dự báo $t+1$, Phân loại $t+1$), đồng thời giữ định dạng in ấn gọn đẹp (`print:*`) để xuất tài liệu phục vụ báo cáo đồ án.
- Tạo mới page cấu hình và giám sát hệ thống cho route `/settings`, hiển thị trạng thái thời gian thực của 7 Terminals (`PostgreSQL`, `Ingestion`, `Analysis`, `Clustering`, `Prediction`, `Database API`, `Frontend`), thời điểm cập nhật gần nhất (`last_run`), cảnh báo khi dữ liệu cũ hoặc chu kỳ 5 phút bị gián đoạn (`docs/architecture.md` §9.4), thiết lập hiển thị múi giờ UTC hoặc Giờ địa phương qua `apps/web/src/utils/timezone.ts`, và khu vực hướng dẫn/kiểm chứng nhanh cho buổi Demo.
- Rà soát toàn bộ trạng thái Loading, Error và Empty State trên `DashboardOverviewPage.tsx`, `EarthquakesPage.tsx`, `StatisticsPage.tsx`, `MonitoringMapPage.tsx` và `ReportsPage.tsx`. Bảo đảm khi CSDL bị xóa trống (Bước 2 và Bước 3 của Kịch bản Demo trong `docs/yeucaubatbuoc.md`), giao diện nhận sự kiện `database_cleared` qua SSE, chuyển ngay sang trạng thái trống/cảnh báo rõ ràng (tuyệt đối không fallback sang mảng mock tĩnh) và tự động nạp lại toàn bộ số liệu khi các worker chạy phục hồi (Bước 6 Demo).

---

### Task 4: Đồng bộ lớp Services, Contracts, SSE Frontend và viết bộ kiểm thử giao diện

**Mô tả task:**

Hiện tại `apps/web/src/services/earthquake-api.ts` mới chỉ có các hàm gọi `/earthquakes`, `/statistics/earthquakes`, `/earthquakes/sync` và `/patterns`, trong khi đặc tả `docs/api/API.md` yêu cầu thêm nhiều endpoint chi tiết cho từng pattern, phân cụm và giám sát hệ thống.

Bạn cần thực hiện:

- Rà soát `apps/web/src/contracts/index.ts`, `apps/web/src/types/index.ts` và `apps/web/src/services/earthquake-api.ts` để bổ sung đầy đủ kiểu dữ liệu TypeScript chặt chẽ (tránh dùng `any`) và hàm gọi cho `/api/v1/health`, `/api/v1/system/status`, `/api/v1/analysis/temporal`, `/api/v1/analysis/trend`, `/api/v1/analysis/seasonality`, `/api/v1/analysis/correlation`, `/api/v1/predictions`, `/api/v1/classifications` và `/api/v1/clusters`.
- Mở rộng `QueryEarthquakeParams` trong `earthquake-api.ts` hỗ trợ truyền thêm `start_time`, `end_time` (ISO 8601 UTC) và bounding box tọa độ (`min_lat`, `max_lat`, `min_lon`, `max_lon`).
- Kiểm tra `apps/web/src/hooks/useSSE.ts` và component `IngestionToast.tsx` để bảo đảm kết nối SSE xử lý ổn định cả khi mất kết nối tạm thời (hiển thị trạng thái Reconnecting/Disconnected trên shell) và nhận đúng tên sự kiện từ Backend (`/api/v1/stream/earthquakes` và `/api/v1/events/stream`).
- Sử dụng quy trình `write-testcase` tạo biên bản kiểm thử tại `.agents/notes/testcase/` kèm unit test offline cho lớp `services/` và các component quan trọng (mock `fetch` và `EventSource`, kiểm tra render Empty State khi DB rỗng và format thời gian UTC/WGS84), đồng thời chạy `cd apps/web && pnpm build` (`tsc -b && vite build`) sạch lỗi trước khi tạo PR.

