<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Panel trạng thái 7 Terminals (RD-16)

## Metadata
- ID: 2026-11-22-terminal-status-panel-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-terminal-status-panel-thien.md
- Target: apps/web/src/layouts/header/header-data.ts, apps/web/src/layouts/header/SystemStatusPanel.tsx
- Test File: apps/web/tests/terminal-status.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** helper map payload `/system/status` → 7 dòng trạng thái + widget header tiêu thụ service thật.
- **Ràng buộc:**
  - [x] I1 — widget chỉ gọi REST T6, không worker/SSE riêng.
  - [x] I2 — không đổi service/contract/helper cũ; chỉ thêm hàm thuần + widget.
  - [x] I3 — `last_run` thiếu/invalid → `unknown`; UTC qua helper có sẵn.
  - [x] I5 — 404/unavailable → nhãn riêng, không mock.
  - [x] I7 — test offline (`node:test`), `now` inject để tất định.

---

## 2. Dữ liệu mẫu (Fixtures)
- `SystemStatusResponse` với 7 service, một số có `last_run`, một số thiếu; `now = 2026-11-22T12:00:00Z`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Đủ 7 Terminals | Functional | payload 7 service | 7 dòng đúng `T1`…`T7`, tên từ `SERVICE_LABELS`/`TERMINAL_SPECS` | `PASS` |
| `TC-02` | Thiếu `last_run` | Resilience | service `{}` | `status:"unknown"`, freshness `unknown`, `lastRunLabel:"—"` — không suy diễn active | `PASS` |
| `TC-03` | Dữ liệu cũ | Boundary | `last_run` 20 phút trước, cycle 5m | freshness `stale`, nhãn ">15m" | `PASS` |
| `TC-04` | Gián đoạn 1 ngày | Boundary | `last_run` 30h trước, cycle 1d | freshness `interrupted` | `PASS` |
| `TC-05` | Summary | Functional | 7 service, 3 fresh/active | `summarizeTerminalRows` → `{healthy:3,total:7}` | `PASS` |
| `TC-06` | Payload rỗng | Resilience | `null` / `{success:false}` | 7 dòng unknown, summary `0/7`, không crash | `PASS` |
| `TC-07` | Wiring header | Functional | source `HeaderActions.tsx` | Có `<SystemStatusPanel`, không import route `/settings` | `PASS` |
| `TC-08` | Không khôi phục route cũ | Regression | source `app/routes.tsx` | Không có `SETTINGS` path | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/terminal-status.test.ts -v
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 9 test chuyên biệt PASS; `pnpm test` 202/202 PASS; `pnpm build` PASS; `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
