# Implementation Status: Dark Mode + nút SVG toggle header

## Metadata
- ID: 2026-11-21-darkmode-toggle-thien
- Status: validation   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-21
- Last Updated: 2026-11-21
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved (Reviewer: thien, 2026-11-21)
- Rẽ nhánh `feat/2026-11-21-darkmode-toggle-thien`
- Sinh đồng thời plan/status/testcase
- Step 1–3: khối `.dark` override token, `ThemeToggle.tsx` (Sun/Moon SVG) sau clock, CSS `.header-theme-toggle`
- Step 4: `theme-toggle.test.ts` 8/8, full suite 160/160, build PASS

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` (passed) + `apps/web/tests/theme-toggle.test.ts` (8/8) |
| Test (`pnpm test`) | PASS | 160/160 pass, 0 fail |
| Build (`pnpm build`) | PASS | `tsc -b && vite build` — 2559 modules, 871ms |
| Notes check (`notes_index.py --check`) | PASS | OK |
| OCP working tree | PASS | không có file bị xóa; `lib/theme.ts`, `useTheme.ts`, `chart-theme.ts` không đổi |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- none

---

## Deviations From Plan
- **Dự kiến:** class CSS `.layout__theme-toggle`. **Thực tế:** đổi thành `.header-theme-toggle` để không vi phạm forbidden-list của `layout-styles.test.ts` TC-02 (giữ nguyên test cũ). **Quyết định:** đổi tên class, không sửa assertion TC-02.
- **Test cũ cần cập nhật:** `layout-styles.test.ts` TC-03 từng khẳng định `globals.css` KHÔNG có `.dark` (light-only). Theo yêu cầu Dark Mode mới, assertion được đổi thành khẳng định có `.dark { color-scheme: dark }` — không xóa test, chỉ thay assertion trái ngược yêu cầu. Ghi rõ trong `testcase/<id>.md`.

---

## Decisions Made During Implementation
- Light-first giữ nguyên; dark mode bằng override token `.dark`, không sửa helper theme có sẵn.

---

## Next Actions
- DỪNG CHECKPOINT 1: báo Implementation Report, hỏi `tiếp tục workflow` / `dừng lại` / `sửa thêm`. Chưa xác nhận → không commit/push.

---

## Last Update
2026-11-21 — Validation xanh: 8/8 test mới, 160/160 full suite, build PASS, notes OK. Chuyển `Status: validation`, dừng CHECKPOINT 1.
