/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  plugins: [preact()],
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["./src/test-setup.ts"] },
});
