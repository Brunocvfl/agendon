// Datas de calendário ("AAAA-MM-DD") e horas no fuso do salão. Puro: serve no servidor e no navegador.
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

/** "qua, 11 nov" a partir de "AAAA-MM-DD". */
export function rotuloData(data: string): string {
  const d = new Date(`${data}T12:00:00Z`);
  const parte = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...o }).format(d).replace(".", "");
  return `${parte({ weekday: "short" })}, ${parte({ day: "2-digit" })} ${parte({ month: "short" })}`;
}
