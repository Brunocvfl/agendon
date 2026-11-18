-- Agendar para outra pessoa (página pública) e nome digitado guardado no agendamento.
-- appointments.atendido_nome: quem será atendido. Na página pública é o nome da outra pessoa ou,
-- sem ela, o nome que quem agenda digitou agora (o cliente existente não troca de nome). O cliente
-- (client_id) continua sendo o dono do WhatsApp, que recebe as mensagens. Nulo = o próprio cliente
-- (agendamentos do painel e os anteriores a esta migration). Anonimizar o cliente apaga o nome.

alter table public.appointments
  add column atendido_nome text
  constraint appointments_atendido_nome_tamanho check (atendido_nome is null or char_length(atendido_nome) between 2 and 80);

-- 1) agendar_publico ganha p_atendido.
drop function public.agendar_publico(text, uuid, uuid, timestamp, text, text, boolean, text);

create function public.agendar_publico(
  p_slug text,
  p_service uuid,
  p_professional uuid,
  p_inicio timestamp,
  p_nome text,
  p_telefone text,
  p_optin boolean,
  p_origem text,
  p_atendido text default null
)
returns table (id uuid, inicio timestamptz, fim timestamptz, profissional text, servico text, preco numeric)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_salon uuid;
  v_fuso text;
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  -- Quem será atendido: outra pessoa (p_atendido) ou quem agenda, com o nome que digitou agora.
  v_atendido text := nullif(regexp_replace(trim(coalesce(p_atendido, '')), '\s+', ' ', 'g'), '');
  v_inicio timestamptz;
  v_client uuid;
  v_prof record;
  v_id uuid;
begin
  select s.id, s.fuso into v_salon, v_fuso from public.salons s where s.slug = p_slug and s.status = 'ativo';
  if v_salon is null then
    raise exception 'salao_nao_encontrado' using errcode = 'P0002';
  end if;

  if char_length(v_nome) not between 2 and 80 then
    raise exception 'nome_invalido' using errcode = '22023';
  end if;
  if v_atendido is not null and char_length(v_atendido) not between 2 and 80 then
    raise exception 'atendido_invalido' using errcode = '22023';
  end if;
  if p_telefone is null or p_telefone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'telefone_invalido' using errcode = '22023';
  end if;

  -- Limites: 5 agendamentos por hora por origem; 3 agendamentos futuros ativos por WhatsApp no salão.
  if p_origem is null or (
    select count(*) from app.agendamentos_publicos_por_origem o
    where o.chave = p_origem and o.em > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'muitas_tentativas' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.appointments a
    join public.clients c on c.id = a.client_id
    where c.salon_id = v_salon and c.telefone = p_telefone
      and a.status in ('agendado', 'confirmado') and a.inicio > now()
  ) >= 3 then
    raise exception 'muitos_agendamentos' using errcode = 'P0001';
  end if;

  v_inicio := p_inicio at time zone v_fuso;
  if v_inicio < now() + interval '30 minutes'
     or p_inicio::date > (now() at time zone v_fuso)::date + 60 then
    raise exception 'horario_indisponivel' using errcode = '23P01';
  end if;

  if not exists (
    select 1 from public.professional_services ps
    join public.professionals p on p.id = ps.professional_id and p.ativo
    join public.services sv on sv.id = ps.service_id and sv.ativo
    where ps.service_id = p_service and p.salon_id = v_salon
      and (p_professional is null or p.id = p_professional)
  ) then
    raise exception 'servico_nao_atendido' using errcode = '22023';
  end if;

  -- Cliente
  insert into public.clients (salon_id, nome, telefone)
  values (v_salon, v_nome, p_telefone)
  on conflict (salon_id, telefone) do nothing;
  select c.id into v_client from public.clients c where c.salon_id = v_salon and c.telefone = p_telefone;

  if coalesce(p_optin, false) then
    update public.clients c
    set consentimento_whatsapp_em = now(), consentimento_origem = 'pagina_publica'
    where c.id = v_client and c.optout_em is null;
  end if;

  -- Profissional: o escolhido, ou quem atende o serviço com menos agendamentos no dia.
  for v_prof in
    select p.id as professional_id, p.nome,
           coalesce(ps.duracao_min, sv.duracao_min) as duracao, coalesce(ps.preco, sv.preco) as preco,
           sv.nome as servico
    from public.professionals p
    join public.professional_services ps on ps.professional_id = p.id and ps.service_id = p_service
    join public.services sv on sv.id = ps.service_id and sv.ativo
    where p.salon_id = v_salon and p.ativo
      and (p_professional is null or p.id = p_professional)
    order by (
      select count(*) from public.appointments a
      where a.professional_id = p.id and a.status in ('agendado', 'confirmado')
        and (a.inicio at time zone v_fuso)::date = p_inicio::date
    ), p.nome
  loop
    continue when not app.dentro_do_expediente(
      v_prof.professional_id, v_inicio, v_inicio + make_interval(mins => v_prof.duracao)
    );
    begin
      insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem,
                                       atendido_nome)
      values (v_salon, v_prof.professional_id, p_service, v_client, v_inicio,
              v_inicio + make_interval(mins => v_prof.duracao), v_prof.preco, 'publico',
              coalesce(v_atendido, v_nome))
      returning appointments.id into v_id;
    exception when exclusion_violation then
      continue; -- ocupado (ou corrida com outro agendamento): tenta o próximo
    end;

    insert into app.agendamentos_publicos_por_origem (chave) values (p_origem);
    delete from app.agendamentos_publicos_por_origem o where o.em < now() - interval '1 day';

    return query select v_id, v_inicio, v_inicio + make_interval(mins => v_prof.duracao), v_prof.nome,
                        v_prof.servico, v_prof.preco;
    return;
  end loop;

  raise exception 'horario_indisponivel' using errcode = '23P01';
end;
$$;

revoke execute on function public.agendar_publico(text, uuid, uuid, timestamp, text, text, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.agendar_publico(text, uuid, uuid, timestamp, text, text, boolean, text, text)
  to service_role;

-- 2) agenda() e agendamento() devolvem `atendido` (nulo se o cliente foi anonimizado).
drop function public.agenda(uuid, date, date);

create function public.agenda(p_salon uuid, p_de date, p_ate date)
returns table (
  id uuid,
  professional_id uuid,
  inicio timestamptz,
  fim timestamptz,
  status public.appointment_status,
  origem public.appointment_origin,
  preco numeric,
  servico text,
  cliente_id uuid,
  cliente_nome text,
  cliente_telefone text,
  atendido text
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_fuso text;
  v_todos boolean;
begin
  if not exists (select 1 from app.my_salon_ids() m where m = p_salon) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 31 then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;

  select s.fuso into v_fuso from public.salons s where s.id = p_salon;
  v_todos := app.has_role(p_salon, array['dono', 'recepcao']::public.member_role[]);

  return query
  select
    a.id,
    a.professional_id,
    a.inicio,
    a.fim,
    a.status,
    a.origem,
    a.preco,
    sv.nome,
    case when v_todos then c.id end,
    case when c.anonimizado_em is null then c.nome else 'Cliente' end,
    case when v_todos then c.telefone end,
    case when c.anonimizado_em is null then a.atendido_nome end
  from public.appointments a
  join public.services sv on sv.id = a.service_id
  join public.clients c on c.id = a.client_id
  where a.salon_id = p_salon
    and a.inicio < ((p_ate + 1)::timestamp at time zone v_fuso)
    and a.fim > (p_de::timestamp at time zone v_fuso)
    and (v_todos or a.professional_id in (select app.my_professional_ids()))
  order by a.inicio, a.id;
end;
$$;

revoke execute on function public.agenda(uuid, date, date) from public, anon;
grant execute on function public.agenda(uuid, date, date) to authenticated;

drop function public.agendamento(uuid);

create function public.agendamento(p_appointment uuid)
returns table (
  id uuid,
  salon_id uuid,
  professional_id uuid,
  profissional text,
  service_id uuid,
  servico text,
  inicio timestamptz,
  fim timestamptz,
  status public.appointment_status,
  origem public.appointment_origin,
  preco numeric,
  criado_em timestamptz,
  cliente_id uuid,
  cliente_nome text,
  cliente_telefone text,
  atendido text
)
language sql stable security definer set search_path = ''
as $$
  select
    a.id,
    a.salon_id,
    a.professional_id,
    p.nome,
    a.service_id,
    sv.nome,
    a.inicio,
    a.fim,
    a.status,
    a.origem,
    a.preco,
    a.created_at,
    case when app.has_role(a.salon_id, array['dono', 'recepcao']::public.member_role[]) then c.id end,
    case when c.anonimizado_em is null then c.nome else 'Cliente' end,
    case when app.has_role(a.salon_id, array['dono', 'recepcao']::public.member_role[]) then c.telefone end,
    case when c.anonimizado_em is null then a.atendido_nome end
  from public.appointments a
  join public.professionals p on p.id = a.professional_id
  join public.services sv on sv.id = a.service_id
  join public.clients c on c.id = a.client_id
  where a.id = p_appointment
    and app.pode_mexer_no_agendamento(a.salon_id, a.professional_id)
$$;

revoke execute on function public.agendamento(uuid) from public, anon;
grant execute on function public.agendamento(uuid) to authenticated;

-- 3) LGPD: a anonimização apaga o nome de quem foi atendido; a exportação o inclui.
create or replace function app.anonimizar_cliente(p_client uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_cancelados int;
begin
  perform 1 from public.clients c
  where c.id = p_client and c.anonimizado_em is null
  for update;
  if not found then
    return null;
  end if;

  update public.appointments a
  set status = 'cancelado'
  where a.client_id = p_client
    and a.status in ('agendado', 'confirmado')
    and a.inicio > now();
  get diagnostics v_cancelados = row_count;

  update public.appointments a
  set atendido_nome = null
  where a.client_id = p_client and a.atendido_nome is not null;

  update public.clients c
  set nome = 'Cliente anonimizado',
      telefone = null,
      observacoes = null,
      consentimento_whatsapp_em = null,
      consentimento_origem = null,
      optout_em = null,
      anonimizado_em = now()
  where c.id = p_client;

  return v_cancelados;
end;
$$;

create or replace function public.exportar_cliente(p_client uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cliente public.clients%rowtype;
  v_resultado jsonb;
begin
  select * into v_cliente
  from public.clients c
  where c.id = p_client and c.anonimizado_em is null;

  if v_cliente.id is null then
    raise exception 'cliente_nao_encontrado' using errcode = 'P0002';
  end if;
  if not app.has_role(v_cliente.salon_id, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'gerado_em', now(),
    'controlador', jsonb_build_object(
      'nome', s.nome,
      'whatsapp', s.whatsapp,
      'email', s.email
    ),
    'operador', 'AgendOn (agendon.app.br)',
    'cliente', jsonb_build_object(
      'nome', v_cliente.nome,
      'whatsapp', v_cliente.telefone,
      'observacoes', v_cliente.observacoes,
      'cadastrado_em', v_cliente.created_at,
      'consentimento_whatsapp_em', v_cliente.consentimento_whatsapp_em,
      'consentimento_origem', v_cliente.consentimento_origem,
      'optout_em', v_cliente.optout_em
    ),
    'agendamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'inicio', a.inicio,
        'fim', a.fim,
        'servico', sv.nome,
        'profissional', p.nome,
        'atendido', a.atendido_nome,
        'preco', a.preco,
        'status', a.status,
        'origem', a.origem,
        'criado_em', a.created_at
      ) order by a.inicio)
      from public.appointments a
      join public.services sv on sv.id = a.service_id
      join public.professionals p on p.id = a.professional_id
      where a.client_id = v_cliente.id and a.salon_id = v_cliente.salon_id
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.salons s
  where s.id = v_cliente.salon_id;

  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  values (v_cliente.salon_id, (select auth.uid()), 'exportar', 'clients', p_client);

  return v_resultado;
end;
$$;
