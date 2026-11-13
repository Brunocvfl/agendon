-- Página pública: os dois limites de agendamento passam a ter erros diferentes, para o app explicar cada um.
--   muitas_tentativas (P0001): 5 agendamentos na última hora vindos da mesma origem (hash do IP).
--   muitos_agendamentos (P0001): o WhatsApp já tem 3 agendamentos futuros ativos no salão.
-- O resto da função é igual ao da migration 20261109014451_pagina_publica.sql (grants mantidos pelo create or replace).

create or replace function public.agendar_publico(
  p_slug text,
  p_service uuid,
  p_professional uuid,
  p_inicio timestamp,
  p_nome text,
  p_telefone text,
  p_optin boolean,
  p_origem text
)
returns table (id uuid, inicio timestamptz, fim timestamptz, profissional text, servico text, preco numeric)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_salon uuid;
  v_fuso text;
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
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
    set consentimento_whatsapp_em = now(), consentimento_origem = 'pagina_publica', optout_em = null
    where c.id = v_client;
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
      insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem)
      values (v_salon, v_prof.professional_id, p_service, v_client, v_inicio,
              v_inicio + make_interval(mins => v_prof.duracao), v_prof.preco, 'publico')
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
