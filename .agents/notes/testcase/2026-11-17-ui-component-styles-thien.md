# Testcase: Xây lại style layout dùng chung

## Metadata
- ID: 2026-11-17-ui-component-styles-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/styles/{index,globals}.css` + `apps/web/src/layouts/{DashboardLayout,FullscreenMapLayout,ReportLayout}.tsx` + `apps/web/src/layouts/layout.css`
- Test File: `apps/web/tests/layout-styles.test.ts`
- Author: agent | thien
- Created: 2026-11-17
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** `index.css` là entry point tập trung import Tailwind/animate/globals/layout; ba layout không import CSS lẻ; layout dùng semantic tokens và variants; report giữ hook in.
- **Ràng buộc GDMAS liên quan:**
  - [x] I1 — chỉ thay T7, không worker.
  - [x] I3 — không đổi hợp đồng/timestamp/tọa độ.
  - [x] I5 — giữ Dark Mode capability, states/chart data; không thay dữ liệu.
  - [x] I7 — test đọc filesystem, offline 100%, không gọi mạng.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** Node.js built-in `node:test`, `node:assert`, `node:fs`; không cần mock HTTP/DB.
- Danh sách layout: `DashboardLayout.tsx`, `FullscreenMapLayout.tsx`, `ReportLayout.tsx`.
- CSS entry point tập trung: `src/styles/index.css`; layout stylesheet dùng chung: `src/layouts/layout.css`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Ba layout dùng stylesheet tập trung | Structural | Đọc TSX và index.css | Không layout nào import CSS riêng; index import `layout.css` | `PASS` |
| `TC-02` | Layout có đủ variants + semantic tokens | Structural | Kiểm class/layout.css | Có dashboard/fullscreen/report variants; dùng `var(--…)`, không hardcode mã màu | `PASS` |
| `TC-03` | Index là entry point CSS duy nhất | Structural | Đọc main/index/globals | main import index; index import Tailwind, animate, globals, layout; tokens và `.dark` có mặt | `PASS` |
| `TC-04` | Report print action được giữ | Regression | Đọc ReportLayout + layout.css | handler `window.print()` còn; toolbar có class no-print/print rule | `PASS` |
| `TC-05` | Build và toàn bộ FE test | Regression | `corepack pnpm@11 test`, `corepack pnpm@11 build` | Tất cả test pass, build thành công | `PASS` — 39/39 + build thành công |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/layout-styles.test.ts
cd apps/web && corepack pnpm@11 test
cd apps/web && corepack pnpm@11 build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-17`
- **Kết quả quan sát thật:** `node --test tests/layout-styles.test.ts` → 5/5 pass. `corepack pnpm@11 test` → 39/39 pass. `corepack pnpm@11 build` → tsc + Vite pass; còn cảnh báo chunk JS >500 kB. `tw-animate-css@1.4.0` đã được pnpm quản lý; pnpm 11 khớp store v11. `python3 scripts/notes_index.py --check` → OK; `git diff --check` → OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none
