"use server";

import { acaoDoPainel, ERRO_GERAL, texto, type EstadoForm, type Mensagens } from "@/lib/acao";
import type { Vinculo } from "@/lib/auth";
import { ehUuid } from "@/lib/ids";
import { ERROS_EQUIPE, lerConvite, lerMembro, type Agenda } from "@/lib/regras/equipe";
import { invalido, valido } from "@/lib/regras/resultado";
import { authAdmin } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { urlDoSite } from "@/lib/site";

export type { EstadoForm };

const LISTA = "/painel/configuracoes/equipe";
type Supabase = Awaited<ReturnType<typeof createClient>>;
type Erro = { code?: string; message?: string };

const erro = (code: string) => ({ error: { code, message: code } });

// Erros da equipe num lugar só: regras do gatilho members_guarda (pela mensagem), do Auth e do app.
function mensagemEquipe(e: Erro) {
  const regra = Object.keys(ERROS_EQUIPE).find((r) => e.message?.includes(r));
  if (regra) return ERROS_EQUIPE[regra];
  switch (e.code) {
    case "email_existe":
      return { campo: "email", msg: "Esse e-mail já tem conta no AgendOn. No MVP, cada login fica em um só salão: use outro e-mail." };
    case "na_equipe":
      return { campo: "email", msg: "Essa pessoa já está na equipe." };
    case "agenda_ocupada":
      return { campo: "agenda", msg: "Essa agenda já está ligada a outro login. Escolha outra." };
    case "23505":
      return { campo: "agenda", msg: "Já existe uma agenda com esse nome. Escolha-a na lista." };
    case "ja_aceitou":
      return "Essa pessoa já aceitou o convite.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitos e-mails enviados agora. Aguarde alguns minutos e tente de novo.";
    default:
      return "Não foi possível salvar agora. Tente de novo em instantes.";
  }
}
const MENSAGENS: Mensagens = { outro: mensagemEquipe, invalido: mensagemEquipe, duplicado: mensagemEquipe };

/** Liga o login à agenda escolhida (soltando a anterior). Devolve o erro, se houver. */
async function ligarAgenda(supabase: Supabase, salaoId: string, membroId: string, nome: string, agenda: Agenda) {
  const solta = await supabase.from("professionals").update({ member_id: null }).eq("salon_id", salaoId).eq("member_id", membroId);
  if (solta.error) return solta.error;
  if (agenda.tipo === "nenhuma") return null;
  if (agenda.tipo === "nova") {
    const { error } = await supabase.from("professionals").insert({ salon_id: salaoId, nome, member_id: membroId });
    return error;
  }
  const { data, error } = await supabase
    .from("professionals")
    .update({ member_id: membroId })
    .eq("id", agenda.id)
    .eq("salon_id", salaoId)
    .is("member_id", null)
    .select("id");
  if (error) return error;
  return data.length === 0 ? { code: "agenda_ocupada" } : null;
}

async function opcoesDoConvite(vinculo: Vinculo, nome: string) {
  return { redirectTo: `${await urlDoSite()}/auth/confirmar`, data: { nome, salao: vinculo.salao.nome } };
}

/** Um membro do salão pela função equipe() (com e-mail e situação). */
async function membro(supabase: Supabase, salaoId: string, id: string) {
  const { data, error } = await supabase.rpc("equipe", { p_salon: salaoId });
  if (error) return { error, membro: null };
  return { error: null, membro: data.find((m) => m.id === id) ?? null };
}

const lerId = (fd: FormData) =>
  ehUuid(texto(fd, "id")) ? valido({ id: texto(fd, "id") }) : invalido<{ id: string }>({ [ERRO_GERAL]: "Pessoa inválida. Recarregue a página." });

// Convida: cria o login e envia o e-mail (Auth), grava o vínculo 'convidado' (RLS: Dono(a)) e liga a agenda.
export const convidar = acaoDoPainel({
  permissao: "gerenciar-salao",
  devolver: ["nome", "email", "perfil", "agenda"],
  ler: (fd) =>
    lerConvite({ nome: texto(fd, "nome"), email: texto(fd, "email"), perfil: texto(fd, "perfil"), agenda: texto(fd, "agenda") }),
  executar: async (v, { supabase, vinculo }) => {
    const salaoId = vinculo.salao.id;
    const equipe = await supabase.rpc("equipe", { p_salon: salaoId });
    if (equipe.error) return { error: equipe.error };
    if (equipe.data.some((m) => m.email.toLowerCase() === v.email)) return erro("na_equipe");
    // O convite só cria login novo: e-mail com conta (de outro salão ou sem salão) fica de fora no MVP.
    const uso = await supabase.rpc("email_em_uso", { p_email: v.email });
    if (uso.error) return { error: uso.error };
    if (uso.data) return erro("email_existe");

    const admin = authAdmin();
    const convite = await admin.inviteUserByEmail(v.email, await opcoesDoConvite(vinculo, v.nome));
    if (convite.error || !convite.data.user) {
      return erro(convite.error?.code === "email_exists" ? "email_existe" : (convite.error?.code ?? "outro"));
    }
    const userId = convite.data.user.id;

    const novo = await supabase
      .from("members")
      .insert({ salon_id: salaoId, user_id: userId, perfil: v.perfil, status: "convidado", nome: v.nome })
      .select("id")
      .single();
    if (novo.error) {
      await admin.deleteUser(userId); // o login acabou de ser criado só para este convite
      return { error: novo.error };
    }
    const erroAgenda = await ligarAgenda(supabase, salaoId, novo.data.id, v.nome, v.agenda);
    return { error: null, data: { semAgenda: erroAgenda !== null } };
  },
  mensagens: MENSAGENS,
  depois: { ir: (d: { semAgenda: boolean }) => `${LISTA}?aviso=${d.semAgenda ? "convite-sem-agenda" : "convite"}` },
});

// Edita nome, perfil e agenda. O banco barra mudar o próprio perfil e ficar sem Dono(a).
export const salvarMembro = acaoDoPainel({
  permissao: "gerenciar-salao",
  devolver: ["nome", "perfil", "agenda"],
  ler: (fd) => {
    const id = lerId(fd);
    if (!id.ok) return id;
    const lido = lerMembro({ nome: texto(fd, "nome"), perfil: texto(fd, "perfil"), agenda: texto(fd, "agenda") });
    return lido.ok ? valido({ ...lido.valor, id: id.valor.id }) : lido;
  },
  executar: async (v, { supabase, vinculo }) => {
    const salaoId = vinculo.salao.id;
    const { error } = await supabase
      .from("members")
      .update({ nome: v.nome, perfil: v.perfil })
      .eq("id", v.id)
      .eq("salon_id", salaoId);
    if (error) return { error };
    const erroAgenda = await ligarAgenda(supabase, salaoId, v.id, v.nome, v.agenda);
    return { error: erroAgenda };
  },
  mensagens: MENSAGENS,
  depois: { ir: `${LISTA}?aviso=salvo` },
});

function mudarStatus(status: "ativo" | "inativo") {
  return acaoDoPainel({
    permissao: "gerenciar-salao",
    ler: lerId,
    executar: ({ id }, { supabase, vinculo }) =>
      supabase.from("members").update({ status }).eq("id", id).eq("salon_id", vinculo.salao.id).neq("status", "convidado"),
    mensagens: MENSAGENS,
    depois: { ir: `${LISTA}?aviso=${status === "ativo" ? "reativado" : "desativado"}` },
  });
}

export const desativar = mudarStatus("inativo");
export const reativar = mudarStatus("ativo");

export const reenviarConvite = acaoDoPainel({
  permissao: "gerenciar-salao",
  ler: lerId,
  executar: async ({ id }, { supabase, vinculo }) => {
    const r = await membro(supabase, vinculo.salao.id, id);
    if (r.error) return { error: r.error };
    if (!r.membro || r.membro.status !== "convidado") return erro("ja_aceitou");
    const { error } = await authAdmin().inviteUserByEmail(r.membro.email, await opcoesDoConvite(vinculo, r.membro.nome ?? ""));
    return error ? erro(error.code === "email_exists" ? "ja_aceitou" : (error.code ?? "outro")) : { error: null };
  },
  mensagens: MENSAGENS,
  depois: { ir: `${LISTA}?aviso=reenviado` },
});

// Cancela um convite pendente: apaga o vínculo (o banco só deixa apagar 'convidado') e o login criado
// para o convite, se a pessoa nunca chegou a confirmar o e-mail.
export const cancelarConvite = acaoDoPainel({
  permissao: "gerenciar-salao",
  ler: lerId,
  executar: async ({ id }, { supabase, vinculo }) => {
    const r = await membro(supabase, vinculo.salao.id, id);
    if (r.error) return { error: r.error };
    if (!r.membro || r.membro.status !== "convidado") return erro("ja_aceitou");
    const { error } = await supabase.from("members").delete().eq("id", id).eq("salon_id", vinculo.salao.id);
    if (error) return { error };
    const admin = authAdmin();
    const login = await admin.getUserById(r.membro.user_id);
    if (login.data.user && !login.data.user.email_confirmed_at) await admin.deleteUser(r.membro.user_id);
    return { error: null };
  },
  mensagens: MENSAGENS,
  depois: { ir: `${LISTA}?aviso=cancelado` },
});
