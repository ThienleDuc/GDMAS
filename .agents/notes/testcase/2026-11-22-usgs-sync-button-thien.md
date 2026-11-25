<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Nút đồng bộ USGS (RD-14)

## Metadata
- ID: 2026-11-22-usgs-sync-button-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/features/earthquakes/usgs-sync.ts, components/UsgsSyncButton.tsx, contracts/common.ts, services/earthquake-api.ts
- Test File: apps/web/tests/usgs-sync.test.ts *(gồm cả case service 200/503/500/abort — gom chung thay vì sửa services.test.ts)*
- Author: agent | thien
- Created: 2026-11-22
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** state machine xác nhận 2 bước trước POST có tác dụng phụ; format kết quả/lỗi; vá envelope `/sync`; abort request.
- **Ràng buộc:**
  - [x] I1 — chỉ gọi T6, không gọi USGS trực tiếp từ FE.
  - [x] I2 — mở rộng `syncUsgsData(signal?)` (tham số tùy chọn), không xóa hàm cũ.
  - [x] I3 — timestamp UTC `Z` giữ nguyên, chỉ hiển thị.
  - [x] I5 — không mock tĩnh runtime; **test mock fetch**, không gọi USGS thật.
  - [x] I6 — không đụng `.env`/secret.
  - [x] I7 — test offline `node:test`.

---

## 2. Dữ liệu mẫu (Fixtures)
- Payload BE 200 thật: `{success:true,message:"Đã đồng bộ thành công 3 sự kiện…",synced_count:3,source:"USGS",timestamp:"2026-11-22T08:00:00Z"}`.
- 503: `{success:false,error:{code:"DATA_SOURCE_UNAVAILABLE",message:"…",details:"ConnectError"}}`.
- 500: `{success:false,error:{code:"DATABASE_ERROR",message:"…"}}`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | 200 shape thật không bị guard chặn | Functional | mock fetch payload `SyncResponse` | `syncUsgsData()` resolve, `init.method==="POST"`, URL `/api/v1/earthquakes/sync` | `PASS` |
| `TC-02` | 503 / 500 / mạng | Negative | mock fetch 503/500 / throw | `ApiError` kèm `status` và `code DATA_SOURCE_UNAVAILABLE` cho 503 | `PASS` |
| `TC-03` | Truyền AbortSignal | Resilience | `syncUsgsData(controller.signal)` | `init.signal` được truyền; abort → `signal.aborted` | `PASS` |
| `TC-04` | State machine | Functional | `syncReducer` với các action | ask→confirming, cancel→idle, start→loading, success→done, failure→error | `PASS` |
| `TC-05` | Hủy xác nhận | Functional | action `cancel` | Về `idle`, không sinh action `start` | `PASS` |
| `TC-06` | Format kết quả/lỗi | Functional | payload 3 sự kiện / ApiError 503 | message chứa "3", timestamp `Z` giữ nguyên; 503 → thông báo USGS | `PASS` |
| `TC-07` | Wiring trang | Functional | source `EarthquakesPage.tsx` | Có `<UsgsSyncButton`, `onSynced={handleRetry}`, vẫn cấm `<table\b` | `PASS` |
| `TC-08` | Không mock runtime POST | Regression | source `dev-mock.test.ts` | Giữ assert `resolveContractMock("POST",...sync) === null` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/usgs-sync.test.ts tests/services.test.ts -v
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 7 test chuyên biệt PASS; `pnpm test` 209/209 PASS; `pnpm build` PASS; `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
