// Regras da Folga. A tela oferece dois modos:
// - "dia": dias inteiros, de dataInicio até dataFim (inclusive);
// - "horario": um dia, de horaInicio a horaFim.
// O resultado é sempre { inicio, fim } no horário do salão ("2026-12-01T14:00"), com fim exclusivo;
// a conversão para UTC é feita no banco (adicionar_folga) com o fuso do salão.
import { invalido, limparTexto, valido, type Resultado } from "./resultado";

export const LIMITES_FOLGA = { motivo: { max: 80 } } as const;

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^\d{2}:\d{2}$/;

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

const dataValida = (d: string) => DATA_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && proximoDia(d, 0) === d;

// Soma dias a uma data "AAAA-MM-DD" sem fuso (o Date em UTC serve só para a aritmética do calendário).
export function proximoDia(data: string, dias = 1) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function lerFolga(entrada: EntradaFolga): Resultado<FolgaValida> {
  const motivo = limparTexto(entrada.motivo).slice(0, LIMITES_FOLGA.motivo.max);

  if (entrada.modo === "dia") {
    const de = entrada.dataInicio ?? "";
    const ate = entrada.dataFim ?? "";
    if (!dataValida(de) || !dataValida(ate)) return invalido({ periodo: "Informe o primeiro e o último dia." });
    // Mesmo formato: comparar como texto é comparar no calendário.
    if (ate < de) return invalido({ periodo: "O último dia precisa ser igual ou depois do primeiro." });
    return valido({ inicio: `${de}T00:00`, fim: `${proximoDia(ate)}T00:00`, motivo });
  }

  if (entrada.modo === "horario") {
    const dia = entrada.data ?? "";
    const hi = entrada.horaInicio ?? "";
    const hf = entrada.horaFim ?? "";
    if (!dataValida(dia) || !HORA_RE.test(hi) || !HORA_RE.test(hf)) return invalido({ periodo: "Informe o dia e o horário." });
    if (hf <= hi) return invalido({ periodo: "O fim precisa ser depois do começo." });
    return valido({ inicio: `${dia}T${hi}`, fim: `${dia}T${hf}`, motivo });
  }

  return invalido({ periodo: "Escolha dia inteiro ou horário." });
}
