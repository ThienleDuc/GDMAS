# Implementation Status: Mock bảng, phân trang, histogram độ lớn

## Metadata
- ID: 2026-11-20-earthquakes-mock-pagination-histogram-thien
- Status: completed
- Started: 2026-11-20
- Last Updated: 2026-11-20
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — mock/pagination/histogram đã triển khai

Completed:
- Proposal §9 Approved bởi `thien`.
- Fixture 40 bản ghi + slicePage; dev-mock phân trang thật, statistics từ list.
- Histogram độ lớn (4 bin, số + %) thay country chart; dùng dữ liệu bảng đã lọc.
- Pagination số trang + first/last; dịch “Magnitude” → “Độ lớn” + dòng giải thích.
- Gộp notes earthquakes: xóa 3 bộ untracked đã thử, giữ catalog-filter đã commit.
- Thêm lọc quốc gia từ `place`: select trên chart, lọc bảng + histogram + KPI, reset page.
- Cập nhật trực tiếp (không proposal mới): bảng 10 dòng/trang; chart lấy toàn bộ theo ngày/tuần/tháng qua `CHART_PAGE_SIZE`, không phụ thuộc trang; ghi chú `sticky` + chiều cao fit-content; reset quốc gia khi đổi range.
- Bổ sung nút lọc SVG (icon phễu) trong filter bar; filter là draft, chỉ commit sang `appliedForm` khi bấm “Áp dụng bộ lọc” (bỏ debounce tự động).
- Build OK, 89/89 test pass, notes check OK.

In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `mock-earthquakes.test.ts` + cập nhật dev-mock/insights tests |
| Frontend build | PASS | `pnpm build` OK, ~291 kB JS |
| Frontend tests | PASS | 89/89 (baseline 85) |
| Notes check | PASS | `notes_index.py --check` OK |
| Scope | PASS | 51 tệp; 0 deletion |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- none

---

## Deviations From Plan
- Không tạo nhánh mới từ develop; triển khai tiếp trên nhánh hiện tại có diff chưa commit.

---

## Decisions Made During Implementation
- Chart histogram dùng dữ liệu bảng đã lọc, không gọi endpoint mới.
- Không xóa contract/helper cụm quốc gia cũ; chỉ ngừng render.

---

## Next Actions
- none — PR #36 đã merge vào develop (SHA 166911a), sync hoàn tất.

---

## Last Update
2026-11-21 — PR #36 merge vào develop (SHA 166911a); gộp notes, lọc quốc gia, mock/pagination/histogram, nút lọc SVG; build + 89/89 test xanh; status completed.
