# Implementation Status: Khu vực giám sát tổng hợp từ USGS & sửa lỗi bản đồ không hiển thị

## Metadata
- ID: 2026-11-23-monitoring-region-map-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 5 — validation xong sau Revision 4 fix UX, chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved (Reviewer: thien) + Revision 2026-11-23 (4 fix UX theo chỉ thị "sửa thêm")
- Nhánh `fix/2026-11-23-monitoring-region-map-thien` rẽ từ `develop`
- Artifacts sinh đồng thời: `plan.md`, `status.md`, `testcase/<id>.md`
- Step 3: `MapEarthquake.country/region` pass-through; `region-catalog-view.ts`; panel lấy dữ liệu từ sự kiện USGS
- Step 4: tile cùng origin (`tile-url.ts`, Vite dev/preview, nginx `/tile`, `.env.example`, `docs/setup.md`)
- Revision: (1) z-index header/dropdown cao hơn pane Leaflet; (2) select quốc gia trong trang bản đồ; (3) bản đồ thế giới offline `world-countries.geo.json` + `WorldFallbackLayer` + `fitWorld()`; (4) fit chiều cao `layout__content--map`, bỏ scroll page
- Revision 2 (nguyên nhân thật): CARTO trả ảnh "API KEY REQUIRED" (200 nhưng ~2 KB) → đổi sang tile OSM DE qua proxy `/tile`, ép IPv4 bằng `https.Agent({family:4})`, giữ Dark Mode bằng CSS filter trên `.leaflet-tile-pane`; kiểm chứng trong container Docker 8/8 tile trả 200 (~47 KB)
- Revision 3 (theo yêu dùng): bản đồ nền trắng (bỏ filter đảo màu, nền `#f8fafc`, popup chữ tối); thông báo rỗng theo ngữ cảnh qua prop `hasEvents` của `MapEmptyOverlay` (ngoại lệ I5 có chủ đích theo chỉ thị người dùng)
- Revision 4 (tốc độ): GeoJSON 173 KB tải on-demand khi tile lỗi + cache promise; TileLayer `updateWhenIdle`/`updateWhenZooming=false`/`keepBuffer=2`; defer `/clusters` sau khi sự kiện đầu nạp xong
- Revision 5 (lọc/USGS): bỏ combobox nội bộ, header là nguồn quốc gia duy nhất; thay panel bằng `EventListPanel` (M – địa điểm – độ sâu); đẩy `country`/`region` xuống BE qua `buildEarthquakeQuery(...,{realtime:true})`, bỏ preset thời gian; bỏ 2 request `/clusters` + `/regions` trong page. Kiểm chứng `?country=Japan` → 1.357 sự kiện
- Revision 6 (UI item/nút): item list 3 phần có `gap: var(--space-3)`; phần 1&3 `flex:0 0 auto` theo nội dung, phần 2 `flex:1`; có thời gian UTC, viền trái 2px, nút "Lọc" thay "Làm mới" (slider chỉ áp dụng khi bấm)
- Revision 7 (range magnitude): thêm slider "Độ lớn tối đa" 0–10, clamp min≤max, `maxMagnitude` optional trên `MapFilters`, đẩy `max_magnitude` xuống BE + lọc FE; curl `min=4&max=5` → 14.715 sự kiện
- Revision 8 (realtime/no-filter): bỏ MapControlsPanel khỏi page; ngưỡng M từ `BACKFILL_MIN_MAGNITUDE` qua docker-compose → `VITE_MAP_MIN_MAGNITUDE`; item cao 58px + bộ đếm; SSE `ingestion_cycle_completed` 5 phút gọi lại `load()` (guard dedupe). Cần `docker compose up -d --force-recreate web` để env có hiệu lực.
- Revision 9 (sort): `sort_by: "event_time"` desc + hàm thuần `sortEventsByTimeDesc` áp dụng sau lọc (cả SSE mới); timestamp hỏng xuống cuối
- Validation: `pnpm test` 317/317 PASS; `pnpm build` OK; `docker compose config` OK; `notes_index --check` OK; `git status` không có file bị xoá

In Progress:
- none — chờ người dùng quyết định tại CHECKPOINT 1

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` + `monitoring-region-map.test.ts` (7/7) + `monitoring-map-ux.test.ts` (5/5) |
| Test liên quan (`pnpm test`) | PASS | **312/312 PASS**; assertion cũ cập nhật additive (không xoá/skip test) |
| Lint / Build (`pnpm build`) | PASS | `tsc -b && vite build`, 2576 modules, OK |
| Notes check (`notes_index.py --check`) | PASS | OK |
| Tài liệu cập nhật | DONE | `docs/setup.md`, `apps/web/.env.example` |

---

## Known Issues
- none

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Gom khu vực từ sự kiện đã tải (USGS qua BE) thay vì thêm endpoint BE — không request mới, đúng cửa sổ đang xem.
- Tile mặc định cùng origin ở mọi môi trường; `VITE_MAP_TILE_URL` là công tắc dự phòng.
- Bổ sung bản đồ thế giới GeoJSON local dưới tilePane: bản đồ **luôn hiển thị** dù tile CARTO bị chặn — đáp ứng yêu cầu "bằng mọi cách hiển thị lên".
- Chưa chọn quốc gia/khu vực → `fitWorld()` + nạp dữ liệu toàn cục; có lựa chọn → focus sự kiện đầu tiên.
- Cập nhật (không xoá) assertion trong `map-tile-proxy.test.ts` và `layout-styles.test.ts` theo implementation mới.
- Bỏ CARTO (giờ yêu cầu API key, trả ảnh placeholder dù HTTP 200) → OSM DE. `https.Agent({family:4})` vì DNS trả IPv6 trước mà container Docker không ra IPv6.
- Bỏ filter tối: người dùng chọn nền bản đồ trắng để dễ đọc → ghi nhận ngoại lệ I5 có chủ đích, còn lại UI giữ Dark Mode.

---

## Next Actions
- CHECKPOINT 1: người dùng chọn `tiếp tục workflow` (commit + push + PR) / `dừng lại` / `sửa thêm`.

---

## Last Update
2026-11-23 — Hoàn tất Revision 4 fix UX, validation xanh, đặt `Status: validation`, dừng CHECKPOINT 1.
