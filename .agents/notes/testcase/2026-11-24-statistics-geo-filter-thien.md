<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Bộ lọc quốc gia & khu vực cho Statistics

## Metadata
- ID: 2026-11-24-statistics-geo-filter-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/features/statistics/StatisticsLayout.tsx`
- Test File: `apps/web/tests/statistics-subroute.test.ts`, `apps/web/tests/chart-region-filter.test.ts`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** CountryPicker + RegionPicker + chip ngữ cảnh; 6 endpoint vẫn nhận geo.
- **Ràng buộc:** I2 (giữ RegionPicker/header), I3 (URL), I5 (không mock), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- Đọc source tĩnh, không mạng.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Không picker quốc gia ở trang con | Structural | Đọc `StatisticsLayout.tsx` | Không có `CountryPicker`; quốc gia lấy từ `useCatalogSelection()` (header/URL) | `PASSED` |
| `TC-02` | RegionPicker giữ nguyên | Regression | Đọc source | Vẫn có `RegionPicker`, `getRegionCatalog`, `setSelection(country, ...)` | `PASSED` |
| `TC-03` | Chip ngữ cảnh | Structural | Đọc source + CSS | Có `stat-filter-chip`, token CSS, hiển thị khi có filter | `PASSED` |
| `TC-04` | 6 endpoint vẫn lọc | Regression | Đọc `statistics-data.tsx` | 6 lần `...geo`/`geoQuery` cho temporal/trend/seasonality/correlation/predictions/classifications | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** `pnpm build` PASS; `pnpm test` **365 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
