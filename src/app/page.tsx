import Image from "next/image";
import { BotaoLink } from "@/components/ui";

// Página inicial provisória. A landing page de verdade vem depois do MVP.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Image src="/logo-agendon.png" alt="AgendOn" width={4092} height={1230} priority className="h-auto w-64" />
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold sm:text-3xl">Agenda online para o seu salão</h1>
        <p className="mt-3 text-noite/65">
          Seus clientes agendam pelo link, recebem confirmação e lembrete no WhatsApp, e você acompanha tudo no painel.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <BotaoLink href="/cadastro" className="px-6">
          Cadastrar meu salão
        </BotaoLink>
        <BotaoLink href="/entrar" variante="secundario" className="px-6">
          Entrar
        </BotaoLink>
      </div>
    </main>
  );
}
