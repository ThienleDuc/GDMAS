<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Monitoring — lọc khu vực lấy 1 trận mới nhất & làm mới bản đồ đúng chu kỳ 5 phút

## Metadata
- ID: 2026-11-24-monitoring-region-latest-refresh-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: high
- Area: `apps/web/src/features/monitoring/`, `apps/web/tests/`
- Architecture Impact: none   <!-- FE-only; vẫn dùng REST/SSE có sẵn, URL ?country=&region= làm nguồn sự thật -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-23-monitoring-region-map-thien.md   (*tái dùng luồng SSE/refresh hiện có, không override*)
  - .agents/notes/proposed/2026-11-24-catalog-selection-persistence-thien.md   (*link giữ ?country=&region=*)
  - .agents/notes/proposed/2026-11-24-monitoring-region-dedupe-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`MonitoringMapPage` nạp `GET /earthquakes?country=&region=&sort_by=event_time&order=desc&limit=100`,
lọc lại FE bằng `filterByCountryAndRegion`, rồi vẽ marker. Có 2 luồng làm mới: SSE (`sseRefreshKey` → `load(true)`)
và timer 5 phút (`setInterval(load(true), REALTIME_REFRESH_MS)`).

### Vấn đề
1. Khi lọc theo khu vực, bản đồ đang hiển thị **nhiều trận** trong khu vực đó. Người dùng xác nhận ý đúng:
   **chỉ lấy đúng 1 trận động đất mới nhất** trong khu vực (theo `event_time` UTC).
2. Bản đồ **không cập nhật đúng khi dữ liệu được làm mới mỗi 5 phút**; khi có dữ liệu mới thì bản đồ phải được
   cập nhật **và vẫn áp dụng bộ lọc** `?country=&region=` hiện tại (không rơi về toàn cục, không giữ marker cũ).

### Ảnh hưởng
Khu vực hẹp vẫn hiện quá nhiều marker gây nhiễu; và dữ liệu mới sau chu kỳ T2 không phản ánh đúng trên bản đồ đã lọc.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `MonitoringMapPage.tsx:60-63` | `params = useMemo(buildEarthquakeQuery(filters, null, {country, region, realtime:true}), [filters, country, region])` |
| `MonitoringMapPage.tsx:89-92` | Effect nạp lần đầu theo `load` |
| `MonitoringMapPage.tsx:97-100` | SSE `applySseEvent` — **thêm marker thô vào `events`**, chưa lọc theo country/region |
| `MonitoringMapPage.tsx:104-110` | `sseRefreshKey` → `load(true)` (có lọc) nhưng marker SSE đã chèn ở bước trên vẫn còn trong `events` |
| `MonitoringMapPage.tsx:112-116` | Timer 5 phút gọi `load(true)` — độc lập với header countdown (`sse.reconnect`) |
| `MonitoringMapPage.tsx:131-137` | `visibleEvents = sortEventsByTimeDesc(filterByCountryAndRegion(filterMapEvents(events, filters), country, region))` — giữ tất cả |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Khi `region !== ALL_REGIONS`: sau khi lọc country/region, **chỉ giữ đúng 1 sự kiện mới nhất**
     (UTC `event_time` lớn nhất; tie → `source_event_id` để ổn định), focus bản đồ vào sự kiện đó.
     Khi không lọc region: giữ nguyên hành vi cũ (nhiều marker).
  2. Mỗi khi có dữ liệu mới (SSE `ingestion_cycle_completed`/`earthquake_detected`/`alert` **hoặc** timer 5 phút):
     **fetch lại với `params` đang có `country`/`region`**, thay thế toàn bộ `events` bằng kết quả API
     (xoá marker SSE thô), rồi áp lọc + rule "1 trận mới nhất" ở trên.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi BE, contract, migration, SSE protocol, tile/Leaflet.
  - Không đổi header countdown/combobox, parser URL, logic lọc của `/earthquakes`, `/overview`.
  - Không xoá helper/props cũ (I2); không xoá test đang pass (I7).
  - Không commit/push/merge ở proposal này; không đụng working tree timezone.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm hàm thuần + state, giữ chữ ký/props cũ. FE/T7 (I1), UTC/WGS84 không đổi (I3),
không mock (I5), test offline (I7).

### 4.1. Hàm thuần chọn trận mới nhất
- `monitoring-view.ts`: thêm `latestEventInRegion(events, country, region): MapEarthquake[]` —
  - nếu `region === ALL_REGIONS` → trả `[...events]` (giữ cũ);
  - nếu có region → lọc `country`/`region` (dùng `countryOf`/`regionOf` hoặc `regionFromPlace` từ `place`),
    sort theo `event_time` UTC giảm, tie theo `source_event_id`, trả `[events[0]]` hoặc `[]`.
  - Xử lý timestamp hỏng → cuối danh sách; không ném lỗi.

### 4.2. Áp dụng trong trang
- `MonitoringMapPage.tsx`: `visibleEvents = latestEventInRegion(sortEventsByTimeDesc(filterByCountryAndRegion(...)), country, region)`.
- `focus`: khi có selection, lấy toạ độ của **đúng sự kiện đã chọn** (`visibleEvents[0]`), không phải `response.data[0]` thô.

### 4.3. Làm mới 5 phút có lọc
- Đưa refresh vào **một nguồn duy nhất**: state `refreshVersion` tăng khi `sseRefreshKey` đổi **hoặc** timer 5 phút chạy.
- Effect `useEffect(() => { void load(true); }, [refreshVersion])` — `load` đọc `params` mới nhất (có `country`/`region`).
- Khi `country`/`region` đổi: tăng `refreshVersion` (fetch ngay với filter mới) thay vì chỉ set state.
- `load(true)` luôn `setEvents(result.data.map(toMapEarthquake))` → **thay thế** marker SSE thô; bỏ nhánh `applySseEvent`
  chèn trực tiếp vào `events` khi đang có refresh (giữ hàm thuần `applySseEvent` cho caller/test cũ — I2).
- Giữ SSE reconnect của header (`CompactRefreshCountdown`) — timer của trang vẫn là lưới an toàn.

### 4.4. Test (đồng thời khi §9 Approved — I7)
- `apps/web/tests/monitoring-region-map.test.ts` (bổ sung): thuần —
  `latestEventInRegion` với region → đúng 1 event mới nhất; timestamp hỏng → cuối; `ALL_REGIONS` → giữ nguyên;
  structural: `MonitoringMapPage` dùng `refreshVersion`, fetch theo `params` có country/region, `visibleEvents` dùng helper.
- `apps/web/tests/monitoring-map-ux.test.ts`: bổ sung assertion refresh theo filter (không xoá test cũ).
- Lệnh: `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Chỉ cắt FE ở `visibleEvents` (slice(0,1))
Ưu: 1 dòng. Nhược: không đảm bảo đúng event mới nhất nếu BE sort khác, không xử lý tie/timestamp hỏng, không sửa refresh. **Không chọn.**

### B (chọn): Hàm thuần chọn latest + refresh version duy nhất
Ưu: đúng ngữ nghĩa UTC, ổn định, một nguồn refresh, marker SSE thô không lọt qua filter. Nhược: sửa vài dòng page + test. **Chọn.**

### C: Đổi BE trả `limit=1` khi có region
Ưu: ít FE. Nhược: mất các marker khác của bản đồ khi cùng region (nếu sau này cần), đụng BE/contract — vượt phạm vi. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp–trung bình | 1 hàm thuần + 1 state + 2 effect |
| Hiệu năng | Giảm nhẹ | Refresh vẫn 5 phút + SSE, không fetch thêm |
| Bảo trì / Open-Closed | Tốt | Giữ hàm/props cũ, thêm helper |
| Độ tin cậy | Tốt | Marker luôn đến từ API đã lọc; 1 event mới nhất rõ ràng |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Refresh version tăng 2 lần (SSE + timer) → fetch thừa | Trung bình | Thấp | `abortRef` huỷ request cũ; `load(true)` không nháy loading |
| SSE marker thô bị mất khi refresh | Cao | Thấp | Đó là ý đồ: API trả dữ liệu đã lọc đầy đủ hơn |
| Working tree timezone chặn nhánh/commit | Cao | Trung bình | Stage patch riêng như các task trước |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-monitoring-region-latest-refresh-thien.md`
- **Code test offline:** bổ sung `apps/web/tests/monitoring-region-map.test.ts`, `apps/web/tests/monitoring-map-ux.test.ts`
- **Cách kiểm chứng:** `pnpm build && pnpm test`; `notes_index.py --check`; tay: chọn khu vực → 1 marker mới nhất; đợi chu kỳ 5 phút / bắn SSE → marker cập nhật và vẫn đúng khu vực.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận rõ trong chat 2026-11-24: "Approved", sau khi chọn ý "1 trận mới nhất trong khu vực" cho yêu cầu 1. Duyệt toàn bộ §4: hàm thuần `latestEventInRegion`, refreshVersion thống nhất (SSE + timer 5 phút + đổi filter), fetch lại theo params có country/region và thay thế marker SSE thô. Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9. Sau `Approved`: rẽ nhánh `fix/2026-11-24-monitoring-region-latest-refresh-thien` (dirty tree timezone), sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, implement, test, validation, dừng **CHECKPOINT 1**.
