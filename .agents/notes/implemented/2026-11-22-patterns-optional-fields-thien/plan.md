# Implementation Plan: `/patterns` P5/P6 field optional (GAP-07)

## Metadata
- ID: 2026-11-22-patterns-optional-fields-thien
- Proposal: .agents/notes/proposed/2026-11-22-patterns-optional-fields-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
BE `/patterns` trả field optional P5/P6 đã có trong schema; cập nhật ghi chú contracts (không đổi shape).

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/patterns.py` *(import `_iso`, thêm 4+2 key)*
- `contracts/schemas/patterns.json` *(chỉ description `:220,:225`)*
- `contracts/README.md` *(:98 ghi chú)*
- `apps/api/tests/unit/test_patterns_contract_fields.py` *(mới)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký GAP-07)*
- `.agents/notes/testcase/2026-11-22-patterns-optional-fields-thien.md`

### Out of Scope
`docs/api/API.md`, shape schema/additionalProperties, migration, FE, GAP-05/13/10/11.

---

## 3. Các bước
1. `patterns.py`: import `_iso`; P5 thêm `metric_name/model_version/evaluation_metrics/generated_at`; P6 thêm `model_version/evaluation_metrics`.
2. `patterns.json` + `README.md`: chỉ đổi ghi chú "chưa trả" → "đã trả từ 2026-11-22".
3. Test mới; full BE + ruff; FE drift check; ghi nhật ký; CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không migration/shape/schema/env — chỉ bổ sung field optional vào payload + ghi chú.

---

## 5. Validation
- [x] Đã tạo testcase
- [ ] Test mới + full BE suite pass
- [ ] Ruff sạch
- [ ] FE test/build (drift check)
- [ ] `notes_index --check`, `scope`

---

## 6. Rủi ro khi làm
`additionalProperties:false` — field đã định nghĩa sẵn; `generated_at` qua `_iso()` → UTC `Z`.

---

## 7. Rollback
Revert route + 2 ghi chú + test + nhật ký; giữ notes. Không migration.

---

## 8. Ghi chú
Chủ vùng `tai` (T6) — ghi trong PR. Dừng CHECKPOINT 1 sau validation.
