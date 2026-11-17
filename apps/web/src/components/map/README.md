# GIS Map Components (`apps/web/src/components/map/`)

Thư mục chứa các component bản đồ GIS địa chấn dùng thư viện `react-leaflet` trên nền bản đồ Dark Mode (CARTO `dark_all`), phục vụ Terminal 7 (Frontend) và kịch bản Demo 6 bước.

## Danh mục tệp

- `types.ts`: Kiểu dữ liệu thuần (`MapEarthquake`, `MapCluster`, `MapFilters`, `MapViewState`, `MapBounds`, `MapBoundingBox`, `MarkerStyle`). Không phụ thuộc `leaflet` để chạy được trong unit test.
- `map-data.ts`: Hàm tính toán thuần (pure functions) cho toạ độ WGS84, bán kính/màu sắc marker theo magnitude, độ mờ theo depth, chuẩn hoá cụm DBSCAN (chấp nhận cả canonical lẫn legacy alias), haversine và bounding box.
- `SeismicMap.tsx`: Khung bản đồ nền Leaflet Dark Mode, `preferCanvas`, `ZoomControl` góc phải, lắng nghe `moveend`/`zoomend` để báo toạ độ/zoom thật cho HUD.
- `EarthquakeMarkerLayer.tsx`: Lớp vẽ `CircleMarker` cho từng trận động đất, tooltip nhanh và Popup chi tiết.
- `ClusterLayer.tsx`: Lớp vẽ vòng tròn vùng cụm địa chấn DBSCAN với bán kính `radiusKm` và thông tin số lượng sự kiện, độ lớn trung bình/lớn nhất.
- `MapFilterPanel.tsx`: Thanh điều khiển bộ lọc: slider magnitude (debounce 400ms), preset khoảng thời gian (24h/7d/30d/all), công tắc cụm DBSCAN, nút đặt lại.
- `MapLegend.tsx`: Chú giải thang màu độ lớn (≥6 đỏ, ≥5 cam, ≥4 vàng, <4 cyan), độ sâu chấn tiêu và vùng cụm.
- `MapPopupCard.tsx`: Thẻ hiển thị chi tiết sự kiện động đất dùng trong Leaflet Popup hoặc panel thông tin.
- `index.ts`: Barrel export.
