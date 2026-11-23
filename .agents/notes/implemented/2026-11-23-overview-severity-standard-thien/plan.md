<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Chuẩn hóa Overview theo quy ước earthquakes

## Metadata
- ID: 2026-11-23-overview-severity-standard-thien
- Proposal: .agents/notes/proposed/2026-11-23-overview-severity-standard-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Dùng chung `MAGNITUDE_BANDS`/`DEPTH_BANDS`/`SEVERITY_FOOTNOTE` từ earthquakes cho Overview: 5 mức độ lớn + 3 mức độ sâu, badge class và màu sắc thống nhất, không nhân bản hằng số.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/overview/overview-view.ts` (import bands, `severityLabel` 5 mức + `badgeClass`, `depthLabel`, `buildSeverityMix` badgeClass)
- `apps/web/src/features/overview/OverviewPage.tsx` (badge render, cột Độ sâu, footnote — chỉ stage hunk riêng vì file đang dính working tree timezone)
- `apps/web/src/features/overview/OverviewPage.css` (màu token success/info/warning/error, footnote)
- `apps/web/src/components/charts/OverviewSeverityChart.tsx` (SLICE_COLORS khớp badge)
- `apps/web/src/components/charts/OverviewHotspotsChart.tsx` (badge thay `ov-severity--${tone}`)
- `apps/web/src/components/charts/OverviewSeasonalityChart.tsx` (vòng 2: nhãn/màu chu kỳ theo earthquakes)
- `LatestEventRow`/`buildLatestEvents`/`applySseLatestEvent` trong `overview-view.ts` bổ sung `depth_km: number | null` (từ SSE khi có, không bịa)
- `.agents/notes/testcase/2026-11-23-overview-severity-standard-thien.md`
- `apps/web/tests/severity-standard.test.ts` (mới)
- `apps/web/tests/overview-view.test.ts`, `apps/web/tests/overview-page.test.ts`, `apps/web/tests/overview-docs-gaps.test.ts` (cập nhật assertion)

### Out of Scope
- `apps/web/src/features/earthquakes/**` — chỉ import, không sửa
- BE, contracts, migration, SSE, 6 Patterns, header/aside, bản đồ, xếp hạng
- Toàn bộ working tree chưa commit của proposal timezone `2026-11-23-global-timezone-context-thien` (kể cả hunk `useTimezone` trong `OverviewPage.tsx`) — giữ nguyên, không stage
- Commit/push/merge (CHECKPOINT 1/2)

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời `plan.md`, `status.md`, `testcase/<id>.md`; `notes_index.py --check`.

### Step 2 — Nhánh
`git-ship.sh start` bị chặn bởi feature branch hiện tại → `git switch -c refactor/<id>` từ HEAD, giữ nguyên working tree (ghi deviation).

### Step 3 — Nguồn quy ước
`overview-view.ts`: import `MAGNITUDE_BANDS`, `DEPTH_BANDS`, `SEVERITY_FOOTNOTE`; `severityLabel` trả 5 mức + `badgeClass` (giữ alias tone cũ); thêm `depthLabel`; `buildSeverityMix` đính `badgeClass`, giữ 3 slice API-driven.

### Step 4 — Render & màu
`OverviewPage.tsx`: badge `ds-badge <badgeClass>` ở 2 bảng, cột Độ sâu, footnote. `OverviewPage.css`: token màu mới. `OverviewSeverityChart.tsx`: SLICE_COLORS khớp success/warning/error.

### Step 5 — Test & validation
Test mới + cập nhật 2 test cũ; `pnpm build`, `pnpm test`, `notes_index.py --check`; kiểm `git status` không xoá file.

### Step 6 — CHECKPOINT 1
`status.md = validation`, báo cáo, dừng chờ người dùng.

### Step 7 — Sửa thêm (vòng 2)
- `OverviewSeasonalityChart.tsx`: nhãn/màu 3 mức theo quy ước earthquakes (Mạnh/Trung bình/Nhẹ; error/warning/success).
- `overview-view.ts`: `riskBadgeClass(label)` ánh xạ LOW/MEDIUM/HIGH/CRITICAL → success/warning/error/error.
- `OverviewPage.tsx`: title cho 3 card + label chu kỳ — **tất cả dùng chung một class `ov-card__label`**; badge cho "Mức rủi ro".
- `OverviewPage.css`: `.ov-card__label` thống nhất font `--font-sans`, size `--text-base`, weight `--font-bold`, màu `--foreground` (đủ nổi bật, cùng token với earthquakes).
- Cập nhật `overview-docs-gaps.test.ts`, test mới cho risk badge + title; **không** thêm class CSS mới.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. FE-only, `Architecture Impact: none`.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo `.agents/notes/testcase/<id>.md` từ `_TEMPLATE.md`
- [x] Đã tạo file test offline mới + cập nhật test cũ (không xoá)
- [x] `cd apps/web && pnpm build` — PASS
- [x] `cd apps/web && pnpm test` — 349 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP working tree: không có file bị xoá; chưa stage (sẽ stage patch riêng cho `OverviewPage.tsx`)

---

## 6. Rủi ro khi làm
- Test cũ assert 3 nhãn → cập nhật assertion, không xoá.
- `OverviewPage.tsx` dính timezone → dùng patch riêng khi stage.
- Statistics chỉ có 3 field → không tự chia 5 nhóm giả (I5).

---

## 7. Rollback
Revert commit nhánh này; không có DB/migration. Giữ nguyên nhánh timezone.

---

## 8. Ghi chú
`overview-view.ts` là nơi duy nhất định nghĩa tone/badge cho Overview; earthquakes giữ nguyên vai trò nguồn quy ước.
