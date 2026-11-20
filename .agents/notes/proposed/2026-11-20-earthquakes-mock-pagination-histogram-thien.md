# Proposal: Trang Danh mục động đất — mock, phân trang, histogram và lọc quốc gia (gộp)

## Metadata
- ID: 2026-11-20-earthquakes-mock-pagination-histogram-thien
- Author: agent | thien
- Created: 2026-11-20
- Type: refactor
- Status: approved
- Priority: high
- Area: `apps/web/dev-mock.ts`, `apps/web/tests/mocks/`, `apps/web/src/features/earthquakes/`, `apps/web/tests/`, `.agents/notes/`
- Architecture Impact: none
  <!-- Không đổi API/schema gốc; chỉ mở rộng FE + gộp/dọn note artifacts. -->
- Related Docs:
  - docs/yeucaubatbuoc.md §2 Pattern 1 (Histogram), §3.1 (filter), §5.2 (interactive charts)
  - docs/architecture.md §6.6, docs/architecture/SAD.md §5 Pattern 1
  - docs/guides/design/style-guide.md §13 (Data Table/Pagination), I2/I3/I5/I7
- Related Proposals:
  - Giữ làm proposal earthquakes duy nhất; đã hấp thụ nội dung của 3 proposal `catalog-insights`, `insights-compact`, `layout-styleguide-redesign` rồi xóa các note đó theo chỉ thị người dùng.
  - `2026-11-20-earthquakes-catalog-filter-thien` **đã commit trên develop** — giữ nguyên để bảo toàn lịch sử.
  - Không còn `Overrides`: các proposal bị thay thế đã được gộp/xóa; quyết định hiện hành nằm hoàn toàn trong proposal này.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Proposal earthquakes bị phân mảnh thành 5 bộ (1 đã commit, 4 chưa commit); người dùng yêu cầu giữ **một proposal duy nhất**, xóa các implement/notes đã thử nghiệm xong, đồng thời cải tiến chart bằng lọc quốc gia.

### Vấn đề
Cần (1) thêm select lọc quốc gia cho histogram/bảng từ `place` của dữ liệu mock, (2) gộp 4 proposal untracked vào proposal này, (3) xóa 3 bộ implement/testcase/proposal已被 thử xong (giữ catalog-filter đã commit), (4) build lại và bổ sung thiếu sót.

### Ảnh hưởng
Nhiều note chồng chéo gây nhầm quyết định hiện hành; chart thiếu lọc quốc gia nên chưa “xem từng quốc gia” được.

---

## 2. Hiện trạng
- Proposal earthquakes: catalog-filter (TRACKED), catalog-insights, insights-compact, layout-styleguide-redesign, mock-pagination-histogram (đều untracked).
- Code hiện tại: `MagnitudeHistogramChart` nhận `items: EarthquakeItem[]`; `countryFromPlace()` helper đã có nhưng không dùng; `dev-mock` trả 40 bản ghi, pagination 2 trang; 88/88 test pass.
- Chưa có select quốc gia trên chart; bảng chưa lọc theo quốc gia.

---

## 3. Mục tiêu
1. Thêm `select` quốc gia lấy từ `countryFromPlace(item.place)` trên dữ liệu bảng mock; chọn quốc gia → lọc cả **bảng + histogram + KPI** (một nguồn dữ liệu, không gọi API mới).
2. Gộp nội dung còn giá trị của 3 proposal untracked vào proposal này; xóa **3 bộ** proposal/implemented/testcase: `catalog-insights`, `insights-compact`, `layout-styleguide-redesign`.
3. Giữ `catalog-filter` (đã commit) và proposal/implement/testcase hiện tại (`mock-pagination-histogram`); cập nhật implement/testcase cho phạm vi mới.
4. Xóa implement cũ của 3 bộ đó (thư mục `implemented/<id>/`), không đụa file code đang dùng.
5. Build lại, chạy test, bổ sung test lọc quốc gia; validation notes/scope.

**Out of Scope:** không xóa file đã commit, không đổi API/schema/endpoint thật, không đụa code ngoài FE earthquakes.

---

## 4. Giải pháp đề xuất
- Pure helper: `countriesFromItems(items)` trả danh sách quốc gia unique (sort A–Z, có “Tất cả”), dùng `countryFromPlace`; `filterItemsByCountry(items, country)` (country = "all" → trả nguyên mảng).
- `EarthquakesPage.tsx`: state `selectedCountry`; áp `filterItemsByCountry` trước `rows`/histogram/KPI; đổi country → reset `page = 1`; truyền danh sách quốc gia + giá trị vào `MagnitudeHistogramChart`.
- `MagnitudeHistogramChart.tsx`: thêm `<select>` “Lọc quốc gia” trong header (dùng class `ds-select`), giữ histogram 4 bin; aria-label rõ.
- Cập nhật implement/testcase của ID hiện tại theo scope mới; xóa 3 bộ note untracked đã thử xong.
- Test: bổ sung `country-clusters.test.ts` hoặc test mới assertion countriesFromItems/filterItemsByCountry; giữ 88 test baseline; build + test.
- Kiểm tra “thiếu sót”: nếu test/lint/build phát hiện lỗi do gộp, sửa ngay trong scope này.

---

## 5. Phương án đã cân nhắc
- Lọc từ `/clusters` (DBSCAN): hai nguồn khác nhau với bảng → bỏ.
- **Lọc từ `place` của bảng mock**: một nguồn, filter đồng bộ bảng + chart → chọn.
- Xóa catalog-filter đã commit: không chọn (rủi ro lịch sử).

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Notes | Xóa 3 bộ untracked, giữ 1 | Tránh trùng lặp quyết định |
| Code | +1 helper, +1 select, filter state | Đáp ứng “xem từng quốc gia” |
| Bảo trì/OCP | Tốt | Không xóa source code, chỉ thêm |
| Kiểm chứng | Tốt | Test thuần + build + notes check |

---

## 7. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Xóa nhầm file đã commit | Chỉ xóa 3 ID untracked; kiểm tra `git ls-files` trước |
| Filter country làm lệch phân trang | Reset `page = 1` khi đổi country; test helper |
| Notes index lệch sau xóa | Cập nhật implement/testcase cùng ID; chạy check ngay |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- Implement/testcase: cập nhật `.agents/notes/implemented/2026-11-20-earthquakes-mock-pagination-histogram-thien/` và testcase cùng ID.
- Test: cập nhật `apps/web/tests/earthquakes-insights.test.ts` (country filter) + giữ `mock-earthquakes.test.ts`, `country-clusters.test.ts`.
- Lệnh: `pnpm build && pnpm test`; UI: chọn quốc gia → bảng + chart đổi, page về 1; `notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-21
Comments: Người dùng xác nhận "Approved luôn revision này". Duyệt thêm lọc quốc gia từ place, gộp notes earthquakes, xóa 3 bộ untracked đã thử (giữ catalog-filter đã commit), build lại và bổ sung thiếu sót. Không đổi API/schema.
Scope of Rejection: -

---

## 10. Next Action
§9 Approved; implement lọc quốc gia, gộp/xóa 3 bộ note untracked, build + test + notes check, dừng CHECKPOINT 1.

### Revision 2026-11-21
- **Yêu cầu mới:** thêm lọc quốc gia từ `place`; gộp proposal earthquakes thành 1; xóa 3 bộ untracked đã thử; build lại và bổ sung thiếu sót.
- **Đã sửa:** metadata Status → changes_requested, §1–§8, §9 Decision → Changes Requested; làm rõ giữ `catalog-filter` đã commit.
- **Chưa làm:** chưa xóa file, chưa sửa code; chờ §9.
