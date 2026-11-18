// Foto do profissional no Storage (bucket público `fotos`, pasta = id do salão; mesmos limites da
// logo: até 1 MB, PNG, JPEG ou WebP). Serve no servidor e no navegador.
import { supabaseEnv } from "@/lib/supabase/env";

/** URL pública da foto a partir de professionals.foto_path. */
export function urlDaFoto(caminho: string | null | undefined): string | null {
  return caminho ? `${supabaseEnv().url}/storage/v1/object/public/fotos/${caminho}` : null;
}

/** Prefixo do arquivo de um profissional (o componente acrescenta "-<agora>.<ext>"). */
export const prefixoDaFoto = (profissionalId: string) => `prof-${profissionalId}`;

/** O caminho é de uma foto deste profissional, no formato que o app gera? */
export function ehCaminhoDeFoto(salaoId: string, profissionalId: string, caminho: string): boolean {
  return new RegExp(`^${salaoId}/${prefixoDaFoto(profissionalId)}-\\d{10,}\\.(png|jpg|webp)$`).test(caminho);
}
