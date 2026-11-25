# Kịch bản demo GDMAS

Script khởi động PostgreSQL T1 qua Docker Compose, chờ healthy, chạy migration, một chu kỳ T2–T5 rồi khởi động API T6 và chờ `/health`. Web T7 khởi động riêng. Không khởi động các worker nền; script dừng ngay khi bước nào báo lỗi.

## Chuẩn bị

- Cài Bash, Docker Compose, `uv`, `curl`; cài dependencies API theo hướng dẫn dự án. Docker cần truy cập image/build và T2 cần mạng USGS.
- PostgreSQL Compose và API local (`apps/api/.env` hoặc biến môi trường `DATABASE_URL`) **phải trỏ tới cùng CSDL**. Compose đọc `.env` tại gốc; API local đọc `.env` trong `apps/api`. API container dùng thông tin PostgreSQL từ Compose, không dùng `DATABASE_URL` local. Kiểm tra cấu hình đồng nhất trước khi chạy; mặc định cùng CSDL local. Nếu đặt `API_PORT` trong `.env` gốc, cũng export `API_PORT` cho shell để kiểm tra health đúng cổng.
- T5 cần model artifact hợp lệ tại môi trường API local và đủ dữ liệu theo cấu hình. Script kiểm tra có ít nhất một sự kiện sau T2, nhưng điều này không đảm bảo đủ dữ liệu cho T3–T5 hoặc có cụm.
- **Script thay đổi CSDL thật**: migration thay schema, worker ghi kết quả và T4 thay kết quả phân cụm cũ cùng mapping liên quan. Dùng CSDL demo riêng; sao lưu trước khi chạy. Không có rollback toàn bộ chuỗi khi một bước sau thất bại.

## Thực hiện

Từ thư mục gốc, trong Bash:

```bash
bash demo_scripts/run_demo.sh
```

T2 dùng `IngestionService.execute_cycle()` một lần, T3/T5 dùng `--once`; T4 gọi `run_once()` trực tiếp vì entrypoint module hiện bỏ qua `--once` trên dòng lệnh. API và PostgreSQL tiếp tục chạy sau khi script kết thúc hoặc gặp lỗi. Không tự dừng dịch vụ có sẵn; quản lý chúng bằng Docker Compose theo nhu cầu.

Xem dữ liệu (cấu hình kết nối psql qua biến môi trường PostgreSQL hoặc cơ chế an toàn, không ghi mật khẩu vào lệnh):

```bash
psql -X -v ON_ERROR_STOP=1 -f demo_scripts/demo_queries.sql
```

Đối chiếu `service_runs` và thời gian UTC; kết quả rỗng hoặc cũ không chứng minh worker vừa tạo dữ liệu. Khởi động web riêng theo hướng dẫn dự án nếu cần trình diễn giao diện.

## Chụp ảnh minh chứng

1. Chụp terminal sau từng thông báo T1, migration và T2–T5, giữ nguyên cả kết quả và thời gian; không chụp thông tin mật khẩu hoặc biến môi trường.
2. Chạy SQL, chụp số lượng sự kiện, 10 sự kiện mới nhất, `service_runs`, kết quả cụm và dự báo; ghi lại thời gian UTC và nguồn dữ liệu.
3. Mở Swagger tại `http://localhost:8000/docs` (đổi cổng nếu cấu hình khác), chạy các GET bên dưới bằng **Try it out → Execute** và chụp cả URL, trạng thái HTTP và response.
4. Chỉ đưa ảnh có kết quả thật vào mục demo của báo cáo; ghi rõ nếu dữ liệu rỗng, thiếu cụm hoặc dự báo không khả dụng. Không sử dụng ảnh chứa secrets.

## API nên thử trong Swagger

- `GET /api/v1/health` — kết nối hệ thống và DB.
- `GET /api/v1/earthquakes` — danh sách sự kiện.
- `GET /api/v1/statistics/earthquakes` — thống kê.
- `GET /api/v1/analysis/temporal`, `/api/v1/analysis/trend`, `/api/v1/analysis/seasonality`, `/api/v1/analysis/correlation` — P1–P4.
- `GET /api/v1/clusters` — cụm DBSCAN.
- `GET /api/v1/predictions` và `GET /api/v1/classifications` — P5–P6.
- `GET /api/v1/system/status` — trạng thái worker.

Đường dẫn `/health` không có prefix là health cơ bản; Swagger mặc định ở `/docs`.
