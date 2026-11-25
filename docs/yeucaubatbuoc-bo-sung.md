# Yêu cầu bổ sung (thầy thông báo — 2026-11-24)

> Tài liệu ghi nhận nguyên văn yêu cầu bổ sung và kết quả **kiểm tra mã nguồn GDMAS**
> tại nhánh `docs/2026-11-24-yeu-cau-bo-sung`. Ký hiệu: ✅ khớp · ⚠️ khớp một phần ·
> ❌ chưa khớp · ⏳ không phải mã nguồn (hành chính/lịch).

---

## 1. Nguyên văn yêu cầu

```text
Nhóm mình Làm trên toàn thể giới
Cỡ tháng sau báo cáo cuối kì (khi nào báo cáo thầy thông báo sau)
Tuần sau ko đi học
Nên Dùng proxy rotation để lấy dữ liệu từ api nhiều hơn
Phải in tập báo cáo cuối kì

-Database sẽ chứa 2 loại dữ liệu:

    Data writing: chứa dữ liệu thô

    Data mart: chứa dữ liệu qua xử lý
    -Prediction có 2 loại:

    Liên tục

    Rời rạc
    -Clustering: dùng để phân nhóm
    -Ban đầu dữ liệu thô nằm ở Data writing, sau khi qua prediction, clustering và Data analysis xử lý thì mới quay lại data mart
    -Frontend gửi JSon tới Database API (SSO, OIDC) rồi mới vào database chính
```

---

## 2. Kiểm tra mã nguồn & tick xác nhận

| # | Yêu cầu | Trạng thái | Bằng chứng trong mã nguồn | Đề xuất nếu chưa khớp |
|:--|:--|:--:|:--|:--|
| 1 | Làm trên toàn thế giới | ✅ | `docs/architecture/SAD.md:31` mô tả phạm vi toàn cầu; `USGS_FEED_URL=.../all_hour.geojson`; `ingestion/backfill.py` dùng feed `all_month` (SAD.md:136, thực tế 102 quốc gia); `ingestion/parser.py` giữ WGS84 toàn cầu; FE mặc định `ALL_COUNTRIES="all"` (`country-filter.ts:6`) | — |
| 2 | Báo cáo cuối kỳ tháng sau (thầy báo sau) | ⏳ | Không phải mã nguồn | Ghi mốc vào `docs/task/`; cập nhật khi thầy thông báo lịch cụ thể |
| 3 | Tuần sau không đi học | ⏳ | Không phải mã nguồn | — |
| 4 | Dùng proxy rotation để lấy nhiều dữ liệu hơn | ❌ | `_http_client()` trong `services/ingestion/service.py:148` tạo `httpx.Client` cố định, chỉ có `timeout`/`follow_redirects`/`transport`; `backfill.py:101` cũng vậy. Không có danh sách proxy, không xoay vòng, không xử lý 429/403 | Xem mục 3.1 |
| 5 | Phải in tập báo cáo cuối kỳ | ⚠️ | Repo đã có tài liệu (`docs/`, báo cáo thiết kế) nhưng **không có** script xuất/đóng tập PDF | Xem mục 3.2 |
| 6 | DB có 2 loại: Data writing (thô) và Data mart (xử lý) | ⚠️ | Một schema `public` duy nhất: bảng thô `earthquake_events` (`models/earthquake.py:20`); bảng xử lý `analysis_results`, `prediction_results`, `classification_results`, `clustering_results`, `clustering_event_mapping`; migration `001_initial_gdmas_schema.py` không `create_schema`. Chưa tách vật lý/hai schema | Xem mục 3.3 |
| 7 | Prediction có 2 loại: liên tục & rời rạc | ✅ | `models/prediction.py`: `PredictionResult.predicted_value/lower_bound/upper_bound` (liên tục, dòng 20–44) và `ClassificationResult.predicted_label/probability_scores` (rời rạc, dòng 47–69); cả hai được ghi ở `services/prediction/service.py:107,119` | — |
| 8 | Clustering dùng để phân nhóm | ✅ | `services/clustering/service.py`: `compute_dbscan()` dùng `sklearn.cluster.DBSCAN` (dòng 16, 65–87), ghi `ClusteringResult` + `ClusteringEventMapping` (dòng 211, 224) | — |
| 9 | Thô ở Data writing → qua prediction/clustering/analysis → quay lại Data mart | ⚠️ | Ingestion ghi `earthquake_events` (`ingestion/upsert.py`); workers ghi `analysis_results` (`analysis/service.py:98`), `prediction_results`/`classification_results` (`prediction/service.py`), `clustering_results` (`clustering/service.py`). Luồng đúng nhưng **cùng schema**, chưa có bước "trở lại data mart" tách biệt | Xem mục 3.3 |
| 10 | FE gửi JSON → Database API (SSO, OIDC) → DB chính | ⚠️ | FE gửi JSON qua `fetchApi` (`services/earthquake-api.ts:157`, `services/ai-settings-api.ts:30`) tới FastAPI rồi mới ghi DB ✅; **không có SSO/OIDC** (grep toàn `src/` chỉ thấy comment "web mở, không auth" trong `ai-storage.ts`, `ai_settings.py`) | Xem mục 3.4 |

**Tổng kết:** ✅ 3 · ⚠️ 4 · ❌ 1 · ⏳ 2.

---

## 3. Đề xuất triển khai bổ sung

### 3.1 Proxy rotation cho ingestion (yêu cầu 4)

- Thêm `services/ingestion/proxy_pool.py` (thuần, test offline): đọc danh sách proxy từ
  biến môi trường `USGS_PROXY_URLS` (phân tách bằng dấu phẩy), chiến lược **round-robin**
  kèm `cooldown` khi proxy trả `403/429` hoặc timeout.
- Truyền `proxy=` vào `httpx.Client` trong `IngestionService._http_client()` và
  `backfill.py`; giữ `http_transport` injectable để test bằng `httpx.MockTransport`.
- Khi feed lỗi: thử proxy tiếp theo trong cùng chu kỳ (tối đa N lần), log **không ghi
  thông tin xác thực proxy**. Khi không có proxy cấu hình → giữ hành vi hiện tại (I2).
- Cập nhật `.env.example`: `USGS_PROXY_URLS=` (để trống mặc định), ghi chú trong
  `docs/setup.md`. Test: giả lập 403 rồi 200, đảm bảo chuyển proxy.

### 3.2 Xuất/đóng tập báo cáo cuối kỳ (yêu cầu 5)

- Thêm script `scripts/export_report.py` (hoặc `scripts/export-report.sh`) tổng hợp
  `docs/architecture/`, `docs/api/API.md`, `docs/yeucaubatbuoc.md`, tài liệu này thành
  một file PDF/Markdown duy nhất (`report/final-report.md`), có mục lục + sơ đồ Mermaid.
- Chờ thầy thông báo lịch cụ thể (yêu cầu 2) rồi mới chốt nội dung; không tự bịa mốc.

### 3.3 Tách Data writing / Data mart (yêu cầu 6 & 9)

- **I4:** không sửa migration `001`; tạo revision Alembic mới, ví dụ
  `007_data_writing_data_mart.py`:
  - `CREATE SCHEMA data_writing; CREATE SCHEMA data_mart;`
  - Chuyển/giữ bảng thô `earthquake_events` trong `data_writing`; tạo các view/bảng
    mart (`mart_daily_events`, `mart_severity`, `mart_cluster_summary`,
    `mart_prediction_daily`) trong `data_mart`.
- Workers sau khi xử lý phải **ghi kết quả vào `data_mart`** (thêm lớp repository mart,
  giữ repository cũ để tương thích — I2). Sơ đồ luồng trong `SAD.md` cập nhật thành
  `Data source → Ingestion → data_writing → (analysis/prediction/clustering) → data_mart → API → FE`.
- Test migration offline: kiểm tra schema tồn tại và view trả đúng số bản ghi đã xử lý.

### 3.4 SSO/OIDC trước khi vào DB (yêu cầu 10)

- Hiện tại dự án là **web mở, không auth** (quyết định cũ; xem comment trong
  `ai-storage.ts` / `ai_settings.py`). Đây là thay đổi kiến trúc cần người dùng chốt
  trước khi làm.
- Phương án đề xuất: đưa **Keycloak** (hoặc provider OIDC khác) vào `docker-compose`,
  bảo vệ các endpoint ghi (`POST /api/v1/...`) bằng middleware xác thực JWT
  (`python-jose`/`PyJWT` + `fastapi.security.OAuth2Bearer`), FE dùng `oidc-client-ts`
  để redirect đăng nhập và đính kèm `Authorization: Bearer <token>` trong `fetchApi`.
- Database API sau khi validate token mới thực thi upsert vào DB chính. Giữ chế độ
  `AUTH_DISABLED=true` cho demo/offline test nếu cần (I7 — test vẫn chạy offline).

---

## 4. Ghi chú

- Các mục ⏳ là thông tin hành chính, không triển khai trong code.
- Mọi thay đổi schema phải tạo **migration mới** (I4), không sửa file cũ.
- Không xóa module/service cũ đang chạy; mở rộng bằng tệp/lớp mới (I2).
