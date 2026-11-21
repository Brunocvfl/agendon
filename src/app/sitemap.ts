import type { MetadataRoute } from "next";

// Páginas do site institucional. As páginas dos salões ficam fora: cada salão divulga o próprio link.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://agendon.app.br";
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/cadastro`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/contato`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
