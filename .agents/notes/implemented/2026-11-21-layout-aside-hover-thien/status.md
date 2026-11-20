# Implementation Status: Tái tạo layout — breadcrumb, aside rail, nội dung rộng

## Metadata
- ID: 2026-11-21-layout-aside-hover-thien
- Status: completed   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-21
- Last Updated: 2026-11-21
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Validation xong — dừng CHECKPOINT 1

Completed:
- Proposal §9 Approved (thien, 2026-11-21); nhánh `refactor/2026-11-21-layout-aside-hover-thien` rẽ từ develop.
- Sinh đồng thời plan.md / status.md / testcase/<id>.md.
- Step 1 — `navigation.ts` thuần: `NAV_META`, `routeLabel`, `navMetaFor` (6 route + fallback "Trang").
- Step 2 — `DashboardLayout.tsx`: bỏ `sidebarOpen`/toggle/effect tự thu; aside rail cố định; breadcrumb `routeLabel`; NavLink `group` + `aria-label` + popover; giữ SSE context.
- Step 3 — `layout.css`: rail mặc định (`--sidebar-width-collapsed`), popover absolute + hover/focus-visible, `.layout__content` full-width, overflow nav chỉnh để card không bị cắt.
- Step 4 — `layout-navigation.test.ts` (mới) + 4 test bổ sung trong `layout-styles.test.ts` (5 test cũ giữ nguyên).

In Progress:
- none (chờ xác nhận CHECKPOINT 1 để commit/push/PR)

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` = passed; `layout-navigation.test.ts` + bổ sung `layout-styles.test.ts` |
| Test liên quan (`pnpm test`) | PASS | `cd apps/web && pnpm test` → **116/116 pass, 0 fail** (offline 100%) |
| Build (`pnpm build`) | PASS | `tsc -b && vite build` sạch; 2149 modules; CSS 63.57 kB / JS 466.79 kB |
| Notes check (`notes_index.py --check`) | PASS | OK |
| OCP working tree | PASS | 0 deletion; không đụng core protected, `globals.css`, `App.tsx`, API/contracts |
| Kiểm chức năng | PASS | breadcrumb 6 route tiếng Việt; rail không toggle; hover/focus hiện card; content full-width |

---

## Known Issues
- none

---

## Deviations From Plan
- Không đổi `globals.css`; dùng token có sẵn (`--sidebar-width-collapsed`, `--z-tooltip`, …) để tránh drift design system.
- Bỏ hẳn nút toggle thay vì giữ ẩn — đúng yêu cầu "bỏ đóng tắt aside, sử dụng luôn khi đang đóng" đã được người dùng xác nhận khi duyệt §9.
- Theo chỉ thị mới sau CHECKPOINT 1: bỏ mô tả khỏi popover, badge "Live" của `/monitoring` nằm cùng hàng với nhãn (`layout__nav-popover-head`), card nằm sát nav-link (`left: calc(100% + var(--space-1))`). `description` vẫn giữ trong `navigation.ts` để test/navMetaFor, không render.
- Popover dùng `width: max-content` (co giãn theo nội dung) kèm `max-width: 240px` để tránh tràn khi nhãn rất dài — không còn chiều rộng cố định.

---

## Decisions Made During Implementation
- Nhãn điều hướng tách sang `navigation.ts` thuần để test offline; icon vẫn nằm trong component.
- Popover là con của `NavLink` (`position:absolute`), hiện bằng CSS `:hover`/`:focus-visible` — không thêm state JS, không toggle.
- `.layout__nav` và `.layout__sidebar` dùng `overflow: visible` để card không bị cắt (chỉ 6 mục nên không cần scroll).

---

## Next Actions
- none — proposal đã Approved, PR #40 đã merge vào `develop`; task hoàn tất.

---

## Merge Record
- PR: https://github.com/ThienleDuc/GDMAS/pull/40
- Merge commit: `8ea4af4` (`Merge pull request #40 from ThienleDuc/refactor/2026-11-21-layout-aside-hover-thien`)
- Feature commit: `97ec03f`
- Dry-run trước merge: 0 conflict (`mergeable=MERGEABLE`, `state=CLEAN`).

---

## Last Update
2026-11-21 — PR #40 đã merge vào `develop` (SHA `8ea4af4`), sync xong; `Status: completed`.
