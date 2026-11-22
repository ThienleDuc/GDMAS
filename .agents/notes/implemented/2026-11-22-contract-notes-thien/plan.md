# Implementation Plan: Ghi chú GAP-10/11

## Metadata
- ID: 2026-11-22-contract-notes-thien
- Proposal: .agents/notes/proposed/2026-11-22-contract-notes-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Làm rõ hợp đồng FE/API cho GAP-10 (nhãn HH:MM) và GAP-11 (empty `/patterns`), không đổi runtime/schema.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/contracts/earthquake.ts` *(comment)*
- `docs/api/API.md` *(prose §2/§3.3)*
- `apps/web/tests/api-contract-notes.test.ts` *(mới — source assertion)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký)*
- `.agents/notes/testcase/2026-11-22-contract-notes-thien.md`

### Out of Scope
`contracts/schemas/**`, BE, logic FE, dependency.

---

## 3/4/5. Các bước & Validation
1. comment contract; 2. prose API.md; 3. test source; 4. `pnpm test/build`, unittest scripts, notes check; commit/merge tự động.
Không migration/schema/env.

---

## 6/7/8. Rủi ro & Rollback
Rủi ro thấp (docs-only). Rollback: revert 2 file + test + nhật ký.
