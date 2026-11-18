# Implementation Status: Động cơ dự báo số trận và phân loại rủi ro ngày kế tiếp (Terminal 5)

## Metadata
- ID: 2026-11-12-seismic-prediction-worker-tai
- Status: validation
- Started: 2026-11-09
- Last Updated: 2026-11-18
- Owner: agent | tai

---

## Tiến độ
Progress: 100%
Current Phase: validation — PR #25 chưa merge; chờ Squash and merge trên GitHub

Completed:
- Tải 730 ngày USGS (281.601 sự kiện), EDA, chọn ngưỡng phân vị 375/425/475.
- Huấn luyện offline: ARIMA(2,0,1)_log (MAE 37.42, tốt hơn baseline ~9%, coverage 97.2%); Pattern 6 Phân phối dự báo (accuracy 0.514, within-1 0.861).
- Viết `inference.py`, `service.py`, `runner.py` (có `--once`).
- 44 test prediction offline đạt; toàn bộ `apps/api` pytest 272 passed (2026-11-17); ruff sạch trên tệp của Task 1.
- Ba script `scripts/*.py` chưa có trên nhánh hiện tại.
- Chạy thật: `/api/v1/patterns` trả pattern_5, pattern_6 = COMPUTED; lặp 6 chu kỳ không trùng; xóa bảng thì tái sinh.
In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-12-seismic-prediction-worker-tai.md`, `test_prediction_inference.py`, `test_prediction_service.py` |
| Test liên quan (`pytest`) | PASS | `uv run pytest` (apps/api) → 272 passed; 44 test prediction |
| Lint / Build (`ruff` / `pnpm build`) | PASS | `ruff check src/gdmas/services/prediction` + `format --check` đạt |
| Notes check (`notes_index.py --check`) | NOT_RUN | chạy khi hoàn tất bộ tài liệu |
| Tài liệu cập nhật | N/A | ERD/API.md chỉ đổi nếu nhóm chốt 4 nhãn |

---

## Known Issues
- `High`/`Critical` gần như không bao giờ là nhãn chính (recall 0 trên tập kiểm thử); macro-F1 thấp hơn baseline "giống hôm nay". Giao diện nên hiển thị bảng xác suất.
- `demo_seeder.py` vẫn ghi số giả; chạy sau runner sẽ ghi đè.
- `target_date` = hôm nay (UTC), không phải ngày mai.

---

## Deviations From Plan
- **Dự kiến:** ngưỡng 100/200/350 theo spec. **Thực tế:** phân vị 50/75/90 (375/425/475). **Lý do:** ngưỡng spec dồn 65% vào Critical. **Quyết định:** dùng phân vị, ghi trong proposal §5.
- **Dự kiến:** Random Forest/Logistic cho Pattern 6. **Thực tế:** Phân phối dự báo. **Lý do:** accuracy + within-1 cao hơn. **Quyết định:** chọn theo accuracy + within-1 thay vì macro-F1.
- **Dự kiến:** cột `risk_level`, `confidence_score`. **Thực tế:** `predicted_label`, `probability_scores` (ORM thật). **Lý do:** theo DB.
- **Dự kiến:** nhãn `Extreme`. **Thực tế:** `Critical`. **Lý do:** theo file giao việc.

---

## Decisions Made During Implementation
1. ARIMA trên log thay vì số trận gốc (MAE tốt hơn, CI sát 95% hơn).
2. Khoảng tin cậy từ phân vị sai số thực tế, không giả định phân phối chuẩn.
3. Tiêu chí chọn bộ phân loại: accuracy + within-1 (macro-F1 không ổn định với nhãn hiếm).
4. `recent_history.json` (60 ngày cuối) làm nền khi DB ít lịch sử.
5. Ngày "đủ dữ liệu": sau ngày có sự kiện đầu tiên và trước hôm nay (UTC).
6. `target_date` = hôm nay (UTC), dự báo 1 bước.
7. Tải USGS theo đoạn 5 ngày, thử lại 6 lần.

---

## Next Actions
- Đồng bộ tên nhãn và ngày dự báo với `thien`.
- Nhánh hiện tại: `feature/tai-terminal5-6-full` (không còn `feature/feat-05-prediction`).
- (Tùy chọn) Checkout 3 script huấn luyện từ `0f32163` nếu cần train lại.

---

## Last Update
2026-11-18 — Review vòng 2 (son): Status về `validation` tới khi merge; ghi `BUG-tai-001`; execute_cycle ghi FAILED khi lỗi query; mock PredictionService trong test worker.