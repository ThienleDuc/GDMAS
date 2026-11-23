<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: 3 biểu đồ temporal lọc đúng Ngày/Tuần/Tháng

## Metadata
- ID: 2026-11-24-temporal-charts-window-thien
- Proposal: .agents/notes/proposed/2026-11-24-temporal-charts-window-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
`/analysis/temporal` tính on-the-fly khi có cửa sổ → line/scatter/histogram cùng lọc theo Ngày/Tuần/Tháng.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/analysis.py` (điều kiện chọn nguồn temporal)
- `apps/api/tests/unit/test_analysis_query_params.py` (bổ sung test cửa sổ)
- `.agents/notes/testcase/2026-11-24-temporal-charts-window-thien.md`

### Out of Scope
- Contract/schema/payload shape, `compute_temporal`, FE component/toolbar, migration/worker/SSE
- Working tree của task `header-catalog-realtime` (chưa commit) — giữ nguyên, stage riêng

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời 3 note; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD (dirty tree catalog), giữ mọi thay đổi.

### Step 3 — BE
Đổi điều kiện: `country or region or start or end` → `compute_filtered_metrics`; snapshot chỉ khi không có window/filter.

### Step 4 — Test
BE test 3 interval với cửa sổ cố định; FE test assertion (nếu cần); validation.

### Step 5 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi schema; chỉ đổi nguồn tính metrics. Có thể cần cập nhật snapshot `quality_contracts.json` nếu guard OpenAPI fail (không mong đợi).

---

## 5. Validation
- [x] testcase + test offline
- [x] BE `uv run python -m pytest -q` — 380 passed + ruff sạch
- [x] FE `pnpm build && pnpm test` — 364 tests / 0 fail
- [x] `notes_index.py --check` — OK
- [x] OCP: giữ chữ ký route/build

---

## 6. Rủi ro khi làm
- Test cũ mong snapshot khi không có window → path đó vẫn giữ.
- Dirty tree catalog → stage patch riêng khi commit sau này.

---

## 7. Rollback
Revert commit; không DB/migration.

---

## 8. Ghi chú
FE đã gửi window — không cần đổi FE.
