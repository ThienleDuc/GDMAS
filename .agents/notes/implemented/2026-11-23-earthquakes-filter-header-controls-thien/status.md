<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — ngắn, sống, cập nhật liên tục.
     Vòng đời: planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Sửa bộ lọc Danh mục động đất & gom điều khiển dùng chung lên Header/Aside

## Metadata
- ID: 2026-11-23-earthquakes-filter-header-controls-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 8 — CHECKPOINT 1 (chờ người dùng quyết định commit/push)

Completed:
- Proposal §9 `Decision: Approved` (Reviewer: thien, 2026-11-23)
- `plan.md`, `status.md`, `testcase/<id>.md` sinh đồng thời; `notes_index.py --check` OK
- Nhánh `fix/2026-11-23-earthquakes-filter-header-controls-thien` (từ HEAD hiện tại, giữ working tree timezone)
- Step 3: dev-mock lọc 6 tham số; nút "Áp dụng" có nhãn
- Step 4: histogram bỏ 2 select cục bộ, hiện nhãn ngữ cảnh từ URL
- Step 5: `GlobalRegionFilter` trên header dùng `getRegionCatalog` + `?region=`
- Step 6: `CompactRefreshCountdown` (`5:00`) + `ThemeToggle` xuống `layout__sidebar-footer`; toast SSE tách sang `RefreshToastHost`
- Step 7: 2 test mới + bổ sung `dev-mock.test.ts`; cập nhật 5 assertion test cũ; build + 339 test pass
- Step 9 (sửa thêm theo phản hồi): thêm `buildCatalogStatistics` — histogram + 4 KPI cùng ăn `chartFiltered`/`chartTotal`; mock phục vụ `/countries`, `/regions`, `/statistics` theo cùng bộ lọc → **343 test pass**

In Progress:
- CHECKPOINT 1 (vòng 2) — chờ xác nhận `tiếp tục workflow` / `dừng lại` / `sửa thêm`

Blocked:
- Phần B (commit/push/PR) chờ xác nhận CHECKPOINT 1 + quyết định về working tree nhánh timezone

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/<id>.md` + 3 FE test (2 mới, 1 bổ sung) |
| Test liên quan (`pnpm test`) | PASS | `cd apps/web && pnpm test` — 343 tests / 0 fail |
| Lint / Build (`pnpm build`) | PASS | `cd apps/web && pnpm build` — `tsc -b && vite build` OK |
| Notes check (`notes_index.py --check`) | PASS | OK |
| Tài liệu cập nhật | N/A | `Architecture Impact: none` |
| OCP working tree | PASS | `git status --porcelain` — không có file bị xoá (`D`) |

---

## Known Issues
- none

---

## Deviations From Plan
- Dự kiến: `./scripts/git-ship.sh start fix/<id>` rẽ từ `develop`. Thực tế: script từ chối vì đang đứng ở feature branch `refactor/2026-11-23-global-timezone-context-thien` có working tree chưa commit. Quyết định: giữ nguyên working tree, dùng `git switch -c fix/<id>` (branch từ HEAD hiện tại) — không đánh mất việc đang dở; chờ người dùng xử lý ở CHECKPOINT 1.

---

## Decisions Made During Implementation
- Không đụng `EarthquakesPage.tsx` dù callback lọc cục bộ trở nên dư thừa — giữ tương thích I2 và tránh ghi đè thay đổi timezone đang dở.
- Giữ `countdownLabel()` cũ (`05:00`) cho caller/test cũ; thêm `compactCountdownLabel()` (`5:00`) riêng cho sidebar.

---

## Next Actions
- CHECKPOINT 1: người dùng chọn `tiếp tục workflow` (commit + push + PR, Phần B1) / `dừng lại` / `sửa thêm`
- Trước Phần B: cần quyết định cách xử lý working tree chưa commit của nhánh timezone `refactor/2026-11-23-global-timezone-context-thien` — khi commit phải stage **chỉ** các file trong In Scope của plan này

---

## Last Update
2026-11-23 — Vòng sửa thêm: region filter có danh mục từ mock; histogram + 4 KPI dùng chung tập đã lọc; 343 tests pass. Dừng CHECKPOINT 1 (vòng 2).
