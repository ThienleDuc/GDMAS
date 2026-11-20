import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { isContractMockEnabled, resolveContractMock } from "./dev-mock.ts";
import path from "path";

function contractMockPlugin(enabled: boolean): Plugin {
  return {
    name: "gdmas-contract-mock",
    apply: "serve",
    configureServer(server) {
      if (!enabled) return;
      const examplesDir = resolve(import.meta.dirname, "../../contracts/examples");
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
  const mockEnabled = isContractMockEnabled({ ...process.env, ...env });

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
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  };
});
