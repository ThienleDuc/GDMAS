# Testcase: Mock bảng, pagination, histogram độ lớn

## Metadata
- ID: 2026-11-20-earthquakes-mock-pagination-histogram-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-20-earthquakes-mock-pagination-histogram-thien.md
- Target: `apps/web/dev-mock.ts`, `apps/web/src/features/earthquakes/`
- Test File: `apps/web/tests/mock-earthquakes.test.ts`, `apps/web/tests/earthquakes-insights.test.ts`
- Author: agent | thien
- Created: 2026-11-20
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Mock 40 bản ghi FE, phân trang theo trang, histogram độ lớn từ dữ liệu bảng đã lọc; UI dùng “Độ lớn” thay “Magnitude”.
- Offline 100%; mock chỉ dev/test, không import vào view runtime.

---

## 2. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | createEarthquakeList | Functional | count 40 | 40 item UTC/WGS84, magnitude/depth đa dạng | `PASSED` |
| `TC-02` | slicePage | Boundary | page 1/2/last, limit 20 | slice đúng, total_pages đúng | `PASSED` |
| `TC-03` | buildMagnitudeHistogram | Functional | items mẫu | Bin đúng, count + ratio %, total=0 → 0 | `PASSED` |
| `TC-04` | Pagination UI | Structural | Đọc component | Có số trang + first/last + Prev/Next | `PASSED` |
| `TC-05` | Dịch thuật ngữ | Structural | Đọc page/insights/note | Không còn chữ “Magnitude”; có “Độ lớn” | `PASSED` |
| `TC-06` | Regression | Regression | `pnpm test` | Không giảm 85 baseline; build OK | `PASSED` |

---

## 3. Lệnh thực thi
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** 2026-11-20
- **Kết quả:** build OK; 89/89 test pass; notes check OK. Mock 40 bản ghi, bảng 10 dòng/trang (4 trang), chart tổng hợp toàn bộ theo ngày/tuần/tháng + quốc gia (`CHART_PAGE_SIZE`), ghi chú sticky khít nội dung, UI dùng “Độ lớn”. Nút lọc SVG trong filter bar; áp dụng filter bằng nút (draft → appliedForm). Gộp notes: xóa 3 bộ untracked, giữ catalog-filter đã commit.

---

## 4. Lỗi phát hiện & Bug Logs
- `none`
