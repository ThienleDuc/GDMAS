/**
 * MOCK — giả lập kết quả phân cụm theo quốc gia/khu vực cho panel lọc (theo yêu cầu).
 * CHÚ Ý: đây là dữ liệu mô phỏng, KHÔNG thay thế API sự kiện thật. Khi BE bổ sung
 * `dominant_place` cho `/api/v1/clusters` (BUG B2), chỉ cần đổi `fetchRegionClusters`
 * sang gọi service thật — UI và kiểu `RegionClusterRow` giữ nguyên.
 */

import { buildRegionClusters, type RegionClusterRow } from "./region-clusters.ts";

const MOCK_SOURCES: ReadonlyArray<{ place: string; count: number; magnitude: number }> = [
  { place: "Off the east coast of Honshu, Japan", count: 21, magnitude: 5.6 },
  { place: "Northern Sumatra, Indonesia", count: 15, magnitude: 5.2 },
  { place: "Central California, USA", count: 12, magnitude: 4.3 },
  { place: "Southern Chile", count: 8, magnitude: 5.4 },
  { place: "Near the coast of Central Peru", count: 7, magnitude: 4.7 },
  { place: "Western Turkey", count: 6, magnitude: 4.9 },
  { place: "Tonga Region", count: 5, magnitude: 6.0 },
  { place: "Iceland", count: 4, magnitude: 4.5 },
];

/** Trả danh sách cụm mô phỏng (cùng shape với dữ liệu sẽ có từ BE). */
export function getMockRegionClusters(): RegionClusterRow[] {
  const items = MOCK_SOURCES.flatMap(({ place, count, magnitude }) =>
    Array.from({ length: count }, (_, index) => ({
      place,
      magnitude: Number((magnitude + ((index % 5) - 2) * 0.1).toFixed(1)),
    })),
  );
  return buildRegionClusters(items);
}

/** Điểm nối duy nhất để sau này thay bằng `getClusters()` thật. */
export async function fetchRegionClusters(): Promise<RegionClusterRow[]> {
  return getMockRegionClusters();
}
