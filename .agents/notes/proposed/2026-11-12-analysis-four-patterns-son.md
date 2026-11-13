# Proposal: Động cơ phân tích 4 Patterns chuỗi thời gian thật cho Terminal 3 (Analysis Worker)

## Metadata
- ID: 2026-11-12-analysis-four-patterns-son
- Author: agent | son
- Created: 2026-11-12
- Type: feature
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/services/analysis/
- Architecture Impact: docs/architecture/SAD.md, docs/workflow.md — mô tả cấu trúc Analysis, snapshot, --once và kỳ đầy đủ; không đổi schema/endpoint/contract
  <!-- Không đổi schema analysis_results/service_runs, không đổi contract API.
       Ghi chú ánh xạ endpoint `temporal` ↔ analysis_type `time_series` vào docstring service; nếu nhóm muốn
       đổi tên analysis_type sang `temporal` thì cần proposal riêng chạm patterns.py (vùng dùng chung). -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/api/API.md (§3.3 Pattern 1–4)
  - docs/architecture.md (P-03 Seasonality)
  - docs/architecture/ERD.md (§2.6 service_runs: chỉ `SUCCESS` | `FAILED` | `RUNNING`)
  - docs/workflow.md (§7 fallback Re-sampling khi < 7 ngày dữ liệu)
  - docs/task/son.md (Task 2, Task 3, phần Analysis của Task 4)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md (độc lập; T3 chỉ đọc earthquake_events)
- Related Bugs: BUG-son-004, BUG-son-005

---

## 1. Vấn đề
### Bối cảnh
Terminal 3 (`python -m gdmas.services.analysis.runner`) phải tính Pattern 1–4 mỗi 5 phút và ghi `analysis_results` để T6 phục vụ `/api/v1/patterns` (< 100 ms).
### Vấn đề
- `analysis/runner.py` chỉ là vòng `time.sleep(300)` rỗng, không tính gì, không ghi `service_runs`.
- Số liệu Pattern 1–4 hiện chỉ đến từ `demo_seeder.py`, trong đó Pattern 3 (`season_points`) và Pattern 4 (`corr_matrix`) là hằng số hardcode → vi phạm tinh thần I5 (không mock thay API thật).
- Không có cách chạy 1 chu kỳ ngay (Demo Bước 4–5 phải chờ 5 phút).
### Ảnh hưởng
Không có Pattern 1–4 thật thì dashboard Statistics và các bước demo đều dựa vào dữ liệu giả.

---

## 2. Hiện trạng
- `apps/api/src/gdmas/services/analysis/runner.py` — 23 dòng khung.
- `apps/api/src/gdmas/services/demo_seeder.py` — ghi `analysis_type` ∈ {`time_series`, `trend`, `seasonality`, `correlation`}, `time_interval` ∈ {`hourly`, `weekly`, `monthly`, `daily`}.
- `apps/api/src/gdmas/api/routes/patterns.py` — `db.query(AnalysisResult).all()` rồi lấy **bản ghi đầu tiên** khớp `analysis_type` (`time_series`, `trend`, `seasonality`, `correlation`); không sắp xếp → nếu lưu dồn lịch sử sẽ trả kết quả cũ.
- `apps/web/src/features/statistics/StatisticsPage.tsx` đọc từ `metrics`: `data_points`, `avg_depth`, `slope`, `direction`, `cycle_hours`, `amplitude`, `corr_mag_depth`, `correlation_strength`.
- `apps/api/pyproject.toml` đã có `pandas`, `numpy`, `scipy`, `statsmodels`.

---

## 3. Mục tiêu
- **Mục tiêu:**
  - Tính Pattern 1–4 từ `earthquake_events` thật, ghi `analysis_results` (kèm `service_run_id`, `period_start`, `period_end`, `calculated_at` UTC, `metrics_data` JSONB) trong 1 chu kỳ có `ServiceRun(service_name="analysis")` `RUNNING → SUCCESS | FAILED`.
  - JSON đầu ra không chứa `NaN`/`Infinity`; DB 0 hoặc 1 bản ghi không ném `ZeroDivisionError`.
  - DB rỗng → **không ghi số liệu giả**; tự tính lại đầy đủ ngay chu kỳ có dữ liệu.
  - Thêm `--once` cho `analysis/runner.py`.
- **Không nằm trong mục tiêu (Out of Scope):** Pattern 5–6 (`tai`), clustering (`van`); tạo endpoint `/api/v1/analysis/*` ở T6; sửa `demo_seeder.py`, `patterns.py`, migration, `contracts/`; vẽ biểu đồ FE.

---

## 4. Giải pháp đề xuất
Tuân thủ I1 (không đụng `main.py`) và RULE-03 (giữ `run()` và lệnh `python -m gdmas.services.analysis.runner`).

1. **Tệp mới `apps/api/src/gdmas/services/analysis/patterns.py`** — hàm thuần nhận `pandas.DataFrame` (cột `id, event_time(UTC), magnitude, depth_km, latitude, longitude`), không I/O:
   - `compute_temporal(df, interval)` với `interval ∈ {day, week, month}` → `line_chart` (`date`, `event_count`, `max_magnitude`, `avg_magnitude`), `scatter_plot` (`id`, `timestamp` ISO `…Z`, `magnitude`, `depth_km`; giới hạn N điểm mới nhất, mặc định 2000), `histogram.magnitude_bins` theo bin cố định `< 2.0`, `2.0 - 3.0`, `3.0 - 4.0`, `4.0 - 5.0`, `>= 5.0`.
   - `choose_resample_freq(df)` → `ME` khi dữ liệu trải ≥ 60 ngày, `W` khi ≥ 7 ngày, ngược lại `D` (fallback theo `docs/workflow.md` §7).
   - `compute_trend(df, freq)` → `series` (`period`, `actual_value`, `trend_value` = Moving Average cửa sổ 3 có `min_periods=1`), `slope` từ `scipy.stats.linregress`, `trend_direction` = `stable` khi < 3 điểm hoặc `p_value ≥ 0.05`, ngược lại `increasing`/`decreasing` theo dấu `slope`; kèm `p_value`, `r_squared`.
   - `compute_seasonality(df)` → thử lần lượt chu kỳ năm (`ME`, period 12, cần ≥ 24 tháng) rồi chu kỳ tuần (`D`, period 7, cần ≥ 14 ngày) bằng `statsmodels.tsa.seasonal.seasonal_decompose(model="additive")`; trả `seasonal_line` (`cycle_index`, `period_label` như "Tháng 1"/"Thứ 2", `seasonal_factor`), `residual_variance`, `seasonality_strength = max(0, 1 − Var(R)/Var(S+R))`, `interpretation` tự sinh. Không đủ chu kỳ → `seasonal_line: []`, `seasonality_strength: null`, `interpretation: "Chu kỳ yếu / chưa xác định mùa vụ rõ — chưa đủ dữ liệu (cần ≥ … )"` (P-03: không mặc định có mùa vụ).
   - `compute_correlation(df)` → `daily_event_count` (đếm theo ngày UTC gắn về từng sự kiện), ma trận Pearson 5×5 (`magnitude, depth_km, latitude, longitude, daily_event_count`) + Spearman; biến có phương sai 0 hoặc < 3 điểm → hệ số `null` ngoài đường chéo + liệt kê trong `undefined_pairs`; đường chéo 1.0; làm tròn 4 chữ số, ép đối xứng, kẹp `[-1, 1]`; `note: "Tương quan không hàm ý quan hệ nhân quả."`.
   - `sanitize_for_json(obj)` — đổi `NaN`/`±inf` → `None`, `numpy` scalar → Python.
   - Mỗi kết quả bổ sung **khóa tương thích** cho `StatisticsPage` (cộng thêm, không thay thế): `data_points`, `avg_depth`, `slope`, `direction`, `cycle_hours`/`amplitude` (Pattern 3), `corr_mag_depth`, `correlation_strength`.
2. **Tệp mới `apps/api/src/gdmas/services/analysis/service.py`** — `AnalysisService.execute_cycle() -> dict`:
   - Mở `ServiceRun(service_name="analysis", status="RUNNING")` → đọc sự kiện trong cửa sổ cấu hình (mặc định 365 ngày gần nhất, theo `event_time`) → tính 4 patterns → **trong 1 transaction: xóa toàn bộ dòng `analysis_results` cũ rồi chèn snapshot mới** → `SUCCESS` với `records_processed` = số sự kiện đã phân tích.
   - Quy ước ghi (không phải sửa `patterns.py`):

     | Pattern | `analysis_type` | `time_interval` |
     |---|---|---|
     | 1 Temporal | `time_series` | `day`, `week`, `month` (3 dòng) |
     | 2 Trend | `trend` | `week` hoặc `month` theo `choose_resample_freq` |
     | 3 Seasonality | `seasonality` | `month` hoặc `day` (theo chu kỳ dùng được) |
     | 4 Correlation | `correlation` | `day` |

   - DB 0 sự kiện → xóa snapshot cũ (tránh hiển thị kết quả không còn căn cứ), **không chèn gì**, `ServiceRun` `SUCCESS` với `records_processed=0` + log rõ "CSDL trống"; 1–2 sự kiện → vẫn ghi Pattern 1, các pattern thiếu dữ liệu ghi trạng thái `insufficient_data` trong `metrics_data` thay vì số giả.
   - Lỗi → `rollback`, `ServiceRun` `FAILED` + thông báo ngắn, không ném ra ngoài.
3. **Sửa `analysis/runner.py`:** thêm `argparse` `--once` (chạy 1 chu kỳ rồi thoát, mã thoát 0/1), vòng lặp mặc định giữ nguyên 300 s, dùng `ANALYSIS_INTERVAL_SECONDS` nếu có trong settings; bắt `Exception` để worker không chết.

---

## 5. Phương án đã cân nhắc
### Phương án A: Lưu dồn lịch sử `analysis_results` mỗi chu kỳ
Ưu: có lịch sử. Nhược: `patterns.py` lấy bản ghi đầu tiên không sắp xếp → hiển thị kết quả cũ; bảng phình 288 lần × 7 dòng/ngày. Muốn dùng thì phải sửa `patterns.py` (vùng dùng chung). **Không chọn ở proposal này.**
### Phương án B: Snapshot thay thế trong 1 transaction (chọn)
Ưu: `/patterns` luôn thấy bản mới nhất mà không sửa route; bảng nhỏ → truy vấn < 100 ms; khớp cách `demo_seeder` đang làm. Nhược: mất lịch sử kết quả (lịch sử chạy vẫn còn ở `service_runs`).
### Phương án C: Đổi `analysis_type` Pattern 1 thành `temporal`
Khớp tên endpoint API.md nhưng buộc sửa `patterns.py` → để proposal riêng nếu nhóm muốn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +2 tệp, ~400 dòng | Tách thuần tính toán / I/O để test offline |
| Hiệu năng | 1 SELECT + vài bulk INSERT / 5 phút | Cửa sổ 365 ngày, scatter giới hạn 2000 điểm |
| Bảo trì / Open-Closed | Không sửa `patterns.py`, `demo_seeder.py` | Quy ước `analysis_type` cũ được giữ |
| Độ tin cậy | Không còn số giả | `insufficient_data` / `null` thay cho hardcode |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Feed USGS chỉ có giờ/ngày → mùa vụ hầu như luôn "chưa đủ dữ liệu" | Cao | Thấp | Đúng tinh thần P-03; chu kỳ tuần dùng được sau 14 ngày |
| `demo_seeder` và T3 cùng ghi `analysis_results` | Trung bình | Trung bình | T3 ghi đè snapshot ở chu kỳ kế; ghi chú trong status.md |
| FE đọc khóa cũ (`direction`, `amplitude`…) | Trung bình | Thấp | Thêm khóa tương thích vào `metrics_data` |
| Thiếu `uv`/`statsmodels` trên máy dev | Cao | Trung bình | Cài `uv` + `uv sync` trước Pha 4 |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-12-analysis-four-patterns-son.md`
- **Code test tự động (offline):**
  - `apps/api/tests/unit/test_analysis_patterns.py` — fixture ~10 tuần sự kiện UTC: line/scatter/histogram (tổng bin = số sự kiện, timestamp kết thúc `Z`); resample `W`/`ME` và fallback `D`; `slope`/`trend_direction` với chuỗi tăng/giảm/ngang; mùa vụ tuần có tín hiệu nhân tạo + trường hợp thiếu chu kỳ; ma trận đối xứng, đường chéo 1, giá trị ∈ [-1, 1], phương sai 0 → `null`; 0 và 1 sự kiện không ném lỗi, `json.dumps(..., allow_nan=False)` thành công.
  - `apps/api/tests/unit/test_analysis_service.py` — mock session: DB rỗng không chèn kết quả & run `SUCCESS` 0; có dữ liệu ghi đúng bộ `analysis_type`/`time_interval` + `service_run_id`; ngoại lệ → `FAILED`.
  - `apps/api/tests/unit/test_analysis_runner.py` — `--once` gọi `execute_cycle` đúng 1 lần, không `sleep`.
- **Cách kiểm chứng:** `cd apps/api && uv run pytest tests/unit -q`, `uv run ruff check . && uv run ruff format --check .`; chạy thủ công `python -m gdmas.services.analysis.runner --once` trên Docker T1 rồi gọi `GET /api/v1/patterns`.

---

## 9. Human Review
Decision: Approved
Reviewer: son
Review Date: 2026-11-12
Comments: Tác giả `son` xác nhận trong chat "approve cả 2" (2026-11-12); chấp nhận phương án snapshot analysis_results và giữ analysis_type `time_series`.
Scope of Rejection: -

---

## 10. Next Action
Ngày 2026-11-13, người dùng yêu cầu kiểm tra task list và tiếp tục sau Ingestion: hoàn thiện nhánh Analysis đã Approved, test tích hợp offline, sửa finding và chuyển review-pr kiểm tra conflict trước merge. Phạm vi bổ sung được ghi trong plan/status; không cần tạo lại proposal.
