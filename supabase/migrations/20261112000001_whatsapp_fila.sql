-- WhatsApp: fila de saída e funções do servidor.
-- - message_log vira a fila: cada linha é uma mensagem (um tipo por agendamento), sem dado pessoal;
--   telefone e nome são lidos do cliente na hora do envio.
-- - Um gatilho em appointments enfileira a confirmação só se o cliente deu opt-in e não saiu (SAIR).
-- - O servidor (service_role) fala com a fila só por estas funções: reservar, registrar o resultado do
--   envio, atualizar o status vindo do webhook da Meta e registrar o opt-out (SAIR).
-- Dono(a) e Recepção continuam só lendo message_log (policy da migration 2).

-- 1) Colunas, valores válidos e índices.
alter table public.message_log
  add column client_id uuid,
  add column template text,
  add column erro text,
  add column tentativas int not null default 0,
  add column enviada_em timestamptz,
  add column atualizada_em timestamptz not null default now(),
  add constraint message_log_status_valido
    check (status in ('na_fila', 'enviando', 'enviada', 'entregue', 'lida', 'falhou')),
  add constraint message_log_erro_tamanho check (erro is null or char_length(erro) <= 200),
  add constraint message_log_client_fkey
    foreign key (client_id, salon_id) references public.clients (id, salon_id);

-- Uma mensagem de cada tipo por agendamento (idempotência; agendamento nulo não conta).
create unique index message_log_agendamento_tipo_key on public.message_log (appointment_id, tipo);
create index message_log_meta_idx on public.message_log (meta_message_id) where meta_message_id is not null;
create index message_log_fila_idx on public.message_log (created_at) where status = 'na_fila';

-- 2) Confirmação na fila ao criar o agendamento (página pública ou painel).
create function app.enfileirar_confirmacao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'agendado' and exists (
    select 1 from public.clients c
    where c.id = new.client_id and c.salon_id = new.salon_id
      and c.telefone is not null
      and c.consentimento_whatsapp_em is not null
      and c.optout_em is null
      and c.anonimizado_em is null
  ) then
    insert into public.message_log (salon_id, appointment_id, client_id, tipo, template)
    values (new.salon_id, new.id, new.client_id, 'confirmacao', 'confirmacao_agendamento')
    on conflict (appointment_id, tipo) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function app.enfileirar_confirmacao() from public, anon, authenticated;

create trigger appointments_enfileirar_confirmacao
  after insert on public.appointments
  for each row execute function app.enfileirar_confirmacao();

-- 3) Reservar mensagens para enviar. Antes, descarta as que perderam o sentido (cliente saiu,
--    foi anonimizado ou o agendamento acabou). Cada mensagem tem até 3 tentativas.
create function public.whatsapp_reservar(p_limite int default 10)
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
      where c.id = m.client_id and c.salon_id = m.salon_id
        and c.telefone is not null
        and c.consentimento_whatsapp_em is not null
        and c.optout_em is null
        and c.anonimizado_em is null
        and a.status in ('agendado', 'confirmado')
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

-- 4) Resultado do envio (resposta da Meta): enviada (com o id da mensagem), falhou ou volta para a fila.
create function public.whatsapp_resultado(p_id uuid, p_status text, p_wamid text, p_erro text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_status is null or p_status not in ('enviada', 'falhou', 'na_fila') then
    raise exception 'status_invalido' using errcode = '22023';
  end if;

  -- Voltar para a fila com as 3 tentativas gastas vira falha (senão ficaria parada na fila).
  update public.message_log m
  set status = case when p_status = 'na_fila' and m.tentativas >= 3 then 'falhou' else p_status end,
      meta_message_id = coalesce(p_wamid, m.meta_message_id),
      erro = left(p_erro, 200),
      enviada_em = case when p_status = 'enviada' then now() else m.enviada_em end,
      atualizada_em = now()
  where m.id = p_id and m.status = 'enviando';
end;
$$;

-- 5) Status vindo do webhook (enviada, entregue, lida, falhou). Nunca volta para trás.
--    Devolve quantas mensagens mudaram (0 = id desconhecido ou status antigo; o webhook responde 200).
create function public.whatsapp_status_meta(p_wamid text, p_status text, p_erro text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_n int;
begin
  if p_status is null or p_status not in ('enviada', 'entregue', 'lida', 'falhou') then
    raise exception 'status_invalido' using errcode = '22023';
  end if;
  if p_wamid is null or char_length(p_wamid) not between 1 and 200 then
    raise exception 'wamid_invalido' using errcode = '22023';
  end if;

  update public.message_log m
  set status = p_status,
      erro = case when p_status = 'falhou' then left(p_erro, 200) else m.erro end,
      atualizada_em = now()
  where m.meta_message_id = p_wamid
    and case
      when p_status = 'falhou' then m.status in ('enviando', 'enviada')
      else m.status <> 'falhou'
        and (case m.status when 'enviada' then 2 when 'entregue' then 3 when 'lida' then 4 else 1 end)
          < (case p_status when 'enviada' then 2 when 'entregue' then 3 else 4 end)
    end;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 6) Opt-out (resposta SAIR): vale para todo cliente com esse WhatsApp (o número da Meta é um só).
--    Recebe as formas possíveis do número (com e sem o 9 do celular). Devolve quantos clientes saíram.
create function public.whatsapp_optout(p_telefones text[])
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_n int;
begin
  if p_telefones is null or cardinality(p_telefones) not between 1 and 4
     or exists (select 1 from unnest(p_telefones) t where t is null or t !~ '^\+[1-9][0-9]{7,14}$') then
    raise exception 'telefone_invalido' using errcode = '22023';
  end if;

  with saiu as (
    update public.clients c
    set optout_em = now()
    where c.telefone = any (p_telefones) and c.optout_em is null and c.anonimizado_em is null
    returning c.id, c.salon_id
  )
  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  select s.salon_id, null, 'optout_whatsapp', 'clients', s.id from saiu s;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 7) Só o servidor chama.
revoke execute on function public.whatsapp_reservar(int) from public, anon, authenticated;
revoke execute on function public.whatsapp_resultado(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.whatsapp_status_meta(text, text, text) from public, anon, authenticated;
revoke execute on function public.whatsapp_optout(text[]) from public, anon, authenticated;
grant execute on function public.whatsapp_reservar(int) to service_role;
grant execute on function public.whatsapp_resultado(uuid, text, text, text) to service_role;
grant execute on function public.whatsapp_status_meta(text, text, text) to service_role;
grant execute on function public.whatsapp_optout(text[]) to service_role;
