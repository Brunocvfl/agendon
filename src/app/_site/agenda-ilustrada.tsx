// Ilustração da agenda do painel (dia com uma coluna por profissional). Mesmas cores de status
// de /painel/agenda. Dados fictícios.
type Status = "confirmado" | "agendado" | "concluido" | "faltou";

const ESTILO: Record<Status, string> = {
  confirmado: "border-confirmado bg-[#E3F8EF]",
  agendado: "border-on bg-[#EAF0FF]",
  concluido: "border-noite/35 bg-[#EEF0F6]",
  faltou: "border-red-500 bg-[#FDECEC]",
};

const NOME: Record<Status, string> = {
  confirmado: "Confirmado",
  agendado: "Agendado",
  concluido: "Concluído",
  faltou: "Faltou",
};

const COR: Record<Status, string> = {
  confirmado: "bg-confirmado",
  agendado: "bg-on",
  concluido: "bg-noite/35",
  faltou: "bg-red-500",
};

const PROFISSIONAIS = ["Ana Lima", "Bruno Reis", "Carla Souza"];
const HORAS = ["09:00", "10:00", "11:00", "12:00"];

// Linha = fatia de 15 min a partir das 09:00 (1 = 09:00).
const BLOCOS: { col: number; de: number; ate: number; cliente: string; servico: string; status: Status }[] = [
  { col: 1, de: 1, ate: 5, cliente: "Marina", servico: "Corte feminino", status: "concluido" },
  { col: 1, de: 6, ate: 10, cliente: "Juliana", servico: "Escova", status: "confirmado" },
  { col: 1, de: 11, ate: 15, cliente: "Patrícia", servico: "Corte feminino", status: "agendado" },
  { col: 2, de: 1, ate: 3, cliente: "Rafael", servico: "Barba", status: "faltou" },
  { col: 2, de: 4, ate: 8, cliente: "Diego", servico: "Cabelo e barba", status: "concluido" },
  { col: 2, de: 9, ate: 11, cliente: "Lucas", servico: "Barba", status: "confirmado" },
  { col: 2, de: 13, ate: 17, cliente: "André", servico: "Corte masculino", status: "agendado" },
  { col: 3, de: 2, ate: 10, cliente: "Fernanda", servico: "Coloração", status: "confirmado" },
  { col: 3, de: 12, ate: 15, cliente: "Beatriz", servico: "Manicure", status: "agendado" },
];

export function AgendaIlustrada() {
  return (
    <figure className="overflow-hidden rounded-3xl bg-white text-noite shadow-[0_30px_60px_-24px_rgb(0_0_0/0.5)]">
      <div className="flex items-center justify-between border-b border-noite/8 px-5 py-3.5">
        <p className="font-semibold">Quarta, 11</p>
        <p className="text-sm text-noite/65">9 agendamentos</p>
      </div>
      <div className="overflow-x-auto">
        <div
          className="relative grid min-w-[34rem] grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] px-3 pb-4"
          style={{ gridTemplateRows: "2.5rem repeat(16, 1.6rem)" }}
        >
          {PROFISSIONAIS.map((p, i) => (
            <div key={p} className="flex items-center justify-center text-sm font-semibold" style={{ gridColumn: i + 2, gridRow: 1 }}>
              {p}
            </div>
          ))}
          {HORAS.map((h, i) => (
            <div
              key={h}
              className="border-t border-noite/8 pt-1 text-xs text-noite/65 tabular-nums"
              style={{ gridColumn: "1 / -1", gridRow: `${i * 4 + 2} / span 4` }}
            >
              {h}
            </div>
          ))}
          {/* Linha de agora, como no painel (atrás dos blocos). */}
          <div aria-hidden className="pointer-events-none relative" style={{ gridColumn: "2 / -1", gridRow: "12 / span 1" }}>
            <span className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500" />
            <span className="absolute top-1/2 -left-1 size-2.5 -translate-y-1/2 rounded-full bg-red-500" />
          </div>
          {BLOCOS.map((b) => (
            <div
              key={`${b.col}-${b.de}`}
              className={`relative m-0.5 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-xs leading-tight ${ESTILO[b.status]} ${
                b.status === "faltou" ? "text-noite/70" : ""
              }`}
              style={{ gridColumn: b.col + 1, gridRow: `${b.de + 1} / ${b.ate + 1}` }}
            >
              <p className="truncate font-semibold">{b.cliente}</p>
              <p className="truncate text-noite/70">{b.servico}</p>
              {b.ate - b.de >= 3 && <p className="mt-0.5 truncate text-noite/65">{NOME[b.status]}</p>}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 border-t border-noite/8 px-5 py-3 text-sm text-noite/70">
        {(Object.keys(NOME) as Status[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-3 rounded-sm ${COR[s]}`} />
            {NOME[s]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
