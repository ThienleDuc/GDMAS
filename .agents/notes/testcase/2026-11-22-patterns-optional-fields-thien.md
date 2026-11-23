# Testcase: `/patterns` P5/P6 field optional (GAP-07)

## Metadata
- ID: 2026-11-22-patterns-optional-fields-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/api/routes/patterns.py
- Test File: apps/api/tests/unit/test_patterns_contract_fields.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** P5/P6 trả field optional đã có trong schema từ DB.
- **Ràng buộc:** I1 (route T6), I2 (giữ key cũ), I3 (`generated_at` UTC `Z`), I4 (không migration), I7 (test offline fixture SQLite). User: chỉ sửa ghi chú contracts, không đổi shape.

---

## 2. Dữ liệu mẫu (Fixtures)
- `PredictionResult` + `ClassificationResult` đủ field: `metric_name`, `model_version`, `evaluation_metrics`, `generated_at`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | P5 đủ field | Functional | DB có prediction | `metric_name/model_version/evaluation_metrics/generated_at` đúng | `PASS` |
| `TC-02` | P6 đủ field | Functional | DB có classification | `model_version/evaluation_metrics` đúng | `PASS` |
| `TC-03` | UTC Z | Boundary | `generated_at` | ISO 8601 hậu tố `Z` | `PASS` |
| `TC-04` | Empty state | Resilience | DB rỗng | `{success:false,total_patterns:0,patterns:[],message}`, không `data` | `PASS` |
| `TC-05` | Ghi chú contract | Regression | source `patterns.json`/`README.md` | Không còn cụm "BE hiện chưa trả" | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_patterns_contract_fields.py -v
cd apps/api && uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** targeted 3/3 PASS; full BE 313/313; ruff sạch; FE 209/209 + build PASS.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
