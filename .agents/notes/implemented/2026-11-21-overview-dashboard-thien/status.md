# Implementation Status: Trang Tổng quan — Bento Dashboard

## Metadata
- ID: 2026-11-21-overview-dashboard-thien
- Status: validation   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-21
- Last Updated: 2026-11-21
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved (Reviewer: thien, 2026-11-21; "được, duyệt")
- Rẽ nhánh `feat/2026-11-21-overview-dashboard-thien`
- Sinh đồng thời plan/status/testcase
- Step 1–5: view model thuần, hook 404-tolerant, 4 chart component, page Bento + CSS, thay placeholder, lazy-load
- Step 5: 171/171 test pass, build PASS

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` (passed) + `overview-view.test.ts` (9) + `overview-page.test.ts` (2) |
| Test (`pnpm test`) | PASS | 171/171 pass, 0 fail |
| Build (`pnpm build`) | PASS | main chunk 422 kB (lazy-load), charts chunk 481 kB |
| Notes check (`notes_index.py --check`) | PASS | OK |
| OCP working tree | PASS | không có file bị xóa |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- none

---

## Deviations From Plan
- `App.tsx`: đổi từ import tĩnh sang `React.lazy` cho `OverviewPage` (kèm Suspense fallback) để giữ Recharts ra khỏi main bundle — main chunk 422 kB thay vì 978 kB. Lý do: hiệu năng; đã cập nhật test `overview-page.test.ts`.
- `styles/index.css`: bổ sung 1 dòng `@import "../features/overview/OverviewPage.css"` theo convention CSS tập trung của repo; đã thêm vào `plan.md` In Scope.
- Theo yêu cầu người dùng 2026-11-21: gỡ toàn bộ 7 khối `<header className="ov-card__head">` và CSS `.ov-card__head` — nội dung chart/insight giữ nguyên; test tĩnh `overview-page.test.ts` cập nhật để khẳng định class đã biến mất.
- Theo yêu cầu 2026-11-21: gỡ card G `ov-card ov-card--12` (strip 7 Terminals), kéo theo `buildTerminalRows` và request `GET /api/v1/system/status` (giảm 1 request). Làm lại `.ds-table` **trong phạm vi `.ov-page`** (không ảnh hưởng trang khác), đổi tiêu đề sang tiếng Việt và thêm cột "Mức độ" với nhãn Cao/Trung bình/Thấp qua `severityLabel()`.
- Chỉnh CSS lần 2 theo yêu cầu: bảng dùng `border-collapse: separate`, padding `--space-3`, viền dòng, header nền `--muted`, zebra `--surface-secondary` — bỏ gradient; nhãn mức độ dùng **nền đặc** `--error-light`/`--warning-light`/`--success-light` với chữ tương phản, **không dùng bán trong suốt**.
- Chỉnh CSS lần 3: chuyển sang **chuẩn `.eq-table-card .ds-table` của Danh mục động đất** — `min-width: 760px` (rank 560px), `--table-header-height` 44px / `--table-row-height` 48px, chữ `--card-foreground`, hover `--muted`. Riêng nhãn rủi ro Pattern 6 đổi từ `LOW/MEDIUM/HIGH/CRITICAL` sang `Thấp/Trung bình/Cao/Rất cao` qua `riskLabelVietnamese()`.
- Chỉnh CSS lần 4 (làm rõ ý người dùng): **giữ viền bảng** (`1px solid var(--border)` + bo góc wrapper), chỉ làm đẹp **nội dung trong ô** — thêm `.ov-rank-index` (ô số thứ hạng), `.ov-cell-count`, `.ov-cell-mag`, `.ov-cell-time`, `.ov-cell-place`, `.ov-cell-coord` (mono), `.ov-rank-link`.

---

## Decisions Made During Implementation
- §9: giữ 4 chart A–D; ranking FE-only từ `/clusters`, nhãn không rõ → "Khác"; chart D giữ; trend 14 ngày.

---

## Next Actions
- DỪNG CHECKPOINT 1: báo Implementation Report, hỏi `tiếp tục workflow` / `dừng lại` / `sửa thêm`. Chưa xác nhận → không commit/push.

---

## Last Update
2026-11-21 — Giữ viền bảng, chỉ css nội dung ô (số hạng, tên, số liệu, thời gian, tọa độ) + rủi ro tiếng Việt; re-validation 173/173 test, build PASS, notes OK. Vẫn dừng CHECKPOINT 1.
