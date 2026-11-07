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
      // Fase 1 do plano BuildOps: só medir. Threshold entra na Fase 3 (ratchet).
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
