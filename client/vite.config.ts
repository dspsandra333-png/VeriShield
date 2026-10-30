import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["recharts", "lucide-react", "axios", "react-router-dom"],
  },
  server: {
    port: 5185,
    strictPort: true,
    fs: {
      allow: [".."],
    },
  },
  test: {
    environment: "node",
  },
});

