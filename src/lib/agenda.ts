// Grade da agenda do dia: régua de horas, períodos sem atendimento e agendamentos lado a lado.
// Tudo em minutos desde a meia-noite no fuso do salão. Puro (testado em agenda.test.ts).
import { dataNoFuso, minutosNoFuso, paraMinutos } from "./datas";

export type Periodo = { de: number; ate: number };
export type FaixaHorario = { inicio: string; fim: string }; // "09:00"–"12:00", horário do salão

const DIA = 24 * 60;

/** Régua visível: 08h–19h no mínimo, ampliada (em horas cheias) para caber expediente e agendamentos. */
export function regua(periodos: Periodo[]): Periodo {
  let de = 8 * 60;
  let ate = 19 * 60;
  for (const p of periodos) {
    de = Math.min(de, Math.floor(p.de / 60) * 60);
    ate = Math.max(ate, Math.ceil(p.ate / 60) * 60);
  }
  return { de: Math.max(0, de), ate: Math.min(DIA, ate) };
}

/** Faixas de horário do banco ("09:00:00") em minutos, em ordem. */
export function faixasEmMinutos(faixas: FaixaHorario[]): Periodo[] {
  return faixas
    .map((f) => ({ de: paraMinutos(f.inicio.slice(0, 5)), ate: paraMinutos(f.fim.slice(0, 5)) }))
    .sort((a, b) => a.de - b.de);
}

/**
 * Períodos da régua em que o profissional não atende: antes, entre (intervalo) e depois das faixas.
 * Sem faixas no dia, a régua inteira é "fora".
 */
export function semAtendimento(faixas: Periodo[], r: Periodo): (Periodo & { tipo: "fora" | "intervalo" })[] {
  if (faixas.length === 0) return [{ ...r, tipo: "fora" }];
  const lacunas: (Periodo & { tipo: "fora" | "intervalo" })[] = [];
  if (faixas[0].de > r.de) lacunas.push({ de: r.de, ate: faixas[0].de, tipo: "fora" });
  for (let i = 1; i < faixas.length; i++) {
    if (faixas[i].de > faixas[i - 1].ate) lacunas.push({ de: faixas[i - 1].ate, ate: faixas[i].de, tipo: "intervalo" });
  }
  const ultima = faixas[faixas.length - 1];
  if (ultima.ate < r.ate) lacunas.push({ de: ultima.ate, ate: r.ate, tipo: "fora" });
  return lacunas;
}

/**
 * Instantes (ISO) -> período em minutos dentro do dia `dia` no fuso do salão (corta o que passa da meia-noite).
 * Fora do dia: período vazio ({ de: 0, ate: 0 }).
 */
export function periodoNoDia(inicio: string, fim: string, dia: string, fuso: string): Periodo {
  const diaInicio = dataNoFuso(inicio, fuso);
  const diaFim = dataNoFuso(fim, fuso);
  if (diaInicio > dia || diaFim < dia) return { de: 0, ate: 0 };
  const de = diaInicio < dia ? 0 : minutosNoFuso(inicio, fuso);
  const ate = diaFim > dia ? DIA : minutosNoFuso(fim, fuso);
  return { de, ate: Math.max(ate, de) };
}

/**
 * Agendamentos que se sobrepõem (ex.: um cancelado e o novo no mesmo horário) ficam lado a lado.
 * Devolve, na ordem recebida, a coluna de cada item e quantas colunas o seu grupo usa.
 */
export function ladoALado(itens: Periodo[]): { coluna: number; colunas: number }[] {
  const ordem = itens.map((p, i) => ({ ...p, i })).sort((a, b) => a.de - b.de || a.ate - b.ate);
  const resultado: { coluna: number; colunas: number }[] = new Array(itens.length);
  let grupo: { i: number; coluna: number }[] = [];
  let fimColunas: number[] = [];
  let fimGrupo = -1;

  const fecharGrupo = () => {
    for (const g of grupo) resultado[g.i] = { coluna: g.coluna, colunas: fimColunas.length };
    grupo = [];
    fimColunas = [];
  };

  for (const p of ordem) {
    if (p.de >= fimGrupo) fecharGrupo();
    let coluna = fimColunas.findIndex((fim) => fim <= p.de);
    if (coluna === -1) {
      coluna = fimColunas.length;
      fimColunas.push(p.ate);
    } else {
      fimColunas[coluna] = p.ate;
    }
    grupo.push({ i: p.i, coluna });
    fimGrupo = Math.max(fimGrupo, p.ate);
  }
  fecharGrupo();
  return resultado;
}
