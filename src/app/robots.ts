import type { MetadataRoute } from "next";

// Buscadores: o site e as páginas públicas dos salões podem ser indexados; o painel e as rotas de conta, não.
// Sem este arquivo, /robots.txt caía na rota [slug] e respondia uma página HTML.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/api/", "/auth/", "/convite", "/criar-salao", "/nova-senha"],
    },
    sitemap: "https://agendon.app.br/sitemap.xml",
  };
}
