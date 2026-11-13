-- WhatsApp fatia 2: lembrete antes do horário, com antecedência escolhida pelo salão.
-- - salons.lembrete_horas: 2, 4, 12, 24 (padrão) ou 48 horas; nulo = lembrete desligado. Só o Dono(a) altera.
-- - app.enfileirar_lembretes(): põe na fila o lembrete (template `lembrete_agendamento`) de cada agendamento
--   agendado/confirmado que entrou na janela (início - horas <= agora < início), com as mesmas regras da
--   confirmação (opt-in, sem SAIR, não anonimizado). Agendamento criado já dentro da janela não ganha
--   lembrete: a confirmação basta. Um lembrete por agendamento (índice único (appointment_id, tipo)).
-- - Job do pg_cron a cada 15 min: enfileira e, se há algo na fila, chama a rota do Next que envia
--   (/api/whatsapp/processar) pelo pg_net. URL e segredo ficam no Vault (`whatsapp_processar_url` e
--   `whatsapp_processar_segredo`); sem eles (ex.: local), o job só enfileira.
-- - whatsapp_reservar também descarta lembrete de horário que já passou ou de salão que desligou o lembrete.

-- 1) Antecedência do lembrete, por salão.
alter table public.salons
  add column lembrete_horas smallint default 24,
  add constraint salons_lembrete_horas_valido check (lembrete_horas in (2, 4, 12, 24, 48));

grant update (lembrete_horas) on public.salons to authenticated;

-- Agendamentos ativos por início (a busca do job olha só as próximas 48 horas).
create index appointments_ativos_inicio_idx on public.appointments (inicio)
  where status in ('agendado', 'confirmado');

-- 2) Enfileirar os lembretes. Devolve quantos entraram na fila.
create function app.enfileirar_lembretes()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_n int;
begin
  insert into public.message_log (salon_id, appointment_id, client_id, tipo, template)
  select a.salon_id, a.id, a.client_id, 'lembrete', 'lembrete_agendamento'
  from public.appointments a
  join public.salons s on s.id = a.salon_id
  join public.clients c on c.id = a.client_id and c.salon_id = a.salon_id
  where a.status in ('agendado', 'confirmado')
    and a.inicio > now()
    and a.inicio <= now() + interval '48 hours'
    and s.status = 'ativo'
    and s.lembrete_horas is not null
    and a.inicio <= now() + make_interval(hours => s.lembrete_horas)
    and a.created_at < a.inicio - make_interval(hours => s.lembrete_horas)
    and c.telefone is not null
    and c.consentimento_whatsapp_em is not null
    and c.optout_em is null
    and c.anonimizado_em is null
  on conflict (appointment_id, tipo) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function app.enfileirar_lembretes() from public, anon, authenticated;

-- 3) Reservar: igual à migration 18, mais o descarte de lembrete vencido ou desligado.
create or replace function public.whatsapp_reservar(p_limite int default 10)
returns table (
  mensagem_id uuid,
  tipo text,
  template text,
  telefone text,
  cliente_nome text,
  salao text,
  servico text,
  profissional text,
  inicio timestamptz,
  fuso text
)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.message_log m
  set status = 'falhou', erro = 'cancelada_antes_do_envio', atualizada_em = now()
  where m.status = 'na_fila'
    and not exists (
      select 1
      from public.clients c
      join public.appointments a on a.id = m.appointment_id and a.salon_id = m.salon_id
      join public.salons s on s.id = m.salon_id
      where c.id = m.client_id and c.salon_id = m.salon_id
        and c.telefone is not null
        and c.consentimento_whatsapp_em is not null
        and c.optout_em is null
        and c.anonimizado_em is null
        and a.status in ('agendado', 'confirmado')
        and (m.tipo <> 'lembrete' or (a.inicio > now() and s.lembrete_horas is not null))
    );

  return query
  with pegas as (
    select m.id
    from public.message_log m
    where m.status = 'na_fila' and m.tentativas < 3
    order by m.created_at
    limit greatest(least(coalesce(p_limite, 10), 50), 1)
    for update skip locked
  ),
  marcadas as (
    update public.message_log m
    set status = 'enviando', tentativas = m.tentativas + 1, atualizada_em = now()
    from pegas
    where m.id = pegas.id
    returning m.id, m.tipo, m.template, m.salon_id, m.appointment_id, m.client_id
  )
  select ma.id, ma.tipo, ma.template, c.telefone, c.nome, s.nome, sv.nome, p.nome, a.inicio, s.fuso
  from marcadas ma
  join public.clients c on c.id = ma.client_id and c.salon_id = ma.salon_id
  join public.salons s on s.id = ma.salon_id
  join public.appointments a on a.id = ma.appointment_id and a.salon_id = ma.salon_id
  join public.services sv on sv.id = a.service_id
  join public.professionals p on p.id = a.professional_id
  order by ma.id;
end;
$$;

revoke execute on function public.whatsapp_reservar(int) from public, anon, authenticated;
grant execute on function public.whatsapp_reservar(int) to service_role;

-- 4) O que o job roda: enfileira e chama a rota de envio se há algo na fila.
create extension if not exists pg_net with schema extensions;

create function app.whatsapp_tique()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text;
  v_segredo text;
begin
  perform app.enfileirar_lembretes();

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'whatsapp_processar_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'whatsapp_processar_segredo';

  if v_url is not null and v_segredo is not null
     and exists (select 1 from public.message_log where status = 'na_fila' and tentativas < 3) then
    perform net.http_post(
      url := v_url,
      body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_segredo),
      timeout_milliseconds := 30000
    );
  end if;
end;
$$;

revoke execute on function app.whatsapp_tique() from public, anon, authenticated;

select cron.schedule('whatsapp-lembretes-e-fila', '*/15 * * * *', $$select app.whatsapp_tique()$$);
