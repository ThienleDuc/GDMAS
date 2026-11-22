# Proposal: Panel khu vực dùng cụm thật, bỏ mock (GAP-05)

## Metadata
- ID: 2026-11-22-region-clusters-no-mock-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/web/src/features/monitoring/, apps/web/tests/
- Architecture Impact: none
  <!-- Không đổi contracts/route BE; chỉ thay nguồn panel bằng /clusters thật (đã có dominant_place từ GAP-01). -->
- Related Docs: docs/task/fe-be-integration-gaps.md (GAP-05), contracts/README.md §3.8
- Related Proposals: 2026-11-22-cluster-contract-fields-thien (GAP-01, đã merge), 2026-11-22-patterns-cluster-fallback-thien (RD-15, đã merge), 2026-11-21-monitoring-leaflet-map-markers-thien
- Related Bugs: none

---

## 1. Vấn đề
`mock-region-clusters.ts` sinh 8 địa danh/count giả lập và `fetchRegionClusters()` trả chúng. `MonitoringMapPage.tsx:57` dùng hàm này để nạp panel lọc khu vực trên `/monitoring` (view chính thức) → vi phạm I5. GAP-01 đã làm `/clusters` trả `dominant_place` thật, RD-15 đã nối fallback `/patterns`, nên không còn lý do dùng mock.

---

## 2. Hiện trạng
- `mock-region-clusters.ts:10-35` — `MOCK_SOURCES`, `getMockRegionClusters()`, `fetchRegionClusters()`.
- `MonitoringMapPage.tsx:33,50,57,84-87,146,200` — import/gọi/hiển thị `RegionClusterRow[]`.
- `region-clusters.ts:9-57` — `buildRegionClusters(items: {place?, magnitude}[])` thuần, gom theo `countryFromPlace`/`regionFromPlace` — tái dùng được.
- `services/earthquake-api.ts:getClustersOptional()` — trả `OptionalApiResult<ClustersResponse>` (đã fallback `/patterns`).
- Test `region-clusters.test.ts:31-43` hiện assert mock — phải đổi sang payload thật.

---

## 3. Mục tiêu
- `fetchRegionClusters(signal?)` lấy cụm từ `getClustersOptional()`, map `dominant_place || name` → `place`, `avg_magnitude` → magnitude, rồi `buildRegionClusters()`; 404/empty → `[]` (không mock).
- Giữ nguyên `RegionClusterRow`, UI panel và chữ ký `fetchRegionClusters` (thêm `signal?` tùy chọn). Không đổi BE/contracts.

---

## 4. Giải pháp đề xuất
1. Viết lại nội dung `mock-region-clusters.ts` thành adapter thật (giữ tên file để không xóa file — RULE-03):
   - `fetchRegionClusters(signal?: AbortSignal): Promise<RegionClusterRow[]>`
   - `const result = await getClustersOptional(signal); const clusters = result.data?.data?.clusters ?? [];`
   - dùng hàm thuần mới `buildRegionClusterRows(clusters)` trong `region-clusters.ts` (phát hiện khi implement: `buildRegionClusters` cũ coi 1 item = 1 event → mất `event_count` thật; hàm mới dùng trực tiếp `event_count`/`avg_magnitude`/`max_magnitude`, giữ hàm cũ nguyên vẹn theo I2).
   - Bỏ `getMockRegionClusters` + `MOCK_SOURCES` (chỉ test cũ gọi — cập nhật test).
2. `MonitoringMapPage.tsx`: truyền `controller.signal` vào `fetchRegionClusters` trong effect hiện có (abort khi unmount).
3. Test `region-clusters.test.ts`: thay case mock bằng mock fetch `/clusters` payload có `dominant_place` → assert country/region, count, avg; thêm case 404 → `[]`.
4. Source assertion: không còn `MOCK_SOURCES`/`getMockRegionClusters` trong `src/`.

---

## 5. Phương án đã cân nhắc
- **A (chọn):** dùng lại file, đổi nội dung thành adapter thật — 1 file, không xóa file, import cũ vẫn chạy.
- B: tạo file mới + xóa file mock — vi phạm RULE-03 (xóa file), cần hỏi người dùng.
- C: giữ mock nhưng chỉ dùng khi có cờ dev — vẫn vi phạm I5 ở view chính thức nếu bật nhầm.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 adapter + 1 effect + test |
| Hiệu năng | 1 request khi mở trang (đã có sẵn hook gọi /clusters) | Không thêm poll |
| Bảo trì / OCP | Trung bình | Giữ tên file/export chính, bỏ export test-only |
| Độ tin cậy | Tăng | Panel phản ánh cụm thật |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| `dominant_place` legacy là tiếng Việt → `countryFromPlace` trả "Khác" | Trung bình | Thấp | Dữ liệu thật, không bịa; đã ghi ở nhật ký GAP-01 |
| Test cũ import `getMockRegionClusters` | Chắc chắn | Thấp | Cập nhật test trong cùng PR |

---

## 8. Cách kiểm chứng
- Testcase: `.agents/notes/testcase/2026-11-22-region-clusters-no-mock-thien.md`
- Test: `apps/web/tests/region-clusters.test.ts` (sửa) + source assertion
- Lệnh: `cd apps/web && pnpm test && pnpm build`; BE pytest (drift check); `notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng xác nhận "tiếp tục" GAP-05 theo nhật ký `docs/task/fe-be-integration-gaps.md` mục 5. Tiền đề GAP-01/RD-15 đã merge. Giới hạn §3; không xóa file, không đổi BE/contracts.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` → code + test → validation → dừng CHECKPOINT 1 → ghi nhật ký GAP-05.
