// Regras da Folga. Datas chegam do <input type="datetime-local"> no horário do salão ("2026-12-01T14:00");
// a conversão para UTC é feita no banco (adicionar_folga) com o fuso do salão.
import { invalido, limparTexto, valido, type Resultado } from "./resultado";

export const LIMITES_FOLGA = { motivo: { max: 80 } } as const;

const DATA_HORA_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type FolgaValida = { inicio: string; fim: string; motivo: string };

export function lerFolga(entrada: { inicio?: string; fim?: string; motivo?: string }): Resultado<FolgaValida> {
  const inicio = entrada.inicio ?? "";
  const fim = entrada.fim ?? "";
  if (!DATA_HORA_RE.test(inicio) || !DATA_HORA_RE.test(fim)) return invalido({ periodo: "Informe o começo e o fim." });
  // Mesmo formato e mesmo fuso: comparar como texto é comparar no tempo.
  if (fim <= inicio) return invalido({ periodo: "O fim precisa ser depois do começo." });
  return valido({ inicio, fim, motivo: limparTexto(entrada.motivo).slice(0, LIMITES_FOLGA.motivo.max) });
}
