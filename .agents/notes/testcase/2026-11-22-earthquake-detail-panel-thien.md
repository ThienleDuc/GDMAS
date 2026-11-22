<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Panel chi tiết sự kiện động đất (RD-13)

## Metadata
- ID: 2026-11-22-earthquake-detail-panel-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-earthquake-detail-panel-thien.md
- Target: apps/web/src/features/earthquakes/earthquake-detail.ts, components/EarthquakeDetailPanel.tsx, EarthquakesPage.tsx
- Test File: apps/web/tests/earthquake-detail.test.ts, apps/web/tests/earthquakes-page.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** helper thuần `detailFields`/`rawDataSummary`/`isNotFound` + wiring của trang `/earthquakes` tới `getEarthquakeDetail()`.
- **Ràng buộc:**
  - [x] I1 — chỉ gọi BE qua service, không mạng trực tiếp.
  - [x] I2 — không đổi chữ ký `getEarthquakeDetail`, thêm prop tùy chọn `onSelect`.
  - [x] I3 — UTC/WGS84 qua `formatEventTime`/`formatWgs84Point`, không parse thời gian sai múi.
  - [x] I5 — không mock thay API thật; field thiếu → không hiển thị/bỏ qua.
  - [x] I7 — test offline 100% (`node:test`, không jsdom).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- Payload `EarthquakeItem` canonical, có `raw_data` object, và bản thiếu field optional.

```json
{
  "id": 1042, "source": "USGS", "source_event_id": "us7000m123",
  "event_time": "2026-11-06T10:45:22Z", "latitude": 35.6895, "longitude": 139.6917,
  "depth_km": 15.4, "magnitude": 5.8, "magnitude_type": "mww",
  "place": "82 km ENE of Tokyo, Japan", "source_url": "https://earthquake.usgs.gov/...",
  "ingested_at": "2026-11-06T10:50:00Z",
  "raw_data": { "type": "Feature", "properties": { "mag": 5.8 } }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Đủ field canonical | Functional | fixture đầy đủ | `detailFields` có `source_event_id`, `magnitude_type`, `source_url`, `ingested_at`, toạ độ WGS84; thời gian theo mode | `PASS` |
| `TC-02` | Field optional thiếu | Resilience | item chỉ có field bắt buộc | Không thêm field giả; `rawDataSummary()` → `null` | `PASS` |
| `TC-03` | `raw_data` có giá trị | Functional | `raw_data` object | `rawDataSummary()` trả nhãn; JSON stringify hợp lệ | `PASS` |
| `TC-04` | UTC & UTC+7 | Boundary | cùng `event_time`, 2 mode | Khác nhau đúng 7 giờ, hậu tố hiển thị đúng mode | `PASS` |
| `TC-05` | 404 | Negative | `new ApiError(...,404)` | `isNotFound()` → `true` | `PASS` |
| `TC-06` | 500 | Negative | `new ApiError(...,500)` | `isNotFound()` → `false` | `PASS` |
| `TC-07` | Wiring trang | Functional | source `EarthquakesPage.tsx` | Có `getEarthquakeDetail`, `EarthquakeDetailPanel`, `onSelect`, `AbortController` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/earthquake-detail.test.ts tests/earthquakes-page.test.ts -v
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 14 test chuyên biệt PASS; `pnpm test` 189/189 PASS; `pnpm build` PASS; `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
