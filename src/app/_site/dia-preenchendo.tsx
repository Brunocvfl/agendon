// Régua de horas do site: a agenda de um dia em números grandes, que se preenche sozinha.
// "manha" (topo): cinco clientes marcam, um a um, e depois a linha de agora desce devagar.
// "cheio" (chamada final): o dia terminou cheio e confirmado; os checks acendem em sequência.
// Só CSS; com "reduzir movimento" ligado, já aparece no estado final. Dados fictícios.
type Linha = { hora: string; agendamento?: { cliente: string; servico: string; profissional: string } };

const MANHA: Linha[] = [
  { hora: "09:00", agendamento: { cliente: "Marina", servico: "Corte feminino", profissional: "Ana" } },
  { hora: "09:30" },
  { hora: "10:00", agendamento: { cliente: "Juliana", servico: "Escova", profissional: "Ana" } },
  { hora: "10:30", agendamento: { cliente: "Rafael", servico: "Barba", profissional: "Bruno" } },
  { hora: "11:00" },
  { hora: "11:30", agendamento: { cliente: "Fernanda", servico: "Coloração", profissional: "Carla" } },
  { hora: "12:00" },
  { hora: "12:30", agendamento: { cliente: "Beatriz", servico: "Manicure", profissional: "Carla" } },
];

const CHEIO: Linha[] = [
  { hora: "14:00", agendamento: { cliente: "Patrícia", servico: "Corte feminino", profissional: "Ana" } },
  { hora: "15:00", agendamento: { cliente: "Gabriel", servico: "Barba", profissional: "Bruno" } },
  { hora: "15:30", agendamento: { cliente: "Helena", servico: "Escova", profissional: "Ana" } },
  { hora: "16:30", agendamento: { cliente: "Tiago", servico: "Corte masculino", profissional: "Bruno" } },
  { hora: "17:00", agendamento: { cliente: "Sofia", servico: "Manicure", profissional: "Carla" } },
];

export function DiaPreenchendo({ variante = "manha" }: { variante?: "manha" | "cheio" }) {
  const cheio = variante === "cheio";
  const linhas = cheio ? CHEIO : MANHA;
  let ordem = 0;
  return (
    <div>
      <p className="sr-only">
        {cheio
          ? "Ilustração: a agenda da tarde cheia, com todos os horários confirmados no WhatsApp."
          : "Ilustração: a agenda de um dia sendo preenchida por clientes que marcaram pelo link, cada um recebendo a confirmação no WhatsApp."}
      </p>
      <div aria-hidden className="relative">
        <ol className="border-b border-white/15">
          {linhas.map(({ hora, agendamento }) => {
            // Topo: os cartões entram um a um. Chamada: os cartões já estão lá e só os checks acendem.
            const atraso = agendamento ? (cheio ? 0.3 + ordem++ * 0.35 : 0.5 + ordem++ * 0.75) : 0;
            return (
              <li key={hora} className="grid grid-cols-[4.9rem_minmax(0,1fr)] items-center border-t border-white/15 sm:grid-cols-[9.75rem_minmax(0,1fr)]">
                <span className="py-1 text-[1.6rem] leading-none font-extralight tracking-[-0.04em] text-white/75 tabular-nums sm:text-[3.1rem]">
                  {hora}
                </span>
                {agendamento ? (
                  <div
                    className={`my-1.5 flex min-w-0 items-center gap-3 rounded-2xl bg-white py-2 pr-2.5 pl-3.5 text-noite shadow-[0_12px_30px_-12px_rgb(15_27_77/0.6)] sm:py-2.5 ${
                      cheio ? "" : "motion-safe:animate-encaixar motion-safe:[animation-fill-mode:backwards]"
                    }`}
                    style={cheio ? undefined : { animationDelay: `${atraso}s` }}
                  >
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-sm font-bold sm:text-base">{agendamento.cliente}</p>
                      <p className="truncate text-xs text-noite/70 sm:text-sm">
                        {agendamento.servico} com {agendamento.profissional}
                      </p>
                    </div>
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full bg-confirmado-claro px-2.5 py-1 text-xs font-semibold text-confirmado-escuro motion-safe:animate-chegar motion-safe:[animation-fill-mode:backwards]"
                      style={{ animationDelay: `${cheio ? atraso : atraso + 0.45}s` }}
                    >
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 12.5 4.5 4.5L15 8M12 15.5l1.5 1.5L22 8" />
                      </svg>
                      WhatsApp
                    </span>
                  </div>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ol>
        {!cheio && (
          // Linha de agora: começa depois do último cartão e desce devagar até o meio da manhã.
          <div
            className="pointer-events-none absolute inset-y-0 right-0 left-[4.9rem] [--linha-agora-fim:58%] sm:left-[9.75rem] translate-y-[var(--linha-agora-fim)] motion-safe:translate-y-0 motion-safe:animate-[linha-agora_9s_cubic-bezier(0.4,0,0.2,1)_4.6s_both]"
          >
            <div className="flex items-center">
              <span className="-ml-1 size-2.5 shrink-0 rounded-full bg-confirmado shadow-[0_0_0_4px_rgb(25_195_125/0.25)]" />
              <span className="h-0.5 flex-1 bg-confirmado/80" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
