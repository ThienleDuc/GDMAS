# Proposal: Động cơ dự báo số trận và phân loại rủi ro ngày kế tiếp cho Terminal 5 (Prediction Worker)

## Metadata
- ID: 2026-11-12-seismic-prediction-worker-tai
- Author: agent | tai
- Created: 2026-11-12
- Type: feature
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/services/prediction/ và scripts/
- Architecture Impact: docs/architecture/ERD.md, docs/api/API.md
  <!-- Chỉ phát sinh nếu nhóm chốt dùng thang 4 mức Low/Moderate/High/Critical:
       - ERD.md §2.5: giá trị `predicted_label` (đang ghi Low Activity, Normal Activity, High Activity)
         và ví dụ `model_name` của classification_results.
       - API.md §3 (Pattern 6): ví dụ `predicted_label` (đang là "Normal Activity").
       Nếu nhóm chọn giữ 3 nhãn "Activity" thì Architecture Impact = none (xem §7, rủi ro 1). -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/task/tai.md (Task 1, một phần Task 4)
  - docs/yeucaubatbuoc.md (§4 Demo)
  - docs/architecture.md (§12.7 chia train/test theo thứ tự thời gian)
  - docs/architecture/ERD.md (§2.4 prediction_results, §2.5 classification_results, §2.6 service_runs)
  - docs/api/API.md (§3 Pattern 5 và 6)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-api-empty-db-sse-tai.md (độc lập; cùng tác giả, Task 3)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Hệ thống GDMAS cần hai Pattern bắt buộc cuối cùng của đồ án: **Pattern 5** (dự báo định lượng số trận ngày kế tiếp kèm khoảng tin cậy 95%) và **Pattern 6** (phân loại mức hoạt động địa chấn ngày kế tiếp kèm xác suất). Hai Pattern này chạy ở **Terminal 5** (`prediction`, chu kỳ 5 phút) trong mô hình 7 Terminals.

*Ghi chú quy trình:* proposal này được lập **bổ sung** sau khi đã có prototype chạy được trên máy phát triển; các số liệu ở §2 và §5 là kết quả đo thực tế, không phải ước lượng.

### Vấn đề
`services/prediction/runner.py` mới là tệp khung chỉ có `time.sleep(300)`, còn `demo_seeder.py` ghi **số giả**: dự báo bằng `recent_daily_rate * 1.08`, nhãn rủi ro suy từ magnitude lớn nhất, các chỉ số đánh giá gõ cứng. Chưa có mô hình nào được huấn luyện hay đánh giá.

### Ảnh hưởng
Đây là yêu cầu bắt buộc của đồ án Khai phá dữ liệu. Nếu không có mô hình thật thì không thể chứng minh được dự báo tốt hơn baseline, và Demo §4 trong `docs/yeucaubatbuoc.md` không có số liệu thật để trình bày.

---

## 2. Hiện trạng
- `apps/api/src/gdmas/services/prediction/runner.py`: tệp khung 23 dòng, chưa làm gì.
- `apps/api/src/gdmas/services/demo_seeder.py` (Bước 4–5): ghi dự báo và phân loại giả vào `prediction_results`, `classification_results`.
- `apps/api/src/gdmas/models/prediction.py`: ORM `PredictionResult` (`predicted_value`, `lower_bound`, `upper_bound`, `actual_value`, `evaluation_metrics`...) và `ClassificationResult` (`predicted_label`, `probability_scores`, `actual_label`...). Đã đủ cột, **không cần migration**.
- `apps/api/src/gdmas/api/routes/patterns.py`: `/api/v1/patterns` đã đọc hai bảng này; giao diện `StatisticsPage.tsx` đã gọi endpoint đó.

**Kết quả khảo sát dữ liệu (EDA)** — 730 ngày (2024-11-09 đến 2026-11-08), 281.601 sự kiện USGS:

| Chỉ số | Giá trị |
|---|---|
| Số trận mỗi ngày (trung bình / độ lệch chuẩn / min / max) | 385.8 / 87.4 / 190 / 1195 |
| Phân vị P50 / P75 / P90 | 373 / 418 / 466 |
| Tự tương quan lag 1 → lag 7 | 0.57 giảm dần đến 0.23 |
| Kiểm định ADF | p = 0.0002 → chuỗi dừng |
| Hiệu ứng theo thứ trong tuần | Không đáng kể (375–393) |

**Prototype đã kiểm chứng trên máy phát triển (DB thật):** runner chạy 6 chu kỳ liên tục không lỗi; mỗi `target_date` chỉ có 1 dòng ở mỗi bảng; xóa cả hai bảng thì runner tự tái sinh; `/api/v1/patterns` trả `pattern_5` và `pattern_6` ở trạng thái `COMPUTED`.

---

## 3. Mục tiêu
- **Mục tiêu:**
  - Pattern 5: dự báo số trận ngày kế tiếp, `0 <= lower_bound <= predicted_value <= upper_bound`, khoảng tin cậy 95%, thắng baseline về MAE.
  - Pattern 6: phân loại mức hoạt động kèm `probability_scores` có tổng bằng 1.0.
  - Huấn luyện **offline**, runner chỉ nạp model và suy luận (Demo §4), xử lý an toàn khi DB trống hoặc lịch sử ngắn.
  - Runner chạy chu kỳ 5 phút và hỗ trợ cờ `--once` cho Demo Bước 4–5.
  - Ghi `service_runs`, điền `actual_value` / `actual_label` cho các ngày đã qua.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Task 2 và Task 3 của `docs/task/tai.md` (các endpoint REST mới, xử lý DB rỗng, SSE): thuộc proposal riêng.
  - Không sửa `demo_seeder.py`, ORM, migration Alembic, `main.py`, `contracts/`, `apps/web/`.
  - Không huấn luyện lại khi runner đang chạy; không dự báo 2 bước.

---

## 4. Giải pháp đề xuất
Tuân thủ **I1** (worker độc lập, không nhúng vào `main.py`), **I2 / RULE-03** (chỉ thêm tệp mới, riêng `runner.py` là tệp khung do task giao), **I3** (UTC), **I4** (không đụng migration), **I7** (kèm test offline).

**Tệp dự kiến:**
- `apps/api/src/gdmas/services/prediction/inference.py` *(mới)*: nạp model, dự báo, tính xác suất; không truy cập DB.
- `apps/api/src/gdmas/services/prediction/service.py` *(mới)*: đọc DB, gọi inference, ghi kết quả, điền giá trị thực tế, ghi `service_runs`.
- `apps/api/src/gdmas/services/prediction/runner.py` *(thay tệp khung)*: vòng lặp 5 phút và cờ `--once`.
- `apps/api/src/gdmas/services/prediction/models/` *(mới)*: `forecast_model.joblib`, `risk_classifier.joblib`, `recent_history.json`, `training_report.json`.
- `scripts/download_usgs_history.py`, `scripts/eda_daily_counts.py`, `scripts/train_models.py` *(mới)*: tải dữ liệu lịch sử, khảo sát, huấn luyện.

**Pattern 5:** ARIMA(2,0,1) trên `log1p(số trận)` (bậc chọn theo AIC, d=0 vì chuỗi dừng). Khoảng tin cậy 95% lấy từ phân vị 2.5% và 97.5% của sai số một bước thực tế, rồi biến đổi ngược `expm1`.

**Pattern 6:** ngưỡng 4 mức theo phân vị 50/75/90 của tập huấn luyện (375 / 425 / 475 trận mỗi ngày). Xác suất mỗi mức = tỉ lệ kịch bản (dự báo cộng sai số thực tế) rơi vào mức đó; nhãn dự đoán là mức có xác suất cao nhất. Cách này nhất quán với Pattern 5 và dùng chung một phân phối dự báo.

**Luồng chạy:** (1) đọc số trận theo ngày UTC cho các ngày đã đủ 24 giờ dữ liệu; (2) ghép với `recent_history.json` (60 ngày cuối của tập huấn luyện) làm nền khi DB chưa đủ lịch sử, ngày thiếu để `NaN`; (3) dự báo 1 bước và phân loại; (4) xóa rồi ghi lại bản ghi cùng `target_date` để chạy lặp không trùng; (5) điền giá trị thực tế khi sang ngày UTC mới; (6) ghi `service_runs` (`SUCCESS` / `FAILED`).

**Ngày dự báo (`target_date`):** là ngày UTC kế tiếp sau ngày dữ liệu cuối cùng đã đủ, tức hôm nay (UTC), vì ngày hiện tại chưa kết thúc nên chưa có đặc trưng đầy đủ để dự báo ngày mai (xem phương án E).

---

## 5. Phương án đã cân nhắc
Đánh giá trên tập kiểm thử 144 ngày cuối (chia theo thời gian, 80/20). Baseline dự báo tốt nhất là "trung bình 7 ngày" với MAE 41.09.

### Phương án A: Ngưỡng nhãn cố định kiểu 100 / 200 / 350 trận mỗi ngày
Ưu: dễ giải thích. Nhược: với dữ liệu thật (trung bình ~386) thì 65% số ngày rơi vào nhãn cao nhất. Không chọn; dùng phân vị.

### Phương án B: Ridge trên đặc trưng trễ (7 lag, rolling 7 và 14 ngày, độ lớn, độ sâu)
Ưu: dùng được nhiều đặc trưng. Nhược: MAE 41.08, ngang baseline, không tạo thêm giá trị. Không chọn.

### Phương án C: ARIMA(3,0,2) trên số trận gốc
Ưu: đơn giản. Nhược: MAE 38.40 nhưng khoảng tin cậy phủ 98.6% (quá rộng). Không chọn.

### Phương án D: ARIMA(2,0,1) trên thang log
Ưu: **MAE 37.42, RMSE 48.63**, tốt hơn baseline tốt nhất khoảng 9%; khoảng tin cậy phủ 97.2%. Nhược: không dùng được đặc trưng độ lớn, độ sâu. **Chọn.**

### Phương án E: Dự báo 2 bước để trả đúng "ngày mai"
Ưu: khớp nghĩa t+1 nếu t là hôm nay. Nhược: khoảng tin cậy rộng hơn và thêm độ phức tạp. Hoãn; quyết định cùng nhóm.

### Phương án F: Random Forest hoặc Logistic Regression cho Pattern 6
Ưu: đúng gợi ý trong task. Nhược: accuracy 0.368 / 0.354, thấp hơn baseline "giống hôm nay" (0.451). Không chọn.

### Phương án G: Phân loại bằng phân phối dự báo
Ưu: **accuracy 0.514, sai tối đa 1 mức 0.861**, cao nhất mọi ứng viên; cho xác suất có ý nghĩa. Nhược: macro-F1 0.264, thấp hơn baseline "giống hôm nay" (0.325); recall của hai mức cao nhất bằng 0 trong tập kiểm thử. **Chọn** và ghi nhận giới hạn.

### Phương án H: Huấn luyện lại ngay trong runner
Nhược: vi phạm yêu cầu Demo §4 (không train nặng khi demo). Không chọn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | Thêm 3 tệp trong `prediction/`, 3 script offline và 4 tệp model |
| Hiệu năng | Thấp | Suy luận ARIMA một bước, vài trăm mili giây mỗi chu kỳ |
| Bảo trì / Open-Closed | Tốt | Chỉ thêm tệp mới; không sửa schema, `main.py` hay code của đồng đội |
| Độ tin cậy | Trung bình | Phụ thuộc chuỗi lịch sử; có nền `recent_history.json` khi DB ít dữ liệu |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| 1. Tên nhãn không thống nhất: ERD §2.5 và API.md dùng `Low/Normal/High Activity`; frontend ghi `LOW/MEDIUM/HIGH`; bản này dùng `Low/Moderate/High/Critical` | Cao | Trung bình | Chốt bộ nhãn với nhóm trước khi duyệt; nhãn được khai báo một chỗ (`LABELS`), đổi dễ; cập nhật ERD và API.md nếu giữ 4 mức |
| 2. `High` và `Critical` hầu như không bao giờ là nhãn chính (recall 0) | Cao | Trung bình | Hiển thị bảng `probability_scores`; ghi rõ giới hạn này trong báo cáo |
| 3. `target_date` là hôm nay (UTC), có thể lệch cách hiểu "t+1 = ngày mai" | Trung bình | Trung bình | Nêu rõ ở §4; nếu nhóm yêu cầu thì làm phương án E |
| 4. `demo_seeder.py` vẫn ghi dự báo giả; chạy sau runner sẽ ghi đè kết quả thật | Trung bình | Trung bình | Thống nhất thứ tự chạy khi demo; cân nhắc proposal riêng cập nhật seeder |
| 5. DB mới chỉ có ít ngày dữ liệu, dự báo phụ thuộc `recent_history.json` | Trung bình | Thấp | Ngày thiếu để `NaN`, mô hình tự hồi quy về trung bình; ghi `history_days_observed` vào `evaluation_metrics` |
| 6. Huấn luyện lại chọn mô hình khác (Ridge, Random Forest...) thì `inference.py` chưa hỗ trợ | Thấp | Thấp | Runner báo `NotImplementedError` rõ ràng và ghi `FAILED` vào `service_runs`, không sập |
| 7. Ngày đột biến do dư chấn (như 1195 trận) không thể dự đoán từ chuỗi đếm | Cao | Thấp | Ghi nhận là giới hạn đã biết |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-12-seismic-prediction-worker-tai.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`)*
- **Code test tự động (offline):** `apps/api/tests/unit/test_prediction_inference.py` và `apps/api/tests/unit/test_prediction_service.py`
- **Cách kiểm chứng:**
  - `cd apps/api && uv run pytest`, `uv run ruff check .`, `uv run ruff format --check .`
  - Test: `lower_bound <= predicted_value <= upper_bound`, `predicted_value >= 0`; nhãn thuộc tập nhãn chuẩn; tổng `probability_scores` bằng 1.0; DB trống hoặc lịch sử thưa không làm sập; chạy lặp không trùng `target_date`; điền `actual_value` / `actual_label` khi sang ngày mới; ghi `service_runs`.
  - Thủ công: `uv run python -m gdmas.services.prediction.runner` chạy nhiều chu kỳ; xóa hai bảng rồi runner tự tái sinh; `/api/v1/patterns` trả `pattern_5` và `pattern_6` ở trạng thái `COMPUTED`; thiếu tệp trong `models/` thì runner báo lỗi rõ ràng ngay lúc khởi động.
  - Chi tiết lệnh để ở `plan.md` và `testcase/<id>.md`.

---

## 9. Human Review
Decision: Approved
Reviewer: tai
Review Date: 2026-11-14
Comments: Tác giả tự duyệt theo docs/agent-workflow.md. Phần triển khai đã chạy và kiểm chứng trước khi ký; 44 test prediction đạt, ruff sạch trên các tệp của Task 1.
Scope of Rejection: -

---

## 10. Next Action
Đã triển khai và kiểm thử tự động. Còn lại: đồng bộ tên nhãn với Frontend (`thien`), xác nhận ngày dự báo (hôm nay UTC hay ngày mai), commit/push và mở PR. Xem `implemented/2026-11-12-seismic-prediction-worker-tai/plan.md` và `status.md`.