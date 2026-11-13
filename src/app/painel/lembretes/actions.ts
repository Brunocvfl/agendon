"use server";

import { acaoDoPainel, texto, type EstadoForm } from "@/lib/acao";
import { lerLembrete } from "@/lib/regras/lembrete";

export type { EstadoForm };

export const salvarLembrete = acaoDoPainel({
  permissao: "editar-lembretes",
  devolver: ["lembrete_horas"],
  ler: (fd) => lerLembrete(texto(fd, "lembrete_horas")),
  executar: (dados, { supabase, vinculo }) => supabase.from("salons").update(dados).eq("id", vinculo.salao.id),
  depois: { ok: "Lembrete salvo." },
});
