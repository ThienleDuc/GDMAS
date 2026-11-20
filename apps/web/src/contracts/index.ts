/**
 * Data Contracts giữa Backend FastAPI và Frontend React (Terminal 7).
 *
 * Barrel tương thích ngược: mọi import cũ dạng `from "../contracts"` hoặc
 * `from "../contracts/index.ts"` vẫn hoạt động. Nguồn sự thật là các file theo
 * schema trong cùng thư mục; `contracts/schemas/` và `docs/api/API.md` là nguồn
 * sự thật ở cấp repo.
 *
 * Quy ước (I3): timestamp UTC ISO 8601 (`Z`), toạ độ WGS84. Endpoint chưa có trên
 * BE trả 404 → `getOptionalApi()` trả `unavailable: true`, không thay bằng mock.
 */

export * from "./common.ts";
export * from "./sse.ts";
export * from "./earthquake.ts";
export * from "./health.ts";
export * from "./system-status.ts";
export * from "./clusters.ts";
export * from "./analysis.ts";
export * from "./patterns.ts";
export * from "./predictions.ts";
export * from "./classifications.ts";
