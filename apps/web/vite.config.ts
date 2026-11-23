import { Agent } from "node:https";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const resolvedEnv = { ...process.env, ...env };
  // FE gọi /api/... cùng origin, Vite chuyển tiếp tới backend thật.
  // Trong Docker dùng http://api:8000 (service name trên gdmas-net).
  const apiProxyTarget = resolvedEnv.VITE_API_PROXY_TARGET;

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: true,
      // FE chỉ cần một origin: /api đi qua proxy tới BE, /tile đưa tile OSM về cùng origin.
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
