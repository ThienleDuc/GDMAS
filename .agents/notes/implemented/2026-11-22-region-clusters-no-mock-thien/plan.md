# Implementation Plan: Panel khu vực dùng cụm thật (GAP-05)

## Metadata
- ID: 2026-11-22-region-clusters-no-mock-thien
- Proposal: .agents/notes/proposed/2026-11-22-region-clusters-no-mock-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thay mock region clusters bằng dữ liệu `/clusters` thật; panel `/monitoring` không còn dữ liệu giả (I5).

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/monitoring/mock-region-clusters.ts` *(viết lại thành adapter thật, giữ tên file)*
- `apps/web/src/features/monitoring/region-clusters.ts` *(thêm `buildRegionClusterRows` — deviation phát hiện khi implement: `buildRegionClusters` giả định 1 item = 1 sự kiện, không dùng được cho cụm có `event_count`)*
- `apps/web/src/features/monitoring/MonitoringMapPage.tsx` *(truyền signal)*
- `apps/web/tests/region-clusters.test.ts` *(sửa case mock → payload thật + 404)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký GAP-05)*
- `.agents/notes/testcase/2026-11-22-region-clusters-no-mock-thien.md`

### Out of Scope
`apps/api/**`, `contracts/**`, `docs/api/API.md`, UI panel, SSE/marker, GAP-13.

---

## 3. Các bước
1. Adapter: `getClustersOptional(signal)` → `buildRegionClusterRows(clusters)`; 404/empty → `[]`.
2. `MonitoringMapPage`: effect truyền `controller.signal`.
3. Test: payload thật + 404 + source assertion "không còn MOCK_SOURCES".
4. Deviate: thêm `buildRegionClusterRows` trong `region-clusters.ts` — `buildRegionClusters` cũ coi 1 item = 1 event nên mất `event_count` thật; giữ hàm cũ nguyên vẹn (I2).
5. Validation + nhật ký + CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không migration/schema/env/route — chỉ đổi nguồn dữ liệu FE.

---

## 5. Validation
- [x] Đã tạo testcase
- [ ] FE test/build pass
- [ ] BE test (drift check)
- [ ] `notes_index --check`, `scope`

---

## 6. Rủi ro khi làm
`dominant_place` legacy tiếng Việt → "Khác" (dữ liệu thật, không bịa). Test cũ import export cũ → cập nhật trong PR.

---

## 7. Rollback
Revert 3 file FE + nhật ký; giữ notes. Không migration.

---

## 8. Ghi chú
Chủ vùng `thien` (T7/FE). Dừng CHECKPOINT 1 sau validation.
