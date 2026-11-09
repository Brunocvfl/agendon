// Logo do salão no Storage (bucket público `logos`, pasta = id do salão). Serve no servidor e no navegador.
// Os limites espelham o bucket (migration dados_salao): até 1 MB, PNG, JPEG ou WebP.
import { supabaseEnv } from "@/lib/supabase/env";

export const LIMITES_LOGO = {
  bytes: 1024 * 1024,
  tipos: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>,
} as const;

/** URL pública da logo a partir do caminho gravado em salons.logo_path. */
export function urlDaLogo(caminho: string): string {
  return `${supabaseEnv().url}/storage/v1/object/public/logos/${caminho}`;
}

/** Mensagem de erro para o arquivo escolhido, ou null se ele serve. */
export function erroDaLogo(arquivo: { type: string; size: number }): string | null {
  if (!(arquivo.type in LIMITES_LOGO.tipos)) return "Use uma imagem PNG, JPG ou WebP.";
  if (arquivo.size > LIMITES_LOGO.bytes) return "A imagem pode ter até 1 MB.";
  return null;
}

/** Caminho novo para a logo (nome único: troca de logo não esbarra no cache do navegador). */
export function caminhoDaLogo(salaoId: string, tipo: string, agora = Date.now()): string {
  return `${salaoId}/logo-${agora}.${LIMITES_LOGO.tipos[tipo]}`;
}

/** O caminho é de uma logo deste salão, no formato que o app gera? */
export function ehCaminhoDeLogo(salaoId: string, caminho: string): boolean {
  return new RegExp(`^${salaoId}/logo-\\d{10,}\\.(png|jpg|webp)$`).test(caminho);
}
