// Datas: o tempo do salão. Datas de calendário ("AAAA-MM-DD"), horas ("HH:MM"), instantes no fuso
// do salão e os rótulos de data e hora das telas e mensagens. Puro: serve no servidor e no navegador.
// Datas de calendário não têm fuso: o Date em UTC é usado só para a aritmética.

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "AAAA-MM-DD" válida (existe no calendário)? */
export function ehData(texto: string): boolean {
  if (!DATA_RE.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

/** Soma (ou subtrai) dias a uma data "AAAA-MM-DD". */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Dia da semana de uma data "AAAA-MM-DD" (0 = domingo, como em working_hours.dia_semana). */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T00:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana de uma data (a semana da agenda vai de segunda a domingo). */
export function inicioDaSemana(data: string): string {
  return somarDias(data, -((diaDaSemana(data) + 6) % 7));
}

/** "9–15 nov" ou "30 nov – 6 dez" (semana que começa em `segunda`). */
export function rotuloSemana(segunda: string): string {
  const domingo = somarDias(segunda, 6);
  const parte = (data: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...o }).format(new Date(`${data}T12:00:00Z`)).replace(".", "");
  const dia = (d: string) => String(Number(d.slice(8, 10)));
  return segunda.slice(5, 7) === domingo.slice(5, 7)
    ? `${dia(segunda)}–${dia(domingo)} ${parte(domingo, { month: "short" })}`
    : `${dia(segunda)} ${parte(segunda, { month: "short" })} – ${dia(domingo)} ${parte(domingo, { month: "short" })}`;
}

/** Data "AAAA-MM-DD" de um instante no fuso do salão. */
export function dataNoFuso(instante: Date | string, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(instante),
  );
}

/** Minutos desde a meia-noite (no fuso do salão) de um instante. */
export function minutosNoFuso(instante: Date | string, fuso: string): number {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(instante));
  const valor = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  return valor("hour") * 60 + valor("minute");
}

/** "09:30" -> 570 */
export function paraMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" */
export function paraHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}


/** "HH:MM" válida (00:00 a 23:59)? */
export function ehHora(texto: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

/** "10:00": a hora de um instante no fuso do salão. */
export function horaNoFuso(instante: Date | string, fuso: string): string {
  return paraHora(minutosNoFuso(instante, fuso));
}

/** As partes do rótulo de uma data "AAAA-MM-DD": { semana: "qua", dia: "11 nov" }. */
export function partesDaData(data: string): { semana: string; dia: string } {
  const d = new Date(`${data}T12:00:00Z`);
  const parte = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...o }).format(d).replace(".", "");
  return { semana: parte({ weekday: "short" }), dia: `${parte({ day: "2-digit" })} ${parte({ month: "short" })}` };
}

/** "qua, 11 nov" a partir de "AAAA-MM-DD". */
export function rotuloData(data: string): string {
  const { semana, dia } = partesDaData(data);
  return `${semana}, ${dia}`;
}

/** "qui, 12 nov às 15:30": dia e hora de um instante no fuso do salão. */
export function quando(instante: Date | string, fuso: string): string {
  return `${rotuloData(dataNoFuso(instante, fuso))} às ${horaNoFuso(instante, fuso)}`;
}

/**
 * Período legível no fuso do salão (folgas). Dias inteiros vão de 00:00 a 00:00 com fim exclusivo:
 * "qua, 19 nov", "19 a 21 nov", "28 nov a 02 dez". Com horário: "qua, 19 nov · 14:00–16:00" ou,
 * atravessando a meia-noite, "qua, 19 nov 22:00 até qui, 20 nov 02:00".
 */
export function periodoLegivel(inicio: Date | string, fim: Date | string, fuso: string): string {
  const di = dataNoFuso(inicio, fuso);
  const df = dataNoFuso(fim, fuso);
  const hi = horaNoFuso(inicio, fuso);
  const hf = horaNoFuso(fim, fuso);

  if (hi === "00:00" && hf === "00:00") {
    const ultimo = somarDias(df, -1);
    if (ultimo === di) return rotuloData(di);
    return di.slice(0, 7) === ultimo.slice(0, 7)
      ? `${di.slice(8)} a ${partesDaData(ultimo).dia}`
      : `${partesDaData(di).dia} a ${partesDaData(ultimo).dia}`;
  }
  return di === df ? `${rotuloData(di)} · ${hi}–${hf}` : `${rotuloData(di)} ${hi} até ${rotuloData(df)} ${hf}`;
}

// --- Datas curtas do painel (instantes no fuso do salão) ------------------------------------

function partesDoInstante(instante: Date | string, fuso: string, o: Intl.DateTimeFormatOptions) {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...o }).formatToParts(new Date(instante));
  const valor = (t: Intl.DateTimeFormatPartTypes) => (p.find((x) => x.type === t)?.value ?? "").replace(".", "");
  return { dia: valor("day"), mes: valor("month"), ano: valor("year") };
}

/** "03 nov" */
export function formatarDiaMes(instante: Date | string, fuso: string): string {
  const { dia, mes } = partesDoInstante(instante, fuso, { day: "2-digit", month: "short" });
  return `${dia} ${mes}`;
}

/** "03/11/2026" */
export function formatarData(instante: Date | string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(instante),
  );
}

/** "nov/2026" */
export function formatarMesAno(instante: Date | string, fuso: string): string {
  const { mes, ano } = partesDoInstante(instante, fuso, { month: "short", year: "numeric" });
  return `${mes}/${ano}`;
}
