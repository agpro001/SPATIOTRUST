// Vercel-only Vite config: builds the project as a static SPA (no SSR, no
// Cloudflare Worker). The default `vite.config.ts` still drives the
// Lovable/Cloudflare build — this one is invoked explicitly by
// `vercel.json` -> buildCommand.
import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          tanstack: ["@tanstack/react-router", "@tanstack/react-query", "@tanstack/react-start"],
          motion: ["framer-motion"],
          three: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
          charts: ["recharts"],
          pdf: ["pdfjs-dist"],
        },
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
