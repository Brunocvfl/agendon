// Horário semanal: o banco guarda faixas (dia, início, fim); a tela mostra "início, fim e intervalo".
// 0 = domingo ... 6 = sábado (igual ao Postgres). A tela começa na segunda.

export const DIAS = [
  { n: 1, curto: "Seg", nome: "Segunda" },
  { n: 2, curto: "Ter", nome: "Terça" },
  { n: 3, curto: "Qua", nome: "Quarta" },
  { n: 4, curto: "Qui", nome: "Quinta" },
  { n: 5, curto: "Sex", nome: "Sexta" },
  { n: 6, curto: "Sáb", nome: "Sábado" },
  { n: 0, curto: "Dom", nome: "Domingo" },
] as const;

export type Faixa = { dia: number; inicio: string; fim: string };

export type DiaTela = {
  dia: number;
  trabalha: boolean;
  inicio: string;
  fim: string;
  intervaloInicio: string;
  intervaloFim: string;
};

const hhmm = (t: string) => t.slice(0, 5);
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Faixas do banco -> um registro por dia. Mais de duas faixas: usa a primeira e a última.
export function faixasParaTela(faixas: Faixa[]): DiaTela[] {
  return DIAS.map(({ n }) => {
    const doDia = faixas.filter((f) => f.dia === n).sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (doDia.length === 0) {
      return { dia: n, trabalha: false, inicio: "", fim: "", intervaloInicio: "", intervaloFim: "" };
    }
    const primeira = doDia[0];
    const ultima = doDia[doDia.length - 1];
    return {
      dia: n,
      trabalha: true,
      inicio: hhmm(primeira.inicio),
      fim: hhmm(ultima.fim),
      intervaloInicio: doDia.length > 1 ? hhmm(primeira.fim) : "",
      intervaloFim: doDia.length > 1 ? hhmm(doDia[1].inicio) : "",
    };
  });
}

// Tela -> faixas, com validação por dia. Devolve erros por número do dia.
export function telaParaFaixas(dias: DiaTela[]): { faixas: Faixa[]; erros: Record<number, string> } {
  const faixas: Faixa[] = [];
  const erros: Record<number, string> = {};

  for (const d of dias) {
    if (!d.trabalha) continue;
    if (!HORA_RE.test(d.inicio) || !HORA_RE.test(d.fim)) {
      erros[d.dia] = "Informe início e fim.";
      continue;
    }
    if (d.inicio >= d.fim) {
      erros[d.dia] = "O fim precisa ser depois do início.";
      continue;
    }
    const temIntervalo = Boolean(d.intervaloInicio || d.intervaloFim);
    if (!temIntervalo) {
      faixas.push({ dia: d.dia, inicio: d.inicio, fim: d.fim });
      continue;
    }
    if (!HORA_RE.test(d.intervaloInicio) || !HORA_RE.test(d.intervaloFim)) {
      erros[d.dia] = "Escolha quando a pausa começa e termina.";
      continue;
    }
    if (!(d.inicio < d.intervaloInicio && d.intervaloInicio < d.intervaloFim && d.intervaloFim < d.fim)) {
      erros[d.dia] = "A pausa precisa ficar dentro do horário de trabalho.";
      continue;
    }
    faixas.push({ dia: d.dia, inicio: d.inicio, fim: d.intervaloInicio });
    faixas.push({ dia: d.dia, inicio: d.intervaloFim, fim: d.fim });
  }

  return { faixas, erros };
}

// "09:00 às 18:00, com pausa das 12:00 às 13:00" para leitura.
export function resumoDia(d: DiaTela) {
  if (!d.trabalha) return "Não atende";
  const base = `${d.inicio} às ${d.fim}`;
  return d.intervaloInicio ? `${base}, com pausa das ${d.intervaloInicio} às ${d.intervaloFim}` : base;
}
