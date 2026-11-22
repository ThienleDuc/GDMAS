import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { isContractMockEnabled, resolveContractMock } from "./dev-mock.ts";
import { resolveExamplesDir } from "./contract-paths.ts";
import path from "path";

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
      // /tile: đưa tile CARTO về cùng origin để trình duyệt chặn CDN vẫn có bản đồ.
      proxy: {
        ...(apiProxyTarget ? { "/api": { target: apiProxyTarget, changeOrigin: true } } : {}),
        "/tile": {
          target: "https://a.basemaps.cartocdn.com",
          changeOrigin: true,
          rewrite: (tilePath: string) => tilePath.replace(/^\/tile/u, ""),
        },
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  };
});
