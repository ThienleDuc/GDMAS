<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md.
     QUY TẮC THẢ LỎNG §9: Bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả tự duyệt hoặc đồng đội)
     đều có thể điền Decision: Approved tại §9 — KHÔNG cần chờ ThienleDuc duyệt proposal.
     Agent chỉ điền §9 khi người dùng đang thao tác xác nhận rõ ràng trong chat (ghi chỉ thị vào Comments). -->

# Proposal: Đồng bộ Pattern 2 (Trend) giữa T3 và T6 theo tần suất re-sampling và metric

## Metadata
- ID: 2026-11-20-trend-resample-metric-son
- Author: agent | son
- Created: 2026-11-20
- Type: bugfix
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: apps/api/src/gdmas/services/analysis/patterns.py (T3), apps/api/src/gdmas/api/routes/analysis.py (T6 — chủ vùng `tai`)
- Architecture Impact: docs/api/API.md
  <!-- Mục Pattern 2 `GET /api/v1/analysis/trend`: `resample_freq` nhận thêm `D` (Ngày) khớp contracts/schemas/analysis.json và FE;
       ghi rõ phản hồi phản ánh tần suất/metric THỰC của dữ liệu và trả `status: insufficient_data` khi chưa đủ kỳ. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/api/API.md
  - contracts/schemas/analysis.json
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md
  - .agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md
- Related Bugs: BUG-son-008

---

## 1. Vấn đề
### Bối cảnh
Pattern 2 (Trend sau Re-sampling) do Terminal 3 (`son`) tính và ghi vào `analysis_results`; Terminal 6 (`tai`) phục vụ qua
`GET /api/v1/analysis/trend?resample_freq=W|M&metric=count|avg_magnitude|max_magnitude`; Terminal 7 (`thien`) gọi qua
`getTrendAnalysis()` với `resample_freq = D | W | M`. Ba phần được merge ở các thời điểm khác nhau (PR #6, #25, #30).
### Vấn đề
Rà soát task của `son` trên `develop` mới nhất: toàn bộ 273 test và Ruff đều xanh, nhưng khi nối **đầu ra thật** của T3 vào route T6,
Pattern 2 trả dữ liệu sai nhãn (chi tiết `BUG-son-008`):
- T3 chỉ ghi **1** bản `trend` với tần suất tự chọn và chỉ metric `count`.
- T6 lùi về bản bất kỳ khi không khớp tần suất, bỏ qua `metric` khi dữ liệu có khóa `series`, và lặp lại tham số yêu cầu trong phản hồi.
- `resample_freq=D` (có trong contract và FE) bị route từ chối 422.
### Ảnh hưởng
Biểu đồ Trend trên trang Thống kê hiển thị chuỗi tháng khi người dùng chọn tuần, và số trận khi chọn độ lớn trung bình — sai số liệu
mà không có cảnh báo (vi phạm I3, lệch `docs/api/API.md`). Đây là task 2–3 của `son` ("Re-sampling theo Tháng `1ME` và Tuần `1W`").

---

## 2. Hiện trạng
- `apps/api/src/gdmas/services/analysis/patterns.py`
  - `compute_trend(df, interval=None, *, as_of=None)` — chỉ đếm số trận (`magnitude.count()`), `metric: "count"` cố định.
  - `build_analysis_snapshot()` — ghi 3 bản `time_series` (day/week/month) nhưng chỉ 1 bản `trend` (`choose_trend_interval`).
- `apps/api/src/gdmas/api/routes/analysis.py`
  - `get_trend()` — `Query("M", pattern="^(W|M)$")`; `build()` dùng `m["series"]` nguyên trạng, trả `resample_freq`/`metric` từ tham số.
  - `_latest()` — không khớp interval thì lấy bản mới nhất bất kỳ.
- `apps/api/tests/unit/test_system_prediction_routes.py::test_trend_maps_metric_to_series` chỉ phủ định dạng cũ `trend_line` của `demo_seeder`.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. T3 ghi bản `trend` cho **cả 3 tần suất** `day`, `week`, `month`; mỗi bản có chuỗi + hồi quy cho **cả 3 metric** `count`, `avg_magnitude`, `max_magnitude`.
  2. T6 trả đúng tần suất & metric được yêu cầu; không có bản khớp thì trả Empty State / `insufficient_data` trung thực, **không** lùi sang tần suất khác mà vẫn gắn nhãn sai.
  3. Route nhận `resample_freq = D | W | M` (mặc định vẫn `M`) khớp `contracts/schemas/analysis.json` và FE.
  4. Giữ tương thích ngược: dữ liệu cũ của `demo_seeder` (`trend_line`, `weekly`/`monthly`) và `GET /api/v1/patterns` vẫn chạy.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi `contracts/` (schema hiện tại đã cho phép `D|W|M` và 3 metric).
  - Không đổi schema DB / Alembic (dùng lại `analysis_results.time_interval` + `metrics_data` JSONB).
  - Không đổi FE (`apps/web/`), Pattern 1/3/4, `/patterns`, T4/T5.
  - Không xử lý tham số `resample_freq` của `/analysis/seasonality` (ghi nhận riêng nếu cần).

---

## 4. Giải pháp đề xuất
**T3 — `patterns.py` (mở rộng, RULE-03):**
- Thêm hằng `TREND_INTERVALS = ("day", "week", "month")` và `TREND_METRICS = ("count", "avg_magnitude", "max_magnitude")`.
- `compute_trend(df, interval=None, *, as_of=None, metric="count")` — thêm tham số keyword có mặc định (chữ ký cũ giữ nguyên).
  `avg_magnitude`/`max_magnitude` dùng `mean()`/`max()` theo kỳ; kỳ không có sự kiện bị loại khỏi chuỗi & hồi quy
  (không bịa 0 cho độ lớn), trục x vẫn là vị trí kỳ thật.
- Hàm mới `compute_trend_bundle(df, interval, *, as_of=None)` → kết quả metric `count` ở cấp cao nhất (giữ định dạng cũ cho `/patterns`)
  + khóa mới `metrics: {"count": {...}, "avg_magnitude": {...}, "max_magnitude": {...}}`.
- `build_analysis_snapshot()` ghi 3 bản `trend` (`day`/`week`/`month`); bản ứng với `choose_trend_interval()` được ghi **trước**
  để `/patterns` (lấy bản `trend` đầu tiên) vẫn nhận tần suất "chính" như cũ. Snapshot vẫn thay nguyên tử trong 1 transaction (không đổi `service.py`).

**T6 — `routes/analysis.py` (chủ vùng `tai`, sửa tối thiểu):**
- `resample_freq` pattern `^(D|W|M)$`; thêm `INTERVAL_ALIASES["D"] = ["day", "daily"]`.
- `_latest(..., strict_interval=False)` — tham số mới, mặc định giữ hành vi cũ cho temporal; `get_trend` dùng `strict_interval=True`.
- `build()` của trend: ưu tiên `m["metrics"][metric]` (định dạng mới) → `m["series"]` chỉ khi metric là `count` hoặc khớp `m["metric"]` →
  `trend_line` (định dạng seeder cũ). `resample_freq`/`metric` trong phản hồi lấy theo dữ liệu thực; thêm `status` khi có.
- Không có bản khớp tần suất → `_empty(...)` (Empty State như DB rỗng).

**Docs:** cập nhật mục Pattern 2 trong `docs/api/API.md` (thêm `D`, mô tả `status`).

Bất biến: I1 (không đụng `main.py`), I2 (chỉ thêm tham số có mặc định + hàm mới), I3 (UTC, khớp contract), I4 (không migration),
I5 (không đổi FE), I6 (không secret), I7 (thêm test offline, không xóa test cũ).

---

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ sửa route T6 (trả đúng nhãn của dữ liệu đã lưu)
Ưu: diff nhỏ, không đụng T3. Nhược: vẫn không có dữ liệu tuần/tháng song song và metric độ lớn — FE chọn W/M hay `avg_magnitude`
vẫn nhận cùng một chuỗi; chỉ hết "sai nhãn" chứ không đáp ứng API.md. Không chọn.
### Phương án B: T3 ghi đủ tần suất × metric, T6 chọn đúng bản (chọn)
Ưu: đáp ứng đủ API.md/contract, T6 vẫn chỉ đọc (<100 ms), tận dụng JSONB sẵn có, không migration.
Nhược: thêm 2 bản `analysis_results` mỗi chu kỳ, tính thêm vài phép re-sampling (rẻ với cửa sổ 365 ngày). Chọn.
### Phương án C: T6 tự re-sampling từ `earthquake_events` khi gọi
Nhược: vi phạm tinh thần I1/SAD (T6 chỉ đọc kết quả đã tính), chậm khi dữ liệu lớn. Không chọn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp–Trung bình | 1 hàm mới + 1 tham số keyword ở T3; 1 tham số + nhánh chọn metric ở T6 |
| Hiệu năng | Không đáng kể | +2 bản ghi/chu kỳ 5 phút; route vẫn 1 truy vấn theo index |
| Bảo trì / Open-Closed | Tốt | Không đổi chữ ký cũ; định dạng cũ (`series`, `trend_line`) vẫn đọc được |
| Độ tin cậy | Tăng | Hết trả số liệu sai nhãn; thiếu dữ liệu thì báo `insufficient_data`/Empty State |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| `/patterns` lấy nhầm bản `trend` khác tần suất chính | Thấp | Thấp | Ghi bản chính trước; test giữ nguyên `test_analysis_service` kiểm thứ tự |
| `resample_freq=W` không còn "lùi" sang bản cũ → FE thấy Empty State khi DB chỉ có dữ liệu seeder `monthly` | Trung bình | Thấp | Đúng hành vi I5 (không dùng số liệu sai); chu kỳ T3 kế tiếp ghi đủ 3 tần suất |
| Đụng vùng `tai` (`routes/analysis.py`) | Chắc chắn | Thấp | Sửa tối thiểu, giữ test cũ của `tai`; ghi chủ vùng `tai` trong mô tả PR |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-20-trend-resample-metric-son.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/api/tests/unit/test_analysis_trend_metrics.py` *(mới — T3: 3 tần suất × 3 metric, kỳ rỗng của metric độ lớn, thứ tự bản chính)*
  - `apps/api/tests/unit/test_analysis_trend_route.py` *(mới — T3→T6 end-to-end trên SQLite in-memory: W/M/D đúng tần suất, đúng metric, không khớp → Empty State, `D` không còn 422, dữ liệu seeder cũ vẫn đọc được)*
  - Chạy lại test cũ: `test_analysis_patterns.py`, `test_analysis_service.py`, `test_system_prediction_routes.py`.
- **Cách kiểm chứng:** `cd apps/api && uv run pytest` (toàn bộ), `uv run ruff check . && uv run ruff format --check .`, `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: son
Review Date: 2026-11-20
Comments: son xác nhận trong chat "oke tôi approved proposal này" sau khi được giải thích phạm vi đụng `apps/api/src/gdmas/api/routes/analysis.py` (tác giả `tai`) — giữ phương án sửa cả T3 lẫn route T6 trong 1 PR, ghi chủ vùng `tai` trong mô tả PR.
Scope of Rejection: -   <!-- bắt buộc khi Rejected: "Rejected for: <use-case cụ thể>, not a ban on <công nghệ/pattern> in general." -->

---

## 10. Next Action
Đã duyệt §9 — `build-implementation` trên nhánh `fix/2026-11-20-trend-resample-metric-son`.
