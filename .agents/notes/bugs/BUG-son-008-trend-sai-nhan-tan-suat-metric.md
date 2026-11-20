# BUG-son-008: `/analysis/trend` trả chuỗi sai tần suất và sai metric nhưng gắn nhãn theo tham số yêu cầu

- **Status:** fixed
- **Severity:** medium
- **Area:** `apps/api/src/gdmas/services/analysis/patterns.py` (T3 — đầu ra Pattern 2) và `apps/api/src/gdmas/api/routes/analysis.py` (T6 — route `/analysis/trend`, chủ vùng `tai`)
- **Reported:** 2026-11-20 — agent rà soát task của `son` so với `develop` mới nhất (sau PR #25–#33), test thăm dò offline nối đầu ra thật của T3 vào route T6
- **Fixed:** 2026-11-20 — nhánh `fix/2026-11-20-trend-resample-metric-son`; kiểm chứng 296 test offline pass
- **Related:** `.agents/notes/proposed/2026-11-20-trend-resample-metric-son.md`, `.agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md`, `.agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md`
- **Duplicate of:** -

## Triệu chứng
Với 200 ngày dữ liệu giả (T3 tự chọn re-sampling `month`), route trả về cùng một chuỗi cho mọi tổ hợp tham số,
nhưng phần `resample_freq` / `metric` trong phản hồi lại lặp lại đúng giá trị client gửi lên:

```text
stored: [('time_series','day'), ('time_series','week'), ('time_series','month'), ('trend','month'), ('seasonality','day'), ('correlation','day')]
W count         -> W count         first period 2026-05 len 7 val 77
W avg_magnitude -> W avg_magnitude first period 2026-05 len 7 val 77
M count         -> M count         first period 2026-05 len 7 val 77
M avg_magnitude -> M avg_magnitude first period 2026-05 len 7 val 77
```

- Gọi `resample_freq=W` nhận chuỗi **tháng** (`2026-05`…) nhưng nhãn `"W"`.
- Gọi `metric=avg_magnitude` nhận **số trận** (77) nhưng nhãn `"avg_magnitude"`.
- FE (`apps/web/src/services/earthquake-api.ts` → `getTrendAnalysis`) và `contracts/schemas/analysis.json` cho phép `resample_freq = D`,
  còn route chỉ nhận `^(W|M)$` → `D` bị từ chối 422.

Vi phạm hợp đồng dữ liệu I3 (`docs/api/API.md` mục Pattern 2, `contracts/schemas/analysis.json#/$defs/trendResponse`).

## Tái hiện
1. Dựng snapshot thật bằng `build_analysis_snapshot(prepare_events(<200 ngày sự kiện>))` và ghi vào `analysis_results` (SQLite in-memory của `tests/unit/conftest.py`).
2. Gọi `GET /api/v1/analysis/trend?resample_freq=W&metric=avg_magnitude`.

Mong đợi: chuỗi re-sampling theo **tuần**, `actual_value` là **độ lớn trung bình** của kỳ (hoặc `status: insufficient_data` nếu chưa đủ kỳ).
Thực tế: chuỗi theo **tháng**, `actual_value` là **số trận**, nhãn phản hồi vẫn ghi `W` / `avg_magnitude`.

## Nguyên nhân gốc
- T3 — `apps/api/src/gdmas/services/analysis/patterns.py` `build_analysis_snapshot()` chỉ ghi **một** bản `trend` với tần suất tự chọn
  (`choose_trend_interval`) và `compute_trend()` chỉ tính metric `count`. Không có dữ liệu W/M song song hay metric độ lớn để T6 phục vụ.
- T6 — `apps/api/src/gdmas/api/routes/analysis.py` `get_trend()`: `_latest()` lùi về bản mới nhất khi không khớp interval, rồi `build()`
  trả nguyên `m["series"]` (bỏ qua `metric`) và gắn `resample_freq`/`metric` theo tham số yêu cầu thay vì theo dữ liệu đã lưu.
- Bộ test route hiện tại (`test_trend_maps_metric_to_series`) chỉ dùng định dạng cũ của `demo_seeder` (`trend_line`), không phủ định dạng thật của T3.

## Cách sửa
Proposal `2026-11-20-trend-resample-metric-son` (§9 Approved bởi `son`), nhánh `fix/2026-11-20-trend-resample-metric-son`:
- T3 `patterns.py`: `compute_trend(..., metric="count")` hỗ trợ `avg_magnitude`/`max_magnitude` (kỳ rỗng bị loại, hồi quy theo vị trí kỳ thật);
  `compute_trend_bundle()` gom 3 metric; `build_analysis_snapshot()` ghi `trend` cho `day`/`week`/`month` (tần suất chính ghi trước cho `/patterns`).
- T6 `routes/analysis.py`: `resample_freq` nhận `D|W|M`; `_latest(..., strict_interval=True)` cho trend (không lùi tần suất);
  chọn chuỗi theo `metrics[metric]`, chuỗi chỉ có `count` không bị gắn nhãn metric khác; trả `status` khi có.
- `docs/api/API.md` mục Pattern 2.

## Kiểm chứng
`apps/api/tests/unit/test_analysis_trend_route.py` trên code cũ: 8 failed / 4 passed; trên code mới: pass.
Toàn bộ backend 296 passed, Ruff sạch (testcase `2026-11-20-trend-resample-metric-son`).

## Lịch sử
- 2026-11-20 — ghi nhận (status: open)
- 2026-11-20 — sửa trên nhánh `fix/2026-11-20-trend-resample-metric-son`, chờ merge (status: fixed)
