# Testcase: Pass-through field 4 route analysis (GAP-02/03/04)

## Metadata
- ID: 2026-11-22-analysis-contract-fields-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/api/routes/analysis.py (4 build)
- Test File: apps/api/tests/unit/test_analysis_contract_fields.py, apps/api/tests/unit/test_analysis_trend_route.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** 4 route analysis trả field optional đã có trong schema từ `metrics_data` T3.
- **Ràng buộc:** I1 (chỉ route T6), I2 (giữ chữ ký build), I3 (không số giả), I4 (không migration), I7 (test offline fixture SQLite).

---

## 2. Dữ liệu mẫu (Fixtures)
- `AnalysisResult` với `metrics_data` chứa `status/series/slope/intercept/r_squared/p_value/complete_periods` (trend); `status/period/data_points/components` (seasonality); `status/variables/matrix/method/sample_size/note/spearman_matrix` (correlation); `status/data_points/avg_magnitude/avg_depth` (temporal).

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Temporal pass-through | Functional | metrics có `status`, `data_points`, `avg_depth` | Response có `status`, `stats{...}` đúng | `PASS` |
| `TC-02` | Trend hệ số hồi quy | Functional | snapshot T3 `metric=count` | `intercept/r_squared/p_value/sample_size/status` đúng; series không đổi | `PASS` |
| `TC-03` | Trend sample_size fallback | Boundary | nguồn chỉ có `data_points` | `sample_size` lấy fallback, không KeyError | `PASS` |
| `TC-04` | Seasonality pass-through | Functional | metrics có `status/period/data_points` | Response trả đúng | `PASS` |
| `TC-05` | Correlation pass-through | Functional | metrics có `status/sample_size/note/spearman_matrix` | Trả 3 field; **không** trả `spearman_matrix` (schema chưa có) | `PASS` |
| `TC-06` | Empty state | Resilience | bảng rỗng | `{success:false,data:null,message}` HTTP 200 | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_analysis_contract_fields.py -v
cd apps/api && uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** targeted 20/20 PASS; full BE 307/307; ruff sạch; FE 209/209 + build PASS.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
