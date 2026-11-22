/**
 * Adapter provider cho panel lọc khu vực — nguồn thật `GET /api/v1/clusters`.
 *
 * File giữ tên cũ để không xóa file đang tồn tại (RULE-03), nhưng **không còn mock**:
 * dữ liệu lấy qua `getClustersOptional()` (đã fallback `/patterns` khi 404 — RD-15)
 * và được gom bởi `buildRegionClusterRows()` dùng `event_count` thật (GAP-01).
 * 404 / rỗng → `[]` (I5 — không thay bằng dữ liệu giả).
 */

import { getClustersOptional } from "../../services/earthquake-api.ts";
import { buildRegionClusterRows, type RegionClusterRow } from "./region-clusters.ts";

export async function fetchRegionClusters(
  signal?: AbortSignal,
): Promise<RegionClusterRow[]> {
  const result = await getClustersOptional(signal);
  const clusters = result.data?.data?.clusters ?? [];
  return buildRegionClusterRows(clusters);
}
