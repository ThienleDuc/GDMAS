/**
 * Nguồn cấu hình tile bản đồ — thuần, không import leaflet (I7).
 * Mặc định dùng đường dẫn cùng origin `/tile` (Vite dev/preview proxy, nginx production).
 * Vite/nginx chuyển `/tile/{z}/{x}/{y}.png` tới OSM DE — tile miễn phí, KHÔNG cần API key.
 * (CARTO basemap hiện trả ảnh "API KEY REQUIRED" dù HTTP 200 → không dùng nữa.)
 * Có thể đổi nguồn qua VITE_MAP_TILE_URL mà không sửa code (I2/I6).
 */

export const DEFAULT_TILE_URL = "/tile/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface TileUrlEnv {
  VITE_MAP_TILE_URL?: string;
  /** Cho phép truyền trực tiếp `import.meta.env` (có index signature từ Vite). */
  [key: string]: unknown;
}

/** Trả URL tile đã cấu hình, hoặc mặc định cùng origin khi biến rỗng/không đặt. */
export function resolveTileUrl(env: TileUrlEnv = {}): string {
  const custom = env.VITE_MAP_TILE_URL;
  return typeof custom === "string" && custom.trim() ? custom.trim() : DEFAULT_TILE_URL;
}
