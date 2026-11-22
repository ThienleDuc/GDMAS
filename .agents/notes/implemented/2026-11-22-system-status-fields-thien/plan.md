# Implementation Plan: Field hệ thống (GAP-12)

## Metadata
- ID: 2026-11-22-system-status-fields-thien
- Proposal: .agents/notes/proposed/2026-11-22-system-status-fields-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
`/system/status` + `/health` trả field optional đã có trong schema.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/system.py`
- `apps/api/tests/unit/test_system_prediction_routes.py`
- `docs/task/fe-be-integration-gaps.md`
- `.agents/notes/testcase/2026-11-22-system-status-fields-thien.md`

### Out of Scope
`contracts/**`, docs API, migration, FE.

---

## 3–8
1. Sửa route; 2. test; 3. validation + merge tự động + nhật ký.
Không migration/schema/env. Rollback: revert route + test + nhật ký.
