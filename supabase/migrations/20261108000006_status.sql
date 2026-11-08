-- Status e remarcação pelo painel.
-- Agendamento só muda pelas funções abaixo (o UPDATE direto sai do authenticated): as regras de
-- transição, quem pode e o que pode mudar ficam no banco. Agendamento nunca é apagado.

revoke update on public.appointments from authenticated;
drop policy appointments_update on public.appointments;

-- 1) Quem pode mexer neste agendamento: Dono(a) e Recepção do salão, ou o Profissional dono da agenda.
create function app.pode_mexer_no_agendamento(p_salon uuid, p_professional uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.has_role(p_salon, array['dono', 'recepcao']::public.member_role[])
    or (
      app.has_role(p_salon, array['profissional']::public.member_role[])
      and p_professional in (select app.my_professional_ids())
    )
$$;

revoke execute on function app.pode_mexer_no_agendamento(uuid, uuid) from public, anon;
grant execute on function app.pode_mexer_no_agendamento(uuid, uuid) to authenticated;

-- 2) Muda o status. Transições:
--    agendado → confirmado; agendado/confirmado → cancelado (a qualquer momento);
--    agendado/confirmado → concluido/faltou (só depois do início);
--    cancelado/faltou → agendado (corrige um clique errado; 23P01 se o horário foi ocupado).
--    Concluído é final.
create function public.mudar_status(p_appointment uuid, p_status public.appointment_status)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.appointments%rowtype;
begin
  select * into v from public.appointments a where a.id = p_appointment for update;

  if v.id is null or not exists (select 1 from app.my_salon_ids() m where m = v.salon_id) then
    raise exception 'agendamento_nao_encontrado' using errcode = 'P0002';
  end if;

  if not app.pode_mexer_no_agendamento(v.salon_id, v.professional_id) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if not (
    (v.status = 'agendado' and p_status = 'confirmado')
    or (v.status in ('agendado', 'confirmado') and p_status in ('cancelado', 'concluido', 'faltou'))
    or (v.status in ('cancelado', 'faltou') and p_status = 'agendado')
  ) then
    raise exception 'transicao_invalida' using errcode = '22023';
  end if;

  if p_status in ('concluido', 'faltou') and v.inicio > now() then
    raise exception 'ainda_nao_comecou' using errcode = '22023';
  end if;

  update public.appointments set status = p_status where id = v.id;
end;
$$;

-- 3) Remarca: novo dia/hora (horário local do salão) e, opcionalmente, outro profissional.
--    Mantém serviço, cliente e preço. Mesmo profissional: mantém a duração; outro profissional:
--    precisa fazer o serviço e a duração passa a ser a dele. Só agendado/confirmado; volta a "agendado"
--    (a confirmação era para o horário antigo). Profissional remarca só dentro da própria agenda.
--    Fora do expediente ou numa folga: só com p_encaixe. Conflito: 23P01.
create function public.remarcar_agendamento(
  p_appointment uuid,
  p_professional uuid,
  p_inicio timestamp,
  p_encaixe boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.appointments%rowtype;
  v_fuso text;
  v_duracao int;
  v_inicio timestamptz;
  v_fim timestamptz;
begin
  select * into v from public.appointments a where a.id = p_appointment for update;

  if v.id is null or not exists (select 1 from app.my_salon_ids() m where m = v.salon_id) then
    raise exception 'agendamento_nao_encontrado' using errcode = 'P0002';
  end if;

  if not app.pode_mexer_no_agendamento(v.salon_id, v.professional_id)
     or not app.pode_mexer_no_agendamento(v.salon_id, p_professional) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if v.status not in ('agendado', 'confirmado') then
    raise exception 'transicao_invalida' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.professionals p where p.id = p_professional and p.salon_id = v.salon_id and p.ativo
  ) then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  if p_professional = v.professional_id then
    v_duracao := extract(epoch from (v.fim - v.inicio))::int / 60;
  else
    select coalesce(ps.duracao_min, sv.duracao_min) into v_duracao
    from public.professional_services ps
    join public.services sv on sv.id = ps.service_id
    where ps.professional_id = p_professional and ps.service_id = v.service_id;

    if v_duracao is null then
      raise exception 'servico_nao_atendido' using errcode = '22023';
    end if;
  end if;

  select s.fuso into v_fuso from public.salons s where s.id = v.salon_id;
  v_inicio := p_inicio at time zone v_fuso;
  v_fim := v_inicio + make_interval(mins => v_duracao);

  if not coalesce(p_encaixe, false) and not app.dentro_do_expediente(p_professional, v_inicio, v_fim) then
    raise exception 'fora_do_expediente' using errcode = '22023';
  end if;

  update public.appointments
  set professional_id = p_professional, inicio = v_inicio, fim = v_fim, status = 'agendado'
  where id = v.id;
end;
$$;

-- 4) Horários livres: p_ignorar tira um agendamento da conta (o que está sendo remarcado).
drop function public.horarios_livres(uuid, uuid, date);
create function public.horarios_livres(p_professional uuid, p_service uuid, p_dia date, p_ignorar uuid default null)
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
        and a.id is distinct from p_ignorar
        and tstzrange(a.inicio, a.fim) && tstzrange(c.inicio, c.inicio + make_interval(mins => c.duracao))
    )
  order by c.inicio
$$;

-- 5) Um agendamento, com as mesmas regras de leitura de agenda(): Profissional só os da própria agenda,
--    com o nome do cliente e sem telefone/id.
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
  cliente_telefone text
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
    case when app.has_role(a.salon_id, array['dono', 'recepcao']::public.member_role[]) then c.telefone end
  from public.appointments a
  join public.professionals p on p.id = a.professional_id
  join public.services sv on sv.id = a.service_id
  join public.clients c on c.id = a.client_id
  where a.id = p_appointment
    and app.pode_mexer_no_agendamento(a.salon_id, a.professional_id)
$$;

revoke execute on function public.mudar_status(uuid, public.appointment_status) from public, anon;
revoke execute on function public.remarcar_agendamento(uuid, uuid, timestamp, boolean) from public, anon;
revoke execute on function public.horarios_livres(uuid, uuid, date, uuid) from public, anon;
revoke execute on function public.agendamento(uuid) from public, anon;
grant execute on function public.mudar_status(uuid, public.appointment_status) to authenticated;
grant execute on function public.remarcar_agendamento(uuid, uuid, timestamp, boolean) to authenticated;
grant execute on function public.horarios_livres(uuid, uuid, date, uuid) to authenticated;
grant execute on function public.agendamento(uuid) to authenticated;
