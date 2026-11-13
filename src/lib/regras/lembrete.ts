// Lembrete do WhatsApp: antecedência escolhida pelo salão. Espelha `salons_lembrete_horas_valido`
// (migration whatsapp_lembrete): 2, 4, 12, 24 ou 48 horas; nulo = desligado.
import { invalido, valido, type Resultado } from "./resultado";

export const ANTECEDENCIAS_LEMBRETE = [2, 4, 12, 24, 48] as const;
export const LEMBRETE_DESLIGADO = "desligado";

export function rotuloAntecedencia(horas: number | null): string {
  if (horas === null) return "Desligado";
  if (horas === 24) return "1 dia antes (24 horas)";
  if (horas === 48) return "2 dias antes (48 horas)";
  return `${horas} horas antes`;
}

export function lerLembrete(valor: string): Resultado<{ lembrete_horas: number | null }> {
  if (valor === LEMBRETE_DESLIGADO) return valido({ lembrete_horas: null });
  const horas = Number(valor);
  return (ANTECEDENCIAS_LEMBRETE as readonly number[]).includes(horas)
    ? valido({ lembrete_horas: horas })
    : invalido({ lembrete_horas: "Escolha uma das opções." });
}
