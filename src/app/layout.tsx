import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgendOn",
  description: "Agendamento online para salões de beleza.",
};

// Cor da barra do navegador no celular = fundo da página (o painel troca pelo azul noite).
export const viewport: Viewport = { themeColor: "#f7f8fc" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Primeiro item do Tab: pula cabeçalho e menu. Todo <main> tem id="conteudo". */}
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-xl bg-on px-4 py-2.5 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
