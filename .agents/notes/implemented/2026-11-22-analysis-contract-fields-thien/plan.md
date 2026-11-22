# Implementation Plan: Pass-through field 4 route analysis (GAP-02/03/04)

## Metadata
- ID: 2026-11-22-analysis-contract-fields-thien
- Proposal: .agents/notes/proposed/2026-11-22-analysis-contract-fields-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
4 hàm `build()` trong `routes/analysis.py` trả thêm field optional đã có trong `analysis.json` từ `metrics_data` của T3.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/analysis.py` *(4 hàm build)*
- `apps/api/tests/unit/test_analysis_contract_fields.py` *(mới)*
- `apps/api/tests/unit/test_analysis_trend_route.py` *(bổ sung snapshot T3)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký)*
- `.agents/notes/testcase/2026-11-22-analysis-contract-fields-thien.md`

### Out of Scope
`contracts/**`, `docs/api/API.md`, migration, `services/analysis/patterns.py`, FE, GAP-01/05/06.

---

## 3. Các bước
1. `temporal`: `status` + `stats{data_points,avg_magnitude,max_magnitude,avg_depth}` (chỉ key có).
2. `trend`: `intercept/r_squared/p_value`, `sample_size` (fallback `complete_periods` → `data_points`), `status` mặc định `"computed"`.
3. `seasonality`: `status/period/data_points`.
4. `correlation`: `status/sample_size/note`; **không** thêm `spearman_matrix` (schema `additionalProperties:false`).
5. Test offline + full suite + ruff + FE drift check; ghi nhật ký; CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không migration/schema/env — chỉ bổ sung field optional vào 4 response.

---

## 5. Validation
- [x] Đã tạo testcase
- [ ] Test mới + full BE suite pass
- [ ] Ruff check/format sạch
- [ ] FE test/build (drift check)
- [ ] `notes_index.py --check`

---

## 6. Rủi ro khi làm
Nguồn legacy thiếu field → bỏ qua; không so sánh dict toàn phần trong test cũ.

---

## 7. Rollback
Revert route + 2 test + nhật ký; giữ notes. Không migration.

---

## 8. Ghi chú
Chủ vùng `son` (T3)/`tai` (T6) — ghi trong PR. Dừng CHECKPOINT 1 sau validation.
