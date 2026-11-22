# Proposal: Pass-through field contract cho 4 route analysis (GAP-02/03/04)

## Metadata
- ID: 2026-11-22-analysis-contract-fields-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/api/routes/, apps/api/tests/unit/
- Architecture Impact: none
  <!-- Các field đã có trong contracts/schemas/analysis.json; T3 đã tính sẵn. Route BE chưa trả.
       Không đổi schema/docs/contracts, không migration. -->
- Related Docs: docs/api/API.md §3.3, contracts/README.md §3.6, docs/task/fe-be-integration-gaps.md (GAP-02/03/04)
- Related Proposals: 2026-11-20-trend-resample-metric-son (T3), 2026-11-21-api-docs-contract-sync-thien (docs), 2026-11-22-cluster-contract-fields-thien (GAP-01, đã merge)
- Related Bugs: none

---

## 1. Vấn đề
T3 (`services/analysis/patterns.py`) đã tính đủ hệ số hồi quy (`intercept`, `r_squared`, `p_value`, `data_points/complete_periods`), `status`, `period`, `stats`, `note`, `sample_size`. FE contract (`analysis.ts:32,62-67,82,91,107-112`) đã khai báo, `docs/api/API.md` đã mô tả — nhưng 4 hàm `build()` trong `routes/analysis.py` bỏ qua phần lớn field → FE hiện `"—"`, không phân biệt được `insufficient_data`.

---

## 2. Hiện trạng
- `temporal build()` `:124-137` — trả `interval/line_chart/scatter_plot/histogram`, thiếu `status`, `stats`.
- `trend build()` `:155-189` — trả `series/slope/trend_direction` + `status` có điều kiện; thiếu `intercept/r_squared/p_value/sample_size`.
- `seasonality build()` `:199-223` — thiếu `status`, `period`, `data_points`.
- `correlation build()` `:232-237` — thiếu `status`, `sample_size`, `note`.
- Nguồn T3: `patterns.py:244,249-252`, `358-374`, `469-483`, `571-582`.
- `contracts/schemas/analysis.json` có `additionalProperties:false` → **không** thêm `spearman_matrix`/`undefined_pairs`/`corr_mag_depth` (chưa định nghĩa).

---

## 3. Mục tiêu
- Pass-through additive field đã có trong schema từ `metrics_data`; field thiếu → bỏ qua (không số giả), giữ chữ ký 4 hàm `build()` và response cũ.
- **Out of Scope:** đổi schema/contracts/docs, migration, T3 worker, FE, GAP-01/05/06.

---

## 4. Giải pháp đề xuất
1. `temporal`: thêm `status` (khi có) + `stats{data_points,avg_magnitude,max_magnitude,avg_depth}` (chỉ key có trong `metrics_data`).
2. `trend`: thêm `intercept`, `r_squared`, `p_value` từ `source`; `sample_size` = `source.sample_size → complete_periods → data_points`; `status` luôn có (fallback `"computed"`).
3. `seasonality`: thêm `status`, `period`, `data_points` khi có.
4. `correlation`: thêm `status`, `sample_size`, `note` khi có. Không thêm field ngoài schema.
5. Test offline mới `apps/api/tests/unit/test_analysis_contract_fields.py` + bổ sung `test_analysis_trend_route.py` (snapshot T3 thật).

---

## 5. Phương án đã cân nhắc
- **A (chọn):** pass-through ở 4 `build()` — 1 file, không đụng DB/schema, additive.
- B: sửa FE tự suy — bịa số, vi phạm I3/I5.
- C: đổi schema cho `spearman_matrix` — vượt scope, user đã dặn "không sửa schema" cho các field chưa định nghĩa.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | Thêm key vào dict `build()` |
| Hiệu năng | Không đổi | Pass-through JSONB có sẵn |
| Bảo trì / OCP | Tốt | Không xóa key/chữ ký cũ |
| Độ tin cậy | Tăng | FE hiển thị số thật thay "—" |

---

## 7. Rủi ro
- Test cũ so sánh dict đầy đủ → chạy full pytest; assert theo field thay vì so sánh toàn dict.
- Nguồn legacy không có field mới → bỏ qua, response vẫn hợp lệ.

---

## 8. Cách kiểm chứng
- Testcase: `.agents/notes/testcase/2026-11-22-analysis-contract-fields-thien.md`
- Test: `apps/api/tests/unit/test_analysis_contract_fields.py` (mới), bổ sung `test_analysis_trend_route.py`.
- Lệnh: `cd apps/api && uv run pytest <file> && uv run pytest`, ruff; `cd apps/web && pnpm test && pnpm build`; `notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`) xác nhận "được" để tiếp tục gap sau GAP-01, gom GAP-02/03/04 (cùng file `routes/analysis.py`). Giới hạn §3; field đã có trong schema, không đổi schema.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` → code + test → validation → dừng CHECKPOINT 1 → ghi nhật ký cuối `docs/task/fe-be-integration-gaps.md`.
