# Proposal: `/patterns` P5/P6 trả field optional (GAP-07)

## Metadata
- ID: 2026-11-22-patterns-optional-fields-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: medium
- Area: apps/api/src/gdmas/api/routes/, contracts/, apps/api/tests/unit/
- Architecture Impact: contracts/schemas/patterns.json, contracts/README.md
  <!-- CHỈ cập nhật ghi chú mô tả ("BE hiện chưa trả" → "đã trả từ 2026-11-22").
       KHÔNG đổi shape/schema/additionalProperties (user: "không sửa schema"). -->
- Related Docs: docs/api/API.md §3.3, contracts/README.md §3.3, docs/task/fe-be-integration-gaps.md (GAP-07)
- Related Proposals: 2026-11-20-fe-t6-contract-services-audit-thien, 2026-11-22-analysis-contract-fields-thien (đã merge)
- Related Bugs: none

---

## 1. Vấn đề
`routes/patterns.py:103-157` P5 chỉ trả `target_date/predicted_value/lower_bound/upper_bound/model_name`; P6 chỉ trả `target_date/predicted_label/probability_scores/model_name`. DB (`models/prediction.py:24-39,57-63`) đã có `metric_name`, `model_version`, `evaluation_metrics`, `generated_at`, nhưng route bỏ qua → FE typed view `chart-types.ts:138-163` đọc `undefined`, UI hiện "chưa có dữ liệu kiểm định" dù có số thật.

---

## 2. Hiện trạng
- `patterns.json:208-250` đã định nghĩa các field optional, nhưng description ghi "BE hiện chưa trả" (`:220`, `:225`); `contracts/README.md:98` ghi "BE có thể bổ sung sau".
- User đã cho phép sửa `contracts/` ở phiên audit trước, nhưng **chỉ ghi chú** — không đổi shape schema (đã ghi trong mục 3/5 file gaps).
- `_iso()` có sẵn ở `routes/system.py:33-38` để format `generated_at` UTC `Z`.

---

## 3. Mục tiêu
- P5 thêm `metric_name`, `model_version`, `evaluation_metrics`, `generated_at`; P6 thêm `model_version`, `evaluation_metrics`.
- Cập nhật ghi chú trong `patterns.json`/`README.md` cho đúng thực tế. Không đổi shape/schema/additionalProperties, không migration, không FE.

---

## 4. Giải pháp đề xuất
1. `patterns.py`: import `_iso` từ `routes.system`; thêm 4 key vào P5 metrics, 2 key vào P6 metrics (giữ key cũ, giá trị `None` nếu thiếu record).
2. `contracts/schemas/patterns.json:220,225`: đổi description "BE hiện chưa trả" → "BE `/patterns` đã trả từ 2026-11-22; khi null FE hiển thị ...".
3. `contracts/README.md:98`: cập nhật tương tự cho P5/P6.
4. Test mới `apps/api/tests/unit/test_patterns_contract_fields.py`: 6 field đúng, UTC `Z`, empty state vẫn `{success:false,total_patterns:0,patterns:[],message}`.

---

## 5. Phương án đã cân nhắc
- **A (chọn):** BE trả field + cập nhật ghi chú — đúng contract đã có, additive.
- B: chỉ sửa ghi chú, BE vẫn không trả — FE vẫn `undefined`, không giải quyết.
- C: thêm field mới vào schema — user đã dặn không sửa shape, vượt scope.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 6 dòng mapping + 2 ghi chú |
| Hiệu năng | Không đổi | Pass-through JSONB |
| Bảo trì / OCP | Tốt | Không xóa key/shape cũ |
| Độ tin cậy | Tăng | FE đọc số kiểm định thật |

---

## 7. Rủi ro
- `patterns.json` có `additionalProperties:false` → field đã định nghĩa sẵn → an toàn, không thêm field lạ.
- `generated_at` cần `_iso()` để có hậu tố `Z` (I3).

---

## 8. Cách kiểm chứng
- Testcase: `.agents/notes/testcase/2026-11-22-patterns-optional-fields-thien.md`
- Test: `apps/api/tests/unit/test_patterns_contract_fields.py` (mới)
- Lệnh: BE pytest + ruff; FE test/build (drift); `notes_index --check`; `git-ship.sh scope`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng xác nhận "tiếp tục" GAP-07 theo nhật ký `docs/task/fe-be-integration-gaps.md` mục 5; trước đó đã cho phép sửa contracts **chỉ ghi chú**, không đổi shape schema. Giới hạn §3.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` → code + test → validation → dừng CHECKPOINT 1 → ghi nhật ký GAP-07.
