import { CampoImagem } from "@/components/campo-imagem";
import { removerLogo, salvarLogo } from "./actions";

/** Logo do salão (bucket `logos`, pasta = id do salão; só o Dono(a) grava). */
export function CampoLogo({ salaoId, nome, logoUrl }: { salaoId: string; nome: string; logoUrl: string | null }) {
  return (
    <CampoImagem
      bucket="logos"
      pasta={salaoId}
      prefixo="logo"
      salvar={salvarLogo}
      remover={removerLogo}
      url={logoUrl}
      nome={nome}
      titulo="Logo do salão"
      descricao="Aparece na página de agendamento. PNG, JPG ou WebP, até 1 MB; de preferência quadrada."
      rotulo="logo"
    />
  );
}
