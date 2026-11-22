import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Fixture dùng để nhận diện thư mục `contracts/examples` hợp lệ. */
export const SSE_FIXTURE_NAME = "sse-event_sample.json";

/**
 * Tìm thư mục chứa fixture hợp đồng (`contracts/examples`) dựa trên vị trí của
 * `vite.config.ts`.
 *
 * - Local monorepo: `<repo>/apps/web` → `../../contracts/examples`.
 * - Docker dev: `WORKDIR /app` chính là `apps/web`, nên `contracts/` được mount
 *   ở `/app/contracts` (→ `./contracts/examples`) hoặc `/contracts`
 *   (→ `../../contracts/examples`, clamp tại root).
 *
 * Trả về candidate đầu tiên chứa fixture. Nếu không có, trả candidate đầu để
 * thông báo `ENOENT` vẫn chỉ đúng đường dẫn dự kiến.
 */
export function resolveExamplesDir(configDir: string, fixtureExists: (path: string) => boolean = existsSync): string {
  const candidates = [
    resolve(configDir, "../../contracts/examples"), // local monorepo + docker mount /contracts
    resolve(configDir, "contracts/examples"), // docker mount /app/contracts
    resolve(configDir, "../contracts/examples"), // bố cục phẳng
  ];
  return candidates.find((dir) => fixtureExists(resolve(dir, SSE_FIXTURE_NAME))) ?? candidates[0];
}
