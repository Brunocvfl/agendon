// Regras da Folga. A tela oferece dois modos:
// - "dia": dias inteiros, de dataInicio até dataFim (inclusive);
// - "horario": um dia, de horaInicio a horaFim.
// O resultado é sempre { inicio, fim } no horário do salão ("2026-12-01T14:00"), com fim exclusivo;
// a conversão para UTC é feita no banco (adicionar_folga) com o fuso do salão.
import { ehData, ehHora, somarDias } from "@/lib/datas";
import { invalido, limparTexto, valido, type Resultado } from "./resultado";

export const LIMITES_FOLGA = { motivo: { max: 80 } } as const;

export type ModoFolga = "dia" | "horario";
export type EntradaFolga = {
  modo?: string;
  dataInicio?: string;
  dataFim?: string;
  data?: string;
  horaInicio?: string;
  horaFim?: string;
  motivo?: string;
};
export type FolgaValida = { inicio: string; fim: string; motivo: string };

export function lerFolga(entrada: EntradaFolga): Resultado<FolgaValida> {
  const motivo = limparTexto(entrada.motivo).slice(0, LIMITES_FOLGA.motivo.max);

  if (entrada.modo === "dia") {
    const de = entrada.dataInicio ?? "";
    const ate = entrada.dataFim ?? "";
    if (!ehData(de) || !ehData(ate)) return invalido({ periodo: "Informe o primeiro e o último dia." });
    // Mesmo formato: comparar como texto é comparar no calendário.
    if (ate < de) return invalido({ periodo: "O último dia precisa ser igual ou depois do primeiro." });
    return valido({ inicio: `${de}T00:00`, fim: `${somarDias(ate, 1)}T00:00`, motivo });
  }

  if (entrada.modo === "horario") {
    const dia = entrada.data ?? "";
    const hi = entrada.horaInicio ?? "";
    const hf = entrada.horaFim ?? "";
    if (!ehData(dia) || !ehHora(hi) || !ehHora(hf)) return invalido({ periodo: "Informe o dia e o horário." });
    if (hf <= hi) return invalido({ periodo: "O fim precisa ser depois do começo." });
    return valido({ inicio: `${dia}T${hi}`, fim: `${dia}T${hf}`, motivo });
  }

  return invalido({ periodo: "Escolha dia inteiro ou horário." });
}
