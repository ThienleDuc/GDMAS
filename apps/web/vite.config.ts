import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Agent } from "node:https";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from "vite";
import { isContractMockEnabled, resolveContractMock } from "./dev-mock.ts";
import { resolveExamplesDir } from "./contract-paths.ts";
import path from "path";

/**
 * Dùng chung cho dev server và preview để tile luôn cùng origin.
 * OSM DE: tile thật, không cần API key (CARTO giờ trả ảnh "API KEY REQUIRED").
 */
const tileAgent = new Agent({ family: 4, keepAlive: true });
const tileProxy: ProxyOptions = {
  target: "https://tile.openstreetmap.de",
  changeOrigin: true,
  // DNS trả IPv6 trước nhưng container Docker không ra được IPv6 → ETIMEDOUT chập chờn.
  agent: tileAgent,
  headers: { "User-Agent": "GDMAS/1.0 (https://github.com/ThienleDuc/GDMAS)" },
  rewrite: (tilePath: string) => tilePath.replace(/^\/tile/u, ""),
};

function contractMockPlugin(enabled: boolean): Plugin {
  return {
    name: "gdmas-contract-mock",
    apply: "serve",
    configureServer(server) {
      if (!enabled) return;
      const examplesDir = resolveExamplesDir(import.meta.dirname);
      const readFixture = (filename: string): unknown =>
        JSON.parse(readFileSync(resolve(examplesDir, filename), "utf8"));

      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const mock = resolveContractMock(request.method ?? "GET", url.pathname, readFixture, url.search);
        if (!mock) {
          next();
          return;
        }

        response.statusCode = mock.status;
        for (const [name, value] of Object.entries(mock.headers)) response.setHeader(name, value);
        response.end(mock.body);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const resolvedEnv = { ...process.env, ...env };
  const mockEnabled = isContractMockEnabled(resolvedEnv);
  // Khi đặt, FE gọi /api/... cùng origin và Vite chuyển tiếp tới backend.
  // Trong Docker dùng http://api:8000 (service name trên gdmas-net).
  const apiProxyTarget = resolvedEnv.VITE_API_PROXY_TARGET;

  return {
    plugins: [contractMockPlugin(mockEnabled), tailwindcss(), react()],
    define: mockEnabled
      ? { "import.meta.env.VITE_API_BASE_URL": "window.location.origin" }
      : {},
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: true,
      // Opt-in: dev mock (apply: "serve") chặn trước, còn lại đi qua proxy →
      // trình duyệt chỉ cần một origin, không còn CORS tới localhost:8000.
      // /tile: đưa tile OSM về cùng origin để trình duyệt không cần gọi CDN (không cần API key).
      proxy: {
        ...(apiProxyTarget
          ? {
              "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
                // SSE là kết nối dài: không để proxy tự đóng khi reload/build lại.
                proxyTimeout: 0,
                timeout: 0,
                xfwd: true,
              },
            }
          : {}),
        "/tile": tileProxy,
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
    // `vite preview` phục vụ bản build — cần cùng proxy /tile như dev để bản đồ không trắng.
    preview: {
      proxy: {
        "/tile": tileProxy,
      },
    },
  };
});
