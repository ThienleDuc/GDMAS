# Settings & Terminal Monitor (`apps/web/src/features/settings/`)

Trang Cài đặt và Giám sát 7 Terminals của hệ thống GDMAS phục vụ Terminal 7 (Frontend).

## Tính năng

1. **Giám sát 7 Terminals độc lập**:
   - T1: PostgreSQL 16
   - T2: Ingestion (5m)
   - T3: Analysis (5m)
   - T4: Clustering (1d)
   - T5: Prediction (5m)
   - T6: FastAPI REST & SSE (:8000)
   - T7: React + Vite (:3000)
2. **Kiểm soát dữ liệu cũ theo `docs/architecture.md` §9.4**:
   - Tiến trình 5 phút: `fresh` (&le; 15m), `stale` (&gt; 15m), `interrupted` (&gt; 60m).
   - Tiến trình 1 ngày (DBSCAN): `fresh` (&le; 26h), `stale` (&gt; 26h), `interrupted` (&gt; 48h).
3. **Chuyển đổi múi giờ linh hoạt**:
   - Hỗ trợ chuyển đổi nhanh UTC ↔ Giờ địa phương (UTC+7) trên toàn trang.
4. **Kiểm tra trực tiếp kết nối API Backend**:
   - Ping `GET /api/v1/health` để đo độ trễ mạng và xác nhận kết nối CSDL.
5. **Hướng dẫn Kịch bản Demo 6 bước**:
   - Tham chiếu tài liệu yêu cầu bắt buộc `docs/yeucaubatbuoc.md` §4.
