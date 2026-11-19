// Topo do site: a agenda de um dia em números grandes, que se preenche sozinha ao abrir a página
// (só CSS; com "reduzir movimento" ligado, já aparece cheia). Dados fictícios.
const LINHAS: { hora: string; agendamento?: { cliente: string; servico: string; profissional: string } }[] = [
  { hora: "09:00", agendamento: { cliente: "Marina", servico: "Corte feminino", profissional: "Ana" } },
  { hora: "09:30" },
  { hora: "10:00", agendamento: { cliente: "Juliana", servico: "Escova", profissional: "Ana" } },
  { hora: "10:30", agendamento: { cliente: "Rafael", servico: "Barba", profissional: "Bruno" } },
  { hora: "11:00" },
  { hora: "11:30", agendamento: { cliente: "Fernanda", servico: "Coloração", profissional: "Carla" } },
  { hora: "12:00" },
  { hora: "12:30", agendamento: { cliente: "Beatriz", servico: "Manicure", profissional: "Carla" } },
];

export function DiaPreenchendo() {
  let ordem = 0;
  return (
    <div>
      <p className="sr-only">
        Ilustração: a agenda de um dia sendo preenchida por clientes que marcaram pelo link, cada um recebendo a confirmação
        no WhatsApp.
      </p>
      <ol aria-hidden className="border-b border-white/15">
        {LINHAS.map(({ hora, agendamento }) => {
          const atraso = agendamento ? 0.5 + ordem++ * 0.75 : 0;
          return (
            <li key={hora} className="grid grid-cols-[4.9rem_minmax(0,1fr)] items-center border-t border-white/15 sm:grid-cols-[9.75rem_minmax(0,1fr)]">
              <span className="py-1 text-[1.6rem] leading-none font-extralight tracking-[-0.04em] text-white/50 tabular-nums sm:text-[3.1rem]">
                {hora}
              </span>
              {agendamento ? (
                <div
                  className="my-1.5 flex min-w-0 items-center gap-3 rounded-2xl bg-white py-2 pr-2.5 pl-3.5 text-noite shadow-[0_12px_30px_-12px_rgb(15_27_77/0.6)] motion-safe:animate-encaixar motion-safe:[animation-fill-mode:backwards] sm:py-2.5"
                  style={{ animationDelay: `${atraso}s` }}
                >
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-bold sm:text-base">{agendamento.cliente}</p>
                    <p className="text-xs text-noite/70 sm:text-sm">
                      {agendamento.servico} com {agendamento.profissional}
                    </p>
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full bg-[#E3F8EF] px-2.5 py-1 text-xs font-semibold text-confirmado-escuro motion-safe:animate-chegar motion-safe:[animation-fill-mode:backwards]"
                    style={{ animationDelay: `${atraso + 0.45}s` }}
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
    </div>
  );
}
