-- Agenda: preço gravado no agendamento, criação pelo painel (com encaixe), horários livres
-- e a leitura da agenda (Profissional vê o nome do cliente, nunca o telefone).

-- 1) Preço do serviço no momento do agendamento (o preço do serviço pode mudar depois).
alter table public.appointments
  add column preco numeric(10, 2) not null default 0 check (preco >= 0);

-- 2) O intervalo [inicio, fim) cabe no expediente do profissional e não cai numa folga?
--    Expediente: working_hours no dia da semana local do salão; folga: time_off.
--    SECURITY INVOKER: quem chama precisa poder ler horários e folgas (todo membro do salão pode).
create function app.dentro_do_expediente(p_professional uuid, p_inicio timestamptz, p_fim timestamptz)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  with local as (
    select
      (p_inicio at time zone s.fuso) as ini,
      extract(epoch from (p_fim - p_inicio))::int / 60 as duracao
    from public.professionals p
    join public.salons s on s.id = p.salon_id
    where p.id = p_professional
  )
  select
    exists (
      select 1
      from public.working_hours wh, local l
      where wh.professional_id = p_professional
        and wh.dia_semana = extract(dow from l.ini)
        and extract(hour from wh.inicio) * 60 + extract(minute from wh.inicio)
            <= extract(hour from l.ini) * 60 + extract(minute from l.ini)
        and extract(hour from l.ini) * 60 + extract(minute from l.ini) + l.duracao
            <= extract(hour from wh.fim) * 60 + extract(minute from wh.fim)
    )
    and not exists (
      select 1
      from public.time_off t
      where t.professional_id = p_professional
        and tstzrange(t.inicio, t.fim) && tstzrange(p_inicio, p_fim)
    )
$$;

revoke execute on function app.dentro_do_expediente(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function app.dentro_do_expediente(uuid, timestamptz, timestamptz) to authenticated;

-- 3) Cria um agendamento pelo painel (Dono(a) e Recepção).
--    p_inicio vem no horário local do salão; duração e preço vêm do serviço (ou do ajuste do profissional).
--    Cliente: p_client (existente) ou p_cliente_nome + p_cliente_telefone (novo; se o WhatsApp já existe
--    no salão, usa esse cliente). Fora do expediente ou numa folga: só com p_encaixe.
--    Conflito de horário: a restrição appointments_no_overlap responde 23P01.
create function public.criar_agendamento(
  p_professional uuid,
  p_service uuid,
  p_inicio timestamp,
  p_client uuid default null,
  p_cliente_nome text default null,
  p_cliente_telefone text default null,
  p_encaixe boolean default false
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_salon uuid;
  v_fuso text;
  v_duracao int;
  v_preco numeric(10, 2);
  v_inicio timestamptz;
  v_fim timestamptz;
  v_client uuid := p_client;
  v_id uuid;
begin
  select p.salon_id, s.fuso into v_salon, v_fuso
  from public.professionals p
  join public.salons s on s.id = p.salon_id
  where p.id = p_professional and p.ativo;

  if v_salon is null then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  if not app.has_role(v_salon, array['dono', 'recepcao']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  select coalesce(ps.duracao_min, sv.duracao_min), coalesce(ps.preco, sv.preco)
    into v_duracao, v_preco
  from public.professional_services ps
  join public.services sv on sv.id = ps.service_id
  where ps.professional_id = p_professional and ps.service_id = p_service and sv.ativo;

  if v_duracao is null then
    raise exception 'servico_nao_atendido' using errcode = '22023';
  end if;

  v_inicio := p_inicio at time zone v_fuso;
  v_fim := v_inicio + make_interval(mins => v_duracao);

  if not coalesce(p_encaixe, false) and not app.dentro_do_expediente(p_professional, v_inicio, v_fim) then
    raise exception 'fora_do_expediente' using errcode = '22023';
  end if;

  if v_client is null then
    if p_cliente_nome is null or p_cliente_telefone is null then
      raise exception 'cliente_obrigatorio' using errcode = '22023';
    end if;
    insert into public.clients (salon_id, nome, telefone)
    values (v_salon, trim(p_cliente_nome), p_cliente_telefone)
    on conflict (salon_id, telefone) do nothing;
    select c.id into v_client from public.clients c where c.salon_id = v_salon and c.telefone = p_cliente_telefone;
  end if;

  -- A FK composta (client_id, salon_id) recusa cliente de outro salão.
  insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem)
  values (v_salon, p_professional, p_service, v_client, v_inicio, v_fim, v_preco, 'painel')
  returning id into v_id;

  return v_id;
end;
$$;

-- 4) Horários livres de um profissional para um serviço num dia (horário local do salão),
--    de 15 em 15 minutos: dentro do expediente, fora das folgas, sem conflito e a partir de agora.
create function public.horarios_livres(p_professional uuid, p_service uuid, p_dia date)
returns setof timestamptz
language sql stable security invoker set search_path = ''
as $$
  with base as (
    select s.fuso, coalesce(ps.duracao_min, sv.duracao_min) as duracao
    from public.professionals p
    join public.salons s on s.id = p.salon_id
    join public.professional_services ps on ps.professional_id = p.id and ps.service_id = p_service
    join public.services sv on sv.id = ps.service_id and sv.ativo
    where p.id = p_professional and p.ativo
  ),
  candidatos as (
    select t at time zone b.fuso as inicio, b.duracao
    from base b
    join public.working_hours wh on wh.professional_id = p_professional and wh.dia_semana = extract(dow from p_dia)
    cross join lateral generate_series(
      p_dia + wh.inicio,
      p_dia + wh.fim - make_interval(mins => b.duracao),
      interval '15 minutes'
    ) as t
  )
  select c.inicio
  from candidatos c
  where c.inicio >= now()
    and not exists (
      select 1 from public.time_off t
      where t.professional_id = p_professional
        and tstzrange(t.inicio, t.fim) && tstzrange(c.inicio, c.inicio + make_interval(mins => c.duracao))
    )
    and not exists (
      select 1 from public.appointments a
      where a.professional_id = p_professional
        and a.status in ('agendado', 'confirmado', 'concluido')
        and tstzrange(a.inicio, a.fim) && tstzrange(c.inicio, c.inicio + make_interval(mins => c.duracao))
    )
  order by c.inicio
$$;

-- 5) Agenda de um período (datas locais do salão, até 31 dias).
--    SECURITY DEFINER para devolver o NOME do cliente ao Profissional (a RLS de clients o bloqueia),
--    sem o telefone nem o id. As regras de acesso estão aqui:
--    Dono(a) e Recepção veem todos os profissionais; Profissional, só a própria agenda.
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
  cliente_telefone text
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
    case when v_todos then c.telefone end
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

revoke execute on function public.criar_agendamento(uuid, uuid, timestamp, uuid, text, text, boolean) from public, anon;
revoke execute on function public.horarios_livres(uuid, uuid, date) from public, anon;
revoke execute on function public.agenda(uuid, date, date) from public, anon;
grant execute on function public.criar_agendamento(uuid, uuid, timestamp, uuid, text, text, boolean) to authenticated;
grant execute on function public.horarios_livres(uuid, uuid, date) to authenticated;
grant execute on function public.agenda(uuid, date, date) to authenticated;
