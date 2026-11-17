import type { MetadataRoute } from "next";

// App instalável pelo navegador ("Instalar app" / "Adicionar à tela de início"). Abre no painel do salão.
// Ícones em public/app: "any" = símbolo com cantos arredondados; "maskable" = fundo azul inteiro e o
// símbolo na zona segura (o Android recorta no formato do aparelho). iPhone usa src/app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/painel",
    name: "AgendOn",
    short_name: "AgendOn",
    description: "Agendamento online para salões de beleza.",
    lang: "pt-BR",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#0F1B4D",
    icons: [
      { src: "/app/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app/icone-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/app/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
