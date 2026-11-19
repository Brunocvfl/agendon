import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagem Docker da VPS: `.next/standalone` com só o necessário para rodar (`node server.js`).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
