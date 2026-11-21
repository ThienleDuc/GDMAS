# Implementation Status: Gọn điều hướng aside và bổ sung Header toàn cục (FE-only)

## Metadata
- ID: 2026-11-21-header-country-clock-refresh-thien
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
- Kiểm toán contracts: dùng được, không cần sửa
- Sinh đồng thời `plan.md` / `status.md` / `testcase/<id>.md`
- Rẽ nhánh `feat/2026-11-21-header-country-clock-refresh-thien`
- Step 1–4: gọn nav/route, hàm thuần, 3 widget header + chip, CSS
- Step 5: test offline 151/151 pass, build PASS

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + test) | DONE | `testcase/<id>.md` (Status: passed) + `apps/web/tests/header-global.test.ts` (7/7) |
| Test liên quan (`pnpm test`) | PASS | 152/152 pass, 0 fail |
| Build (`pnpm build`) | PASS | `tsc -b && vite build` — 2555 modules, 672ms |
| Notes check (`notes_index.py --check`) | PASS | OK |
| OCP working tree (`git status --porcelain`) | PASS | không có file bị xóa (`D`) |
| Tài liệu cập nhật | N/A | Architecture Impact: none (FE-only, theo chỉ thị người dùng) |

---

## Known Issues
- none

---

## Deviations From Plan
- **Dự kiến:** nhãn "Dữ liệu cập nhật mỗi 5 phút — <relative time>" lấy từ `sse.lastEventTime`. **Thực tế:** người dùng báo nhấp nháy liên tục do trạng thái SSE đổi connecting/reconnecting → thay bằng đồng hồ đếm ngược 5 phút chạy độc lập (giảm 1s, về 0 reset 05:00, `aria-live="off"`). **Lý do:** ổn định hiển thị và đúng yêu cầu mới. **Quyết định:** người dùng yêu cầu trực tiếp 2026-11-21; plan.md/testcase đã cập nhật theo.
- **Yêu cầu bổ sung 2026-11-21:** khi countdown về 0 → gọi `sse.reconnect()` (bổ sung additive vào `useSSE`) để mở lại EventSource lấy sự kiện mới + hiện `RefreshToast` góc trên bên phải đếm ngược 5s rồi tự đóng. Không đổi giao thức SSE/BE.

---

## Decisions Made During Implementation
- FE-only theo chỉ thị người dùng; không sửa contracts/docs/BE dù drift tài liệu đã biết (T7.11/T7.12).
- Đồng hồ countdown không phụ thuộc SSE; chu kỳ vẫn suy từ `TERMINAL_SPECS.ingestion.cycle` để tránh hardcode.
- Làm đẹp CSS header theo yêu cầu 2026-11-21: dùng semantic token (không hex, Dark Mode-safe), gradient/shadow/progress bar/keyframes + `prefers-reduced-motion`.

---

## Next Actions
- DỪNG CHECKPOINT 1: báo Implementation Report, hỏi người dùng `tiếp tục workflow` / `dừng lại` / `sửa thêm`. Chưa xác nhận → giữ working tree, không commit/push.

---

## Last Update
2026-11-21 — Làm đẹp CSS widget header (gradient, shadow, progress bar, chấm live, toast trượt vào, reduced-motion). Re-validation xanh: 152/152 test, build PASS. `Status: validation`, dừng lại CHECKPOINT 1.
