import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // 配信先のパス接頭辞を持たない。サイトのどの位置へ置いても動くようにして、
  // portal の URL を配信側の都合で決められる状態にする。
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // アプリ本体のソースを直接参照する。design-system の部品が内部で使う `@/` も
      // この alias で解決される。
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
