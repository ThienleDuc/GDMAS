# Proposal: Xếp hạng từ sự kiện thật, gom lọc quốc gia về header, tile bản đồ cùng origin

## Metadata
- ID: 2026-11-23-overview-ranking-map-ux-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: feature
- Status: approved
- Priority: high
- Area: apps/web/src/features/overview/, apps/web/src/components/map/, apps/web/src/features/monitoring/, apps/web/vite.config.ts
- Architecture Impact: docs/api/API.md — không đổi payload; `apps/web/vite.config.ts` bổ sung proxy `/tile` (dev only). Không đổi `contracts/`.
- Related Docs:
  - docs/coding-rules.md
  - docs/api/API.md
- Related Proposals:
  - Overrides: 2026-11-21-overview-dashboard-thien — **chỉ riêng** lựa chọn "nguồn ranking FE-only từ `/clusters`". Lý do: `clustering_results = 0` → ranking luôn rỗng; chuyển sang dữ liệu sự kiện/catalog thật (có `country`/`region`). Không đụng phần còn lại (dashboard KPI, chart).
  - Overrides: 2026-11-22-be-country-region-derivation-thien — **chỉ riêng** cụm "combo quốc gia trên bản đồ dùng catalog" tại Revision 2026-11-23. Lý do: trùng với combobox quốc gia trên header; gom về một nguồn (`useCatalogSelection`). Phần header/catalog API giữ nguyên.
  - Liên quan: 2026-11-22-vite-same-origin-proxy-thien (đã proxy `/api`) — mở rộng cùng cơ chế cho `/tile`.
- Related Bugs: none

---

## 1. Vấn đề
Người dùng báo 3 vấn đề (2026-11-23):
1. Trang Tổng quan **không có xếp hạng** theo quốc gia/khu vực.
2. Cụm địa chấn **không có dữ liệu**.
3. Bản đồ giám sát **không tải được bản đồ**; muốn **bỏ combobox quốc gia trong `MapRegionPanel`**, dùng quốc gia từ combobox trên header.

Kiểm chứng: `clustering_results = 0 row`, `/patterns.clustering_summary = null` → `/clusters` trả empty → ranking `[]`. Tile CARTO trả 200 từ server nhưng có thể bị chặn ở client (cùng bản chất lỗi `localhost:8000` trước đó).

---

## 2. Hiện trạng
- `overview-view.ts`: `rankCountries`/`rankRegionsForCountry` chỉ đọc `ClustersResponse.domestic_place` → rỗng khi không có cụm.
- `useOverviewData` lấy `clusters` qua `getClustersOptional` (fallback `/patterns` chỉ khi 404, mà `/clusters` trả 200-empty).
- `MapRegionPanel` có combobox quốc gia riêng (`countries` prop, `countryQuery`, `countryOpen`, `countryCounts`) trùng header.
- `SeismicMap.tsx` dùng `TILE_URL = https://{s}.basemaps.cartocdn.com/dark_all/...` (cross-origin tuyệt đối).

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Xếp hạng Overview lấy từ **dữ liệu sự kiện/catalog thật**: `GET /earthquakes/countries` và `/regions?country=` → `RankRow` (`avgMagnitude`/`maxMagnitude = null`, không bịa). Giữ nguyên chữ ký `rankCountries`/`rankRegionsForCountry` và fallback cũ khi catalog rỗng (I2).
  2. Bỏ combobox quốc gia trong `MapRegionPanel`; quốc gia lấy từ `useCatalogSelection` (header/URL). Giữ `country` prop và danh sách khu vực (I2).
  3. Proxy tile qua Vite dev server `/tile` → `https://a.basemaps.cartocdn.com`, dùng URL tương đối trong `SeismicMap` → trình duyệt chỉ cần cùng origin (chặn CARTO ở client vẫn có bản đồ).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Implement T4 DBSCAN thật / seed cụm (proposal riêng — `docs/task/van.md`). Không bật lại mock (I5).
  - Đổi response contract, migration, SSE, worker.

---

## 4. Giải pháp đề xuất
1. `overview-view.ts`: thêm `rankFromCountryCatalog(payload)` / `rankFromRegionCatalog(payload)` thuần → `RankRow[]` (`clusterIds: []`, avg/max `null`).
2. `useOverviewData`: gọi `getCountryCatalog()` / `getRegionCatalog(country)` (đã có), trả `countryRanking`/`regionRanking`; `OverviewPage` ưu tiên ranking catalog, fallback `rankRegionsForCountry(clusters, country)`.
3. `MapRegionPanel`: đổi `countries`/`onCountryChange` thành optional, xoá state/memo/JSX combobox; `MonitoringMapPage` bỏ fetch `getCountryCatalog`/`countries` memo/`handleCountryChange` và 2 prop.
4. `vite.config.ts`: `server.proxy["/tile"] = { target: "https://a.basemaps.cartocdn.com", changeOrigin: true, rewrite: path => path.replace(/^\/tile/, "") }`; `SeismicMap` dùng `/tile/dark_all/{z}/{x}/{y}{r}.png`. Giữ attribution & `tileerror`.

Tuân **I2** (giữ chữ ký/props cũ), **I5** (không mock), **I7** (test offline), **I3** (URL tile không phải payload hợp đồng).

---

## 5. Phương án đã cân nhắc
### A: Chạy demo_seeder để có cụm
Ưu: nhanh. Nhược: cụm hardcode/mock, vi phạm I5. **Không chọn.**
### B: Chờ T4 DBSCAN thật rồi ranking từ cụm
Ưu: đúng kiến trúc. Nhược: ranking vẫn rỗng đến khi T4 xong. **Không chọn cho proposal này** (tách riêng).
### C: Ranking từ catalog sự kiện thật + proxy tile + gom lọc
Ưu: có số thật ngay, không mock, tile hết chặn client. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 3 FE concerns + 1 config |
| Hiệu năng | Tốt | Catalog endpoint nhẹ (GROUP BY có index) |
| Open-Closed | Tốt | Thêm hàm/props optional, không xoá cũ |
| Độ tin cậy | Trung bình | Catalog chỉ có count, avg/max để null (trung thực) |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|
| Catalog rỗng | Thấp | Fallback ranking cũ từ clusters |
| Tile proxy lỗi ở production build | Trung bình | `server.proxy` chỉ `apply: serve`; production dùng URL tuyệt đối qua biến (giữ nguyên nếu cần) |
| Test khóa combobox panel | Thấp | Đã kiểm tra: không test nào soi JSX panel |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase:** `.agents/notes/testcase/2026-11-23-overview-ranking-map-ux-thien.md`
- **Code test:** `apps/web/tests/overview-ranking-catalog.test.ts` *(mới)* + `apps/web/tests/map-tile-proxy.test.ts` *(mới)*
- **Lệnh:** `cd apps/web && pnpm test && pnpm build`; curl `/api/v1/earthquakes/countries`; curl tile qua `/tile/...`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng báo 3 vấn đề và chọn "commit nhánh hiện tại, rồi làm 3 fix ở proposal riêng" — chấp thuận `Overrides:` cho 2 quyết định cũ nêu trên, giới hạn đúng phạm vi FE/catalog/proxy. T4 DBSCAN tách proposal riêng.
Scope of Rejection: -

---

## 10. Next Action
§9 Approved → build-implementation: tạo đồng thời implemented/<id>/{plan,status}.md + testcase, code, validation, CHECKPOINT 1.
