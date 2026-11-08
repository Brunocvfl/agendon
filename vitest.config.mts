import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de unidade dos módulos puros (src/**/*.test.ts). Os testes de banco ficam no pgTAP.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
