<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Monitoring — 1 trận mới nhất theo vùng & refresh 5 phút có lọc

## Metadata
- ID: 2026-11-24-monitoring-region-latest-refresh-thien
- Proposal: .agents/notes/proposed/2026-11-24-monitoring-region-latest-refresh-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Khi lọc region: bản đồ chỉ giữ đúng 1 trận mới nhất (UTC). Mỗi lần dữ liệu mới (SSE hoặc timer 5 phút) → fetch lại theo `?country=&region=` và thay thế marker, không rơi về toàn cục.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/monitoring/monitoring-view.ts` (`latestEventInRegion` thuần)
- `apps/web/src/features/monitoring/MonitoringMapPage.tsx` (refreshVersion, visibleEvents, focus)
- `apps/web/tests/monitoring-region-map.test.ts`, `apps/web/tests/monitoring-map-ux.test.ts`
- `.agents/notes/testcase/2026-11-24-monitoring-region-latest-refresh-thien.md`

### Out of Scope
- BE, contract, SSE protocol, tile/Leaflet, header countdown/combobox, `/earthquakes`/`/overview`
- Helper/props cũ (`applySseEvent`, `sseRefreshKey`, `sortEventsByTimeDesc`) — giữ cho caller/test cũ
- Working tree timezone (chưa commit) — stage patch riêng

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời `plan.md`, `status.md`, `testcase/<id>.md`; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD (dirty tree timezone), giữ nguyên working tree.

### Step 3 — Hàm thuần
`latestEventInRegion(events, country, region)` — ALL_REGIONS giữ nguyên; ngược lại lọc + sort UTC giảm, tie `source_event_id`, trả 1 event.

### Step 4 — Trang
`visibleEvents`/`focus` dùng helper; `refreshVersion` gộp SSE + timer 5 phút + đổi filter; `load(true)` thay thế events.

### Step 5 — Test & validation
FE build + test; `notes_index.py --check`; OCP.

### Step 6 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. FE-only, vẫn GET `/earthquakes` + SSE shell.

---

## 5. Validation
- [x] testcase + test offline bổ sung
- [x] `cd apps/web && pnpm build` — PASS
- [x] `cd apps/web && pnpm test` — 362 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: không xoá file/hàm cũ (applySseEvent/sortEventsByTimeDesc vẫn export)

---

## 6. Rủi ro khi làm
- Refresh đôi (SSE + timer) → `abortRef` huỷ request cũ, `load(true)` không nháy loading.
- Marker SSE thô bị thay → đúng ý (API trả dữ liệu đã lọc).
- Dirty tree timezone → stage patch riêng.

---

## 7. Rollback
Revert commit; giữ working tree timezone.

---

## 8. Ghi chú
Giữ chữ ký mọi hàm/props cũ (I2).
