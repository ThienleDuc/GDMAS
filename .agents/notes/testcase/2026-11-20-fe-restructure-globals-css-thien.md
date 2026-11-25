# Testcase: Tái cấu trúc Frontend — layout, contracts và lib

## Metadata
- ID: 2026-11-20-fe-restructure-globals-css-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/` — `styles/`, `layouts/`, `contracts/`, `lib/`, `services/`, `hooks/`, `app/`
- Test File: `apps/web/tests/lib-redesign.test.ts`, `apps/web/tests/layout-styles.test.ts`, `apps/web/tests/{chart-data,geo-format,map-data,settings-data}.test.ts`
- Author: agent | thien
- Created: 2026-11-20
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** (1) `styles/index.css` chỉ import, giao diện dùng `globals.css`; (2) layout đơn nhất có aside + `Outlet`; (3) contracts tách theo schema + barrel tương thích; (4) `lib/sse.ts` (parse/backoff/URL/factory), `lib/formatters.ts` (UTC/WGS84); (5) import cũ của `services/` và `hooks/` không vỡ.
- **Ràng buộc GDMAS liên quan:**
  - [x] Chuẩn **UTC** (ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback mock: payload SSE hỏng bỏ qua; endpoint 404 → `unavailable` (I5 / contracts/README.md §3.8).
  - [x] Unit test chạy **offline 100%** — không tạo EventSource/mạng thật, chỉ test helper thuần (I7).
  - [x] Giữ alias/đường dẫn import cũ — không phá vỡ caller (I2 / RULE-03).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node --test` + TypeScript type-stripping; payload SSE là chuỗi JSON tạo trong test, không dùng `EventSource` thật.
```json
{
  "sample_sse": {
    "event": "earthquake_detected",
    "data": { "id": 1043, "magnitude": 6.2 },
    "timestamp": "2026-11-06T11:08:00Z",
    "id": "evt-7",
    "retry": 3000
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | SSE enum khớp docs | Functional | Đọc `SSE_EVENT_NAMES` | Hợp 6 tên sự kiện của route + API.md §3.5 | `PASSED` |
| `TC-02` | Parse payload hợp lệ | Functional | JSON SSE đầy đủ `id`/`retry` | Giữ event/data/timestamp/id/retry; thiếu timestamp → fallback `Z` | `PASSED` |
| `TC-03` | Payload hỏng | Negative | `""`, `"not json"`, `[]`, thiếu `event`/`data` | Trả `null`, không ném lỗi | `PASSED` |
| `TC-04` | Backoff & ngưỡng retry | Boundary | `nextBackoff(0/1/5/10)`, `shouldGiveUp(8/9)` | Tăng dần, chặn 30s, dừng sau 8 lần | `PASSED` |
| `TC-05` | Chuẩn hoá URL SSE | Functional | URL tuyệt đối / rỗng / tương đối | Giữ nguyên / fallback route mặc định / ghép base | `PASSED` |
| `TC-06` | UTC & WGS84 | Boundary | `2026-11-06T11:08:00Z`, `±90/±180`, NaN | ISO `Z` đúng; toạ độ ngoài range → `—` | `PASSED` |
| `TC-07` | Barrel tương thích | Functional | Import runtime value từ contracts | `SERVICE_LABELS` đủ 7 terminal; nhãn SSE đúng | `PASSED` |
| `TC-L1` | Layout đơn nhất (kế thừa `layout-styles.test.ts`) | Structural | Đọc file layout/CSS/App | Chỉ còn `DashboardLayout`; có `<aside>` + `Outlet`; 1 route group; không còn variant fullscreen/report | `PASSED` |
| `TC-L2` | CSS entry point (kế thừa) | Structural | Đọc `styles/index.css` | Chỉ `@import`, không CSS inline; import `globals.css` | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm build
cd apps/web && pnpm test
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** 2026-11-20
- **Kết quả quan sát thật:** `pnpm build` OK; `pnpm test` 56/56 pass (7 TC mới + 49 kế thừa); `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
