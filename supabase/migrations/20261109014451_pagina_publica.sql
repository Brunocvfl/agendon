-- Página pública de agendamento (agendon.app.br/<slug>).
-- As funções abaixo são chamadas só pelo servidor do app (service_role), que confere o CAPTCHA
-- antes de agendar. O papel anon continua sem permissão em nada, e nenhuma tabela é lida direto.
-- Regras: só salão ativo; dias de hoje até hoje + 60 (no fuso do salão); início a partir de
-- agora + 30 min; "qualquer profissional" escolhe quem tem menos agendamentos no dia.

-- 1) Agendamentos públicos bem-sucedidos por origem (hash do IP), para limitar abuso.
--    Tabela de infraestrutura (sem salon_id), fora do schema exposto pela API; RLS ligada e sem policies.
create table app.agendamentos_publicos_por_origem (
  id bigint generated always as identity primary key,
  chave text not null,
  em timestamptz not null default now()
);
create index agendamentos_publicos_por_origem_chave_idx on app.agendamentos_publicos_por_origem (chave, em);
create index agendamentos_publicos_por_origem_em_idx on app.agendamentos_publicos_por_origem (em);
alter table app.agendamentos_publicos_por_origem enable row level security;
revoke all on app.agendamentos_publicos_por_origem from public, anon, authenticated;

-- 2) Dados da página: salão, serviços com alguém que atende e profissionais com horário.
--    Devolve null se o slug não existe ou o salão não está ativo.
create function public.pagina_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with salao as (
    select s.id, s.nome, s.endereco, s.fuso from public.salons s where s.slug = p_slug and s.status = 'ativo'
  ),
  atende as (
    -- (profissional, serviço) que podem ser agendados: ambos ativos e o profissional tem horário.
    select p.id as professional_id, p.nome as profissional, sv.id as service_id,
           coalesce(ps.duracao_min, sv.duracao_min) as duracao_min, coalesce(ps.preco, sv.preco) as preco
    from salao s
    join public.professionals p on p.salon_id = s.id and p.ativo
    join public.professional_services ps on ps.professional_id = p.id
    join public.services sv on sv.id = ps.service_id and sv.ativo
    where exists (select 1 from public.working_hours wh where wh.professional_id = p.id)
  )
  select jsonb_build_object(
    'salao', jsonb_build_object('nome', s.nome, 'endereco', s.endereco, 'fuso', s.fuso),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', sv.id, 'nome', sv.nome, 'duracao_min', sv.duracao_min, 'preco', sv.preco)
                       order by sv.nome)
      from public.services sv
      where sv.salon_id = s.id and sv.ativo and exists (select 1 from atende a where a.service_id = sv.id)
    ), '[]'::jsonb),
    'profissionais', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.professional_id, 'nome', x.profissional, 'servicos', x.servicos)
                       order by x.profissional)
      from (
        select a.professional_id, a.profissional,
               jsonb_agg(jsonb_build_object('id', a.service_id, 'duracao_min', a.duracao_min, 'preco', a.preco)) as servicos
        from atende a
        group by a.professional_id, a.profissional
      ) x
    ), '[]'::jsonb)
  )
  from salao s
$$;

-- 3) Horários livres de um dia para um serviço, de um profissional ou de qualquer um (p_professional null).
create function public.horarios_publicos(p_slug text, p_service uuid, p_professional uuid, p_dia date)
returns setof timestamptz
language sql stable security definer set search_path = ''
as $$
  select distinct h.inicio
  from public.salons s
  join public.professionals p on p.salon_id = s.id and p.ativo
  cross join lateral public.horarios_livres(p.id, p_service, p_dia) as h(inicio)
  where s.slug = p_slug
    and s.status = 'ativo'
    and (p_professional is null or p.id = p_professional)
    and p_dia between (now() at time zone s.fuso)::date and (now() at time zone s.fuso)::date + 60
    and h.inicio >= now() + interval '30 minutes'
  order by 1
$$;

-- 4) Agendamento pela página pública.
--    p_inicio no horário local do salão. Cliente pelo WhatsApp (E.164): se já existe no salão, usa o
--    cadastro (sem trocar o nome); senão cria. p_optin grava o consentimento do WhatsApp (data e origem).
--    p_origem: hash do IP de quem agendou (o app calcula; o IP não é gravado).
--    Erros: salao_nao_encontrado (P0002), nome_invalido / telefone_invalido / servico_nao_atendido (22023),
--    horario_indisponivel (23P01: o app oferece outros horários), muitos_agendamentos (P0001).
create function public.agendar_publico(
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
    raise exception 'muitos_agendamentos' using errcode = 'P0001';
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

revoke execute on function public.pagina_publica(text) from public, anon, authenticated;
revoke execute on function public.horarios_publicos(text, uuid, uuid, date) from public, anon, authenticated;
revoke execute on function public.agendar_publico(text, uuid, uuid, timestamp, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.pagina_publica(text) to service_role;
grant execute on function public.horarios_publicos(text, uuid, uuid, date) to service_role;
grant execute on function public.agendar_publico(text, uuid, uuid, timestamp, text, text, boolean, text)
  to service_role;
