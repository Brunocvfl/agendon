import "server-only";
import type { UsoDoPlano } from "@/lib/regras/plano";
import { createClient } from "@/lib/supabase/server";

/** Plano, uso e cobrança do salão (meu_plano, só Dono(a)). */
export async function carregarPlano(salonId: string): Promise<UsoDoPlano | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("meu_plano", { p_salon: salonId });
  if (error) throw new Error(`meu_plano falhou (${error.code})`);
  return (data as unknown as UsoDoPlano | null) ?? null;
}
