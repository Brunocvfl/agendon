-- Planos (AGE-15): teste grátis, limite de agendas e franquia de mensagens do WhatsApp.
-- - subscriptions (uma linha por salão, criada pelo create_salon) passa a dizer o plano e os limites.
--   Salão novo: plano `teste`, 30 dias, até 15 agendas e 10 mensagens (só confirmação).
--   Salões que já existiam: `cortesia`, sem limite (piloto e demonstração), até trocar à mão.
--   Sem linha em subscriptions = sem limite (salões criados direto no banco, como nos testes).
--   Escrita só pelo servidor (service_role), como antes; o Dono(a) lê.
-- - Franquia: mensagens que saíram (enviando, enviada, entregue, lida) desde o início do período. No teste,
--   o período é o teste inteiro; nos planos pagos, o mês do calendário no fuso do salão. Confirmação tem
--   10% de tolerância além da franquia; lembrete para na franquia; no teste só há confirmação.
-- - whatsapp_reservar descarta (falhou, `franquia_esgotada`) o que passou do limite e nunca reserva além dele.
-- - Teste encerrado: a página pública não aceita agendamento (pagina_publica devolve
--   `aceita_agendamento` = false; gatilho recusa com `agendamento_indisponivel`), as mensagens param e o
--   painel continua funcionando.
-- - Agendas: profissional ativo. Ativar além de `max_agendas` = P0001 `limite_de_agendas`.
-- - salons.plano (nunca usado, sempre 'solo') sai: o plano mora em subscriptions.

-- 1) Plano e limites.
alter table public.salons drop column plano;

alter table public.subscriptions
  drop column max_agendamentos_mes,
  drop column ciclo_inicio,
  add column max_mensagens int,
  add column teste_ate timestamptz,
  add column criada_em timestamptz not null default now(),
  alter column max_agendas drop not null;

insert into public.subscriptions (salon_id)
select s.id from public.salons s
where not exists (select 1 from public.subscriptions x where x.salon_id = s.id);

update public.subscriptions set plano = 'cortesia', max_agendas = null, max_mensagens = null, teste_ate = null;

-- Padrão = teste grátis (o create_salon só informa o salon_id).
alter table public.subscriptions
  alter column plano set default 'teste',
  alter column max_agendas set default 15,
  alter column max_mensagens set default 10,
  alter column teste_ate set default now() + interval '30 days',
  add constraint subscriptions_plano_valido
    check (plano in ('teste', 'essencial', 'salao', 'salao_mais', 'sob_consulta', 'cortesia')),
  add constraint subscriptions_teste_com_prazo check ((plano = 'teste') = (teste_ate is not null)),
  add constraint subscriptions_max_agendas_valido check (max_agendas is null or max_agendas >= 1),
  add constraint subscriptions_max_mensagens_valido check (max_mensagens is null or max_mensagens >= 0);

-- 2) Regras do plano (só para uso interno das funções SECURITY DEFINER).

-- Teste grátis vencido.
create function app.teste_encerrado(p_salon uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions x
    where x.salon_id = p_salon and x.plano = 'teste' and x.teste_ate <= now()
  )
$$;

-- Início do período da franquia: o teste inteiro, ou o 1º dia do mês no fuso do salão.
create function app.inicio_da_franquia(p_salon uuid)
returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select case
    when x.plano = 'teste' then x.criada_em
    else date_trunc('month', now() at time zone s.fuso) at time zone s.fuso
  end
  from public.salons s
  left join public.subscriptions x on x.salon_id = s.id
  where s.id = p_salon
$$;

-- Mensagens que já saíram (ou estão saindo) no período.
create function app.mensagens_usadas(p_salon uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int
  from public.message_log m
  where m.salon_id = p_salon
    and m.status in ('enviando', 'enviada', 'entregue', 'lida')
    and coalesce(m.enviada_em, m.atualizada_em) >= app.inicio_da_franquia(p_salon)
$$;

-- Quantas mensagens do tipo o período comporta (nulo = sem limite).
create function app.mensagens_permitidas(p_salon uuid, p_tipo text)
returns int
language sql stable security definer set search_path = ''
as $$
  select case
    when x.salon_id is null or x.max_mensagens is null then null
    when x.plano = 'teste' and (x.teste_ate <= now() or p_tipo <> 'confirmacao') then 0
    when x.plano = 'teste' then x.max_mensagens
    when p_tipo = 'confirmacao' then floor(x.max_mensagens * 1.1)::int
    else x.max_mensagens
  end
  from (select p_salon as id) s
  left join public.subscriptions x on x.salon_id = s.id
$$;

-- Ainda cabe mais uma mensagem do tipo agora.
create function app.cabe_mensagem(p_salon uuid, p_tipo text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(app.mensagens_usadas(p_salon) < app.mensagens_permitidas(p_salon, p_tipo), true)
$$;

revoke execute on function app.teste_encerrado(uuid), app.inicio_da_franquia(uuid), app.mensagens_usadas(uuid),
  app.mensagens_permitidas(uuid, text), app.cabe_mensagem(uuid, text) from public, anon, authenticated;

-- 3) Enfileirar só o que o plano permite (não polui "Mensagens no WhatsApp" com o que nunca sairia).
create or replace function app.enfileirar_confirmacao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'agendado' and app.cabe_mensagem(new.salon_id, 'confirmacao') and exists (
    select 1 from public.clients c
    where c.id = new.client_id and c.salon_id = new.salon_id
      and c.telefone is not null
      and c.consentimento_whatsapp_em is not null
      and c.optout_em is null
      and c.anonimizado_em is null
  ) then
    insert into public.message_log (salon_id, appointment_id, client_id, tipo, template)
    values (new.salon_id, new.id, new.client_id, 'confirmacao', 'confirmacao_agendamento_v2')
    on conflict (appointment_id, tipo) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function app.enfileirar_confirmacao() from public, anon, authenticated;

create or replace function app.enfileirar_lembretes()
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
    and app.cabe_mensagem(s.id, 'lembrete')
  on conflict (appointment_id, tipo) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function app.enfileirar_lembretes() from public, anon, authenticated;

-- 4) Reservar: como na migration 21, mais a franquia (descarta o que não cabe e não reserva além dela).
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

  update public.message_log m
  set status = 'falhou', erro = 'franquia_esgotada', atualizada_em = now()
  where m.status = 'na_fila' and not app.cabe_mensagem(m.salon_id, m.tipo);

  return query
  with pegas as (
    select m.id, m.salon_id, m.tipo, m.created_at
    from public.message_log m
    where m.status = 'na_fila' and m.tentativas < 3
    order by m.created_at
    limit greatest(least(coalesce(p_limite, 10), 50), 1)
    for update skip locked
  ),
  -- Dentro do lote, cada salão leva só o que ainda cabe na franquia (o resto fica para o próximo descarte).
  ordem as (
    select p.id, p.salon_id, p.tipo, row_number() over (partition by p.salon_id order by p.created_at) as n
    from pegas p
  ),
  escolhidas as (
    select o.id from ordem o
    where app.mensagens_permitidas(o.salon_id, o.tipo) is null
       or app.mensagens_usadas(o.salon_id) + o.n <= app.mensagens_permitidas(o.salon_id, o.tipo)
  ),
  marcadas as (
    update public.message_log m
    set status = 'enviando', tentativas = m.tentativas + 1, atualizada_em = now()
    from escolhidas e
    where m.id = e.id
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

-- 5) Limite de agendas: ativar um profissional além do plano é recusado.
create function app.guarda_limite_de_agendas()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_max int;
begin
  if new.ativo and (tg_op = 'INSERT' or not old.ativo) then
    -- Trava a linha do plano: dois cadastros ao mesmo tempo não passam juntos do limite.
    select x.max_agendas into v_max from public.subscriptions x where x.salon_id = new.salon_id for update;
    if v_max is not null and (
      select count(*) from public.professionals p
      where p.salon_id = new.salon_id and p.ativo and p.id <> new.id
    ) >= v_max then
      raise exception 'limite_de_agendas' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function app.guarda_limite_de_agendas() from public, anon, authenticated;

create trigger professionals_limite_de_agendas
  before insert or update of ativo on public.professionals
  for each row execute function app.guarda_limite_de_agendas();

-- 6) Teste encerrado: a página pública não aceita agendamento.
create function app.guarda_agendamento_publico()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.origem = 'publico' and app.teste_encerrado(new.salon_id) then
    raise exception 'agendamento_indisponivel' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function app.guarda_agendamento_publico() from public, anon, authenticated;

create trigger appointments_publico_no_plano
  before insert on public.appointments
  for each row execute function app.guarda_agendamento_publico();

-- pagina_publica (como na migration 26) diz se o salão aceita agendamento agora.
create or replace function public.pagina_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with salao as (
    select s.* from public.salons s where s.slug = p_slug and s.status = 'ativo'
  ),
  atende as (
    -- (profissional, serviço) que podem ser agendados: ambos ativos e o profissional tem horário.
    select p.id as professional_id, p.nome as profissional, p.foto_path, sv.id as service_id,
           coalesce(ps.duracao_min, sv.duracao_min) as duracao_min, coalesce(ps.preco, sv.preco) as preco
    from salao s
    join public.professionals p on p.salon_id = s.id and p.ativo
    join public.professional_services ps on ps.professional_id = p.id
    join public.services sv on sv.id = ps.service_id and sv.ativo
    where exists (select 1 from public.working_hours wh where wh.professional_id = p.id)
  )
  select jsonb_build_object(
    'salao', jsonb_build_object(
      'nome', s.nome, 'fuso', s.fuso, 'whatsapp', s.whatsapp, 'instagram', s.instagram, 'logo_path', s.logo_path,
      'endereco', jsonb_build_object(
        'logradouro', s.logradouro, 'numero', s.numero, 'complemento', s.complemento,
        'bairro', s.bairro, 'cidade', s.cidade, 'uf', s.uf, 'cep', s.cep)),
    'aceita_agendamento', not app.teste_encerrado(s.id),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', sv.id, 'nome', sv.nome, 'duracao_min', sv.duracao_min, 'preco', sv.preco)
                       order by sv.nome)
      from public.services sv
      where sv.salon_id = s.id and sv.ativo and exists (select 1 from atende a where a.service_id = sv.id)
    ), '[]'::jsonb),
    'profissionais', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.professional_id, 'nome', x.profissional, 'foto_path', x.foto_path, 'servicos', x.servicos)
                       order by x.profissional)
      from (
        select a.professional_id, a.profissional, a.foto_path,
               jsonb_agg(jsonb_build_object('id', a.service_id, 'duracao_min', a.duracao_min, 'preco', a.preco)) as servicos
        from atende a
        group by a.professional_id, a.profissional, a.foto_path
      ) x
    ), '[]'::jsonb)
  )
  from salao s
$$;

-- 7) Painel: o plano do salão e o uso (só Dono(a)).
create function public.meu_plano(p_salon uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
begin
  if not app.has_role(p_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'plano', coalesce(x.plano, 'cortesia'),
    'teste_ate', x.teste_ate,
    'teste_encerrado', app.teste_encerrado(p_salon),
    'max_agendas', x.max_agendas,
    'agendas', (select count(*)::int from public.professionals p where p.salon_id = p_salon and p.ativo),
    'max_mensagens', x.max_mensagens,
    'mensagens', app.mensagens_usadas(p_salon),
    'inicio_franquia', app.inicio_da_franquia(p_salon)
  ) into v
  from (select p_salon as id) s
  left join public.subscriptions x on x.salon_id = s.id;

  return v;
end;
$$;

revoke execute on function public.meu_plano(uuid) from public, anon;
grant execute on function public.meu_plano(uuid) to authenticated;
