"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { captchaValido } from "@/lib/captcha";
import { ehData } from "@/lib/datas";
import { ehUuid } from "@/lib/ids";
import { lerAgendamentoPublico } from "@/lib/regras/agendamento";
import { clientePublico } from "@/lib/supabase/publico";
import { processarFila } from "@/lib/whatsapp/enviar";
import { slugValido } from "./dados";

export type Confirmacao = { servico: string; profissional: string; inicio: string; fim: string; preco: number };

export type EstadoAgendamento = {
  erro?: string;
  erros?: Record<string, string>;
  /** O horário foi ocupado: a tela recarrega os horários do dia. */
  ocupado?: boolean;
  confirmacao?: Confirmacao;
  /** O que a pessoa digitou, para não perder depois de um erro. */
  campos?: { nome: string; telefone: string };
};

/** Horários livres de um dia (instantes ISO; a tela mostra no fuso do salão). */
export async function horariosDoDia(
  slug: string,
  servico: string,
  profissional: string | null,
  dia: string,
): Promise<string[]> {
  if (!slugValido(slug) || !ehUuid(servico) || (profissional !== null && !ehUuid(profissional)) || !ehData(dia)) {
    return [];
  }
  const supabase = await clientePublico();
  const { data, error } = await supabase.rpc("horarios_publicos", {
    p_slug: slug,
    p_service: servico,
    // O tipo gerado não aceita null, mas a função trata null como "qualquer profissional".
    p_professional: profissional as string,
    p_dia: dia,
  });
  if (error) throw new Error(`horarios_publicos falhou (${error.code})`);
  return data ?? [];
}

export async function agendar(_anterior: EstadoAgendamento, formData: FormData): Promise<EstadoAgendamento> {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  const slug = texto("slug");
  if (!slugValido(slug)) return { erro: "Salão não encontrado." };
  const campos = { nome: texto("nome").slice(0, 80), telefone: texto("telefone").slice(0, 30) };
  const falha = (e: EstadoAgendamento): EstadoAgendamento => ({ ...e, campos });

  const lido = lerAgendamentoPublico({
    servico: texto("servico"),
    profissional: texto("profissional"),
    dia: texto("dia"),
    hora: texto("hora"),
    nome: texto("nome"),
    telefone: texto("telefone"),
    optin: formData.get("optin") === "sim",
  });
  if (!lido.ok) return falha({ erros: lido.erros, erro: "Confira os campos destacados." });

  const ip = await ipDaRequisicao();
  if (!(await captchaValido(texto("cf-turnstile-response"), ip))) {
    return falha({ erro: "Não conseguimos confirmar que você não é um robô. Tente de novo." });
  }

  const a = lido.valor;
  const supabase = await clientePublico();
  const { data, error } = await supabase.rpc("agendar_publico", {
    p_slug: slug,
    p_service: a.servico,
    p_professional: a.profissional as string,
    p_inicio: a.inicio,
    p_nome: a.nome,
    p_telefone: a.telefone,
    p_optin: a.optin,
    // Só o hash do IP vai para o banco (limite de agendamentos por origem).
    p_origem: createHash("sha256").update(ip ?? "sem-ip").digest("hex"),
  });

  if (error) {
    switch (error.code) {
      case "23P01":
        return falha({ ocupado: true, erro: "Esse horário acabou de ser ocupado. Escolha outro." });
      case "P0001":
        return error.message === "muitas_tentativas"
          ? falha({ erro: "Muitos agendamentos feitos daqui em pouco tempo. Tente de novo daqui a uma hora." })
          : falha({ erro: "Você já tem 3 horários marcados neste salão. Para marcar outro, fale com o salão." });
      case "P0002":
        return falha({ erro: "Este salão não está recebendo agendamentos online." });
      case "22023":
        return error.message === "telefone_invalido"
          ? falha({ erros: { telefone: "Informe um WhatsApp válido, com DDD." }, erro: "Confira os campos destacados." })
          : falha({ erro: "Esse serviço não está disponível com o profissional escolhido." });
      default:
        throw new Error(`agendar_publico falhou (${error.code})`);
    }
  }

  const r = data?.[0];
  if (!r) throw new Error("agendar_publico não devolveu o agendamento");
  // A confirmação do WhatsApp já está na fila (gatilho do banco, se o cliente deu opt-in): envia depois da resposta.
  after(() => processarFila().catch((e) => console.error(e instanceof Error ? e.message : "whatsapp: fila falhou")));
  return { confirmacao: { servico: r.servico, profissional: r.profissional, inicio: r.inicio, fim: r.fim, preco: r.preco } };
}

// Na Vercel, o primeiro IP de x-forwarded-for é o do visitante.
async function ipDaRequisicao() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
