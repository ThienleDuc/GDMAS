<!-- Chỉ tạo sau khi proposal có Decision: Approved ở §9. -->

# Implementation Plan: `/clusters` trả đủ field contract (GAP-01)

## Metadata
- ID: 2026-11-22-cluster-contract-fields-thien
- Proposal: .agents/notes/proposed/2026-11-22-cluster-contract-fields-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
`_cluster()` pass-through `max_magnitude`, `radius_km`, `name`, `dominant_place` (canonical + alias); giữ key/chữ ký cũ.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/clusters.py` *(sửa `_cluster()`)*
- `apps/api/tests/unit/test_cluster_contract_fields.py` *(mới)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký GAP-01)*
- `.agents/notes/testcase/2026-11-22-cluster-contract-fields-thien.md` *(đặc tả sinh đồng thời)*

### Out of Scope
- `contracts/**`, `docs/api/API.md`, migration Alembic (I4)
- `services/clustering/runner.py`, `demo_seeder.py`, model `clustering.py`
- `apps/web/**` (GAP-05 tách riêng sau GAP-01), route analysis/SSE (GAP-02…04/06)

---

## 3. Các bước
### Step 1 — Route
Sửa `_cluster()`: thêm 4 key mapping canonical/alias, giữ 6 key cũ, không số giả.
### Step 2 — Test
Tạo test offline canonical/legacy/missing/empty-envelope.
### Step 3 — Validation & nhật ký
`pytest` file + full BE, `ruff`, `pnpm test && pnpm build`, `notes_index --check`; ghi cuối file gaps; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không migration/schema/env. Chỉ bổ sung 4 field optional vào payload `/clusters` (additive).

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo đặc tả testcase
- [ ] Test offline mới pass + full BE suite
- [ ] `uv run ruff check . && uv run ruff format --check .`
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`

---

## 6. Rủi ro khi làm
Nguồn `summary_clusters` chưa có field → trả `None`, FE fallback như cũ (không bịa số).

---

## 7. Rollback
Revert route + test + mục nhật ký; giữ notes. Không migration.

---

## 8. Ghi chú
Chủ vùng `van` (T4)/`tai` (T6) — diff chạm route T6, ghi rõ trong PR. Dừng CHECKPOINT 1 sau validation.
