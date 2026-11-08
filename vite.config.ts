import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [".e2b.app"],
    watch: {
      ignored: ["**/ios/**", "**/android/**"],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [".e2b.app"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
