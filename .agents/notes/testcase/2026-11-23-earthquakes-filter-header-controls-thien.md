<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md & .agents/skills/write-testcase/SKILL.md. -->

# Testcase: Bộ lọc Danh mục động đất & điều khiển dùng chung Header/Aside

## Metadata
- ID: 2026-11-23-earthquakes-filter-header-controls-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/dev-mock.ts`, `apps/web/src/layouts/header/`, `apps/web/src/features/earthquakes/components/MagnitudeHistogramChart.tsx`, `apps/web/src/layouts/DashboardLayout.tsx`
- Test File: `apps/web/tests/header-aside-controls.test.ts`, `apps/web/tests/header-region-filter.test.ts`, `apps/web/tests/dev-mock.test.ts` (bổ sung)
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** (1) dev-mock lọc đúng 6 tham số; (2) hàm thuần `compactCountdownLabel` / `regionOptionsFromCatalog`; (3) cấu trúc render: countdown `5:00` trên toggle trong aside, histogram không còn select country/region.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — FE/T7 shell, không worker)
  - [x] UTC & WGS84 (I3 — không đổi timestamp/tọa độ)
  - [x] Không fallback mock ở view chính thức (I5 — chỉ sửa fixture dev-mock phục vụ demo)
  - [x] Unit test chạy offline 100% (I7 — `node:test`, không mạng)

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node:test` + `node:assert/strict`, đọc source bằng `readFileSync`; `resolveContractMock` với fixture `earthquakes_sample.json` (không gọi HTTP).
```json
{
  "query": "min_magnitude=5&max_magnitude=7&min_depth=10&max_depth=100&country=Japan&region=Tokyo",
  "sample_event": {
    "source_event_id": "mock_0",
    "event_time": "2026-11-23T00:00:00.000Z",
    "latitude": 38.2,
    "longitude": 142.4,
    "depth_km": 24.5,
    "magnitude": 5.8,
    "place": "Off the east coast of Honshu, Japan"
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | dev-mock lọc theo độ lớn/độ sâu | Functional | Query `min_magnitude=5&max_magnitude=6` | Mọi item trả về có `magnitude` trong `[5,6]`; envelope `success: true` | `PASSED` |
| `TC-02` | dev-mock lọc theo quốc gia/khu vực | Functional | Query `country=Japan` | Item trả về có `countryOf(item) === "Japan"`; metadata.total khớp | `PASSED` |
| `TC-03` | compactCountdownLabel biên | Boundary | `300`, `125`, `0`, `NaN` | `"5:00"`, `"2:05"`, `"5:00"`, `"5:00"` | `PASSED` |
| `TC-04` | regionOptionsFromCatalog rỗng/sai shape | Resilience | `null`, `{data:{regions:[]}}` | `[]`, không throw | `PASSED` |
| `TC-05` | aside render countdown trên toggle | Structural | Đọc `DashboardLayout.tsx` | `layout__sidebar-footer` chứa `<CompactRefreshCountdown` trước `<ThemeToggle`; countdown có `role="timer"` | `PASSED` |
| `TC-06` | header không còn countdown/toggle | Structural | Đọc `HeaderActions.tsx` | Không có `<DataRefreshLabel` / `<ThemeToggle`; có `<GlobalRegionFilter` và `<RefreshToastHost` | `PASSED` |
| `TC-07` | histogram bỏ select cục bộ | Structural | Đọc `MagnitudeHistogramChart.tsx` | Không còn `aria-label="Lọc theo quốc gia"` / `"Lọc theo khu vực"`; còn `eq-country-chart__context` | `PASSED` |
| `TC-08` | filter bar có nhãn Áp dụng | Structural | Đọc `EarthquakeFilterBar.tsx` | Có `eq-filter-apply-label` và chữ "Áp dụng", vẫn giữ `onApply` | `PASSED` |
| `TC-09` | KPI tính từ tập đã lọc | Functional | `buildCatalogStatistics(items, total, now)` | `total_events=total`, `recent_24h_count` chỉ đếm 24h, avg/max đúng | `PASSED` |
| `TC-10` | mock phục vụ danh mục quốc gia/khu vực | Functional | `GET /earthquakes/countries`, `/regions?country=Japan` | Có `Japan`, regions không rỗng, không trả sentinel `all` | `PASSED` |
| `TC-11` | mock KPI ăn cùng bộ lọc | Functional | `GET /statistics?min_magnitude=5&max_magnitude=6` | `total_events` khớp `/earthquakes` cùng query; avg/max nằm trong [5,6] | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm build
cd apps/web && pnpm test
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-23`
- **Kết quả quan sát thật:** `pnpm build` PASS (`tsc -b && vite build`); `pnpm test` PASS — **343 tests / 0 fail** (baseline 327 / 2 fail → vòng 1 339 pass → vòng sửa thêm 343 pass). `python3 scripts/notes_index.py --check`: OK. Không có test cũ nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` *(cập nhật nếu test phát hiện lỗi chưa xử lý)*
