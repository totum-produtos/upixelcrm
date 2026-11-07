import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      include: ["src/lib/**", "src/services/**", "src/hooks/**"],
      // Ratchet (Plano BuildOps, Fase 3): só pode subir. Medido em 2026-11-07:
      // linhas 38,55%, funções 66,96%, branches 86,49%. Ao subir a cobertura,
      // suba estes números junto.
      thresholds: { lines: 38, statements: 38, functions: 65, branches: 85 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
