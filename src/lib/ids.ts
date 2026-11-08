// Ids das tabelas são UUID. Validar antes de ir ao banco evita erro 22P02 e consulta à toa.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_RE.test(valor);
}
