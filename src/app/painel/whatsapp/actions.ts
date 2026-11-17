"use server";

import { refresh } from "next/cache";
import { exigirPermissao, getUsuario } from "@/lib/auth";
import { criarModeloConfirmacao, ehAdminDaPlataforma } from "@/lib/whatsapp/conta";

export type EstadoCriacao = { erro?: string; ok?: string };

export async function criarModelo(): Promise<EstadoCriacao> {
  await exigirPermissao("gerenciar-salao");
  const usuario = await getUsuario();
  if (!ehAdminDaPlataforma(usuario?.email ?? null)) return { erro: "Só administradores do AgendOn." };

  const r = await criarModeloConfirmacao();
  if (!r.ok) return { erro: `A Meta recusou: ${r.erro}` };
  refresh();
  return { ok: `Modelo criado (id ${r.id}), status ${r.status}.` };
}
