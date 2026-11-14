"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { captchaValido } from "@/lib/captcha";
import * as agendamento from "@/lib/agendamento";
import type { Confirmacao, ErroPublico } from "@/lib/agendamento";
import { lerAgendamentoPublico } from "@/lib/regras/agendamento";
import { clientePublico } from "@/lib/supabase/publico";
import { slugValido } from "./dados";

export type { Confirmacao };

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
  if (!slugValido(slug)) return [];
  const r = await agendamento.horariosPublicos({ slug, servico, profissional, dia }, { supabase: await clientePublico() });
  if (!r.ok) throw new Error("horarios_publicos falhou");
  return r.data;
}

const CONFIRA = "Confira os campos destacados.";

/** O que a pessoa vê para cada erro do agendamento público ("outro" vira erro do servidor). */
const ERROS: Record<Exclude<ErroPublico, "outro">, EstadoAgendamento> = {
  ocupado: { ocupado: true, erro: "Esse horário acabou de ser ocupado. Escolha outro." },
  "muitas-tentativas": { erro: "Muitos agendamentos feitos daqui em pouco tempo. Tente de novo daqui a uma hora." },
  "muitos-agendamentos": { erro: "Você já tem 3 horários marcados neste salão. Para marcar outro, fale com o salão." },
  "salao-indisponivel": { erro: "Este salão não está recebendo agendamentos online." },
  "telefone-invalido": { erros: { telefone: "Informe um WhatsApp válido, com DDD." }, erro: CONFIRA },
  "servico-nao-atendido": { erro: "Esse serviço não está disponível com o profissional escolhido." },
  "dado-invalido": { erro: "Esse serviço não está disponível com o profissional escolhido." },
};

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
  if (!lido.ok) return falha({ erros: lido.erros, erro: CONFIRA });

  const ip = await ipDaRequisicao();
  if (!(await captchaValido(texto("cf-turnstile-response"), ip))) {
    return falha({ erro: "Não conseguimos confirmar que você não é um robô. Tente de novo." });
  }

  // Só o hash do IP vai para o banco (limite de agendamentos por origem).
  const origem = createHash("sha256").update(ip ?? "sem-ip").digest("hex");
  const r = await agendamento.agendarPublico(slug, lido.valor, origem, { supabase: await clientePublico() });
  if (!r.ok) {
    if (r.erro === "outro") throw new Error("agendar_publico falhou");
    return falha(ERROS[r.erro]);
  }
  return { confirmacao: r.data };
}

// Na Vercel, o primeiro IP de x-forwarded-for é o do visitante.
async function ipDaRequisicao() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
