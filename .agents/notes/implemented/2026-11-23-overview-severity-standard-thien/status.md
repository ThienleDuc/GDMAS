<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — vòng đời planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Chuẩn hóa Overview theo quy ước earthquakes

## Metadata
- ID: 2026-11-23-overview-severity-standard-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 6 — CHECKPOINT 1

Completed:
- Proposal §9 `Decision: Approved`; notes sinh đồng thời; `notes_index.py --check` OK
- Nhánh `refactor/2026-11-23-overview-severity-standard-thien` (từ HEAD hiện tại, giữ working tree timezone)
- `overview-view.ts`: import bands, `severityLabel` 5 mức + `badgeClass`, `depthLabel`, `buildSeverityMix` 3 slice + badgeClass, `LatestEventRow.depth_km`
- `OverviewPage.tsx`: badge earthquakes, cột Độ sâu, footnote; `OverviewHotspotsChart.tsx`: badge
- CSS token success/info/warning/error; `OverviewSeverityChart` SLICE_COLORS khớp badge
- Test: `severity-standard.test.ts` mới + cập nhật `overview-view.test.ts`, `overview-page.test.ts`; build + 349 pass
- Step 7 (sửa thêm vòng 2): chu kỳ Mạnh/Trung bình/Nhẹ + màu error/warning/success; `riskBadgeClass` badge cho Mức rủi ro; 3 title card (xếp hạng, danh mục động đất, dự báo); build + **351 pass**

In Progress:
- CHECKPOINT 1 (vòng 2) — chờ xác nhận `tiếp tục workflow` / `dừng lại` / `sửa thêm`

Blocked:
- `git-ship.sh start`/local sync bị chặn bởi working tree timezone chưa commit (chưa có lựa chọn a/b/c từ người dùng)

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` + `severity-standard.test.ts` (mới) |
| Test (`pnpm test`) | PASS | 349 tests / 0 fail |
| Build (`pnpm build`) | PASS | `tsc -b && vite build` |
| Notes check | PASS | `notes_index.py --check` OK |
| Tài liệu | N/A | `Architecture Impact: none` |

---

## Known Issues
- none

---

## Deviations From Plan
- Dự kiến `git-ship.sh start refactor/<id>` từ develop; thực tế script từ chối vì đang ở feature branch có dirty tree → dùng `git switch -c` từ HEAD, giữ nguyên mọi thay đổi. Giống vòng trước.

---

## Decisions Made During Implementation
- `buildSeverityMix` giữ 3 slice vì `/statistics` chỉ trả 3 field — không tự chia 5 nhóm (I5).
- `severityLabel` giữ chữ ký `{label, tone}`, mở rộng tone và thêm `badgeClass` (I2).

---

## Next Actions
- CHECKPOINT 1: người dùng chọn `tiếp tục workflow` / `dừng lại` / `sửa thêm`
- Trước Phần B: cần quyết định working tree timezone (a/b/c) — `OverviewPage.tsx` vẫn dính hunk `useTimezone`, phải stage riêng bằng patch như task trước

---

## Last Update
2026-11-23 — Vòng 4: 4 label card đồng bộ về `ov-card__label` (font sans / text-base / bold / foreground); 351 tests pass. Dừng CHECKPOINT 1 (vòng 5).
