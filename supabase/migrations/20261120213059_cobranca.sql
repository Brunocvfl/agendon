-- Cobrança pelo Mercado Pago (AGE-14, fatia 1): catálogo, pagamentos e situação da cobrança.
-- - app.limites_do_plano: agendas e mensagens de cada plano pago (preços ficam no app, que cria o checkout).
-- - subscriptions ganha ciclo (mensal/anual), forma (cartao = Assinaturas do MP; avulso = Pix/débito
--   pelo Checkout Pro), pago_ate, o id da assinatura no MP e plano_proximo (descer de plano vale no
--   próximo ciclo).
-- - pagamentos: cada pagamento do MP (id do MP único = idempotência), sem dado pessoal. Dono(a) lê;
--   escrita só por cobranca_registrar_pagamento (service_role), chamada pelo webhook depois de buscar o
--   pagamento na API do MP.
-- - app.situacao_cobranca (regra da AGE-13, contada de pago_ate): em_dia, tolerancia (até 7 dias),
--   leitura (8–30: painel só lê, sem mensagens), pagina_fechada (31–89), suspensa (90+); teste_encerrado.
-- - Efeitos no banco: sem mensagens a partir de `leitura`; página pública fechada no teste encerrado, em
--   `pagina_fechada` e `suspensa`. O painel só para leitura é aplicado pelo app (fatia 2).
-- - Pacote extra: cada pacote aprovado no mês soma 200 mensagens à franquia do mês.

-- 1) Catálogo (limites).
create function app.limites_do_plano(p_plano text, out max_agendas int, out max_mensagens int)
language sql immutable set search_path = ''
as $$
  select c.agendas, c.mensagens from (values
    ('essencial', 1, 300),
    ('salao', 5, 1200),
    ('salao_mais', 15, 3000)
  ) as c (plano, agendas, mensagens)
  where c.plano = p_plano
$$;

revoke execute on function app.limites_do_plano(text) from public, anon, authenticated;

-- 2) Assinatura.
alter table public.subscriptions
  add column ciclo text,
  add column forma text,
  add column pago_ate timestamptz,
  add column mp_assinatura_id text unique,
  add column plano_proximo text,
  add constraint subscriptions_ciclo_valido check (ciclo is null or ciclo in ('mensal', 'anual')),
  add constraint subscriptions_forma_valida check (forma is null or forma in ('cartao', 'avulso')),
  add constraint subscriptions_plano_proximo_valido
    check (plano_proximo is null or plano_proximo in ('essencial', 'salao', 'salao_mais'));

-- 3) Pagamentos.
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  mp_id text not null unique,
  tipo text not null check (tipo in ('assinatura', 'avulso', 'pacote')),
  plano text check (plano is null or plano in ('essencial', 'salao', 'salao_mais')),
  ciclo text check (ciclo is null or ciclo in ('mensal', 'anual')),
  valor numeric(10, 2) not null check (valor >= 0),
  status text not null check (char_length(status) <= 40),
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint pagamentos_plano_do_tipo check ((tipo = 'pacote') = (plano is null and ciclo is null))
);
create index pagamentos_salao_idx on public.pagamentos (salon_id, criado_em desc);

alter table public.pagamentos enable row level security;
revoke all on public.pagamentos from anon, authenticated;
grant select on public.pagamentos to authenticated;
create policy pagamentos_select on public.pagamentos for select to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]));

-- 4) Situação da cobrança.
create function app.situacao_cobranca(p_salon uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when x.salon_id is null then 'em_dia'
    when x.plano = 'teste' then case when x.teste_ate <= now() then 'teste_encerrado' else 'em_dia' end
    when x.pago_ate is null or x.pago_ate > now() then 'em_dia'
    when now() - x.pago_ate <= interval '7 days' then 'tolerancia'
    when now() - x.pago_ate <= interval '30 days' then 'leitura'
    when now() - x.pago_ate < interval '90 days' then 'pagina_fechada'
    else 'suspensa'
  end
  from (select p_salon as id) s
  left join public.subscriptions x on x.salon_id = s.id
$$;

create function app.aceita_agendamento_publico(p_salon uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.situacao_cobranca(p_salon) not in ('teste_encerrado', 'pagina_fechada', 'suspensa')
$$;

-- Mensagens extras compradas no período (pacotes aprovados).
create function app.mensagens_extras(p_salon uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select 200 * count(*)::int
  from public.pagamentos p
  where p.salon_id = p_salon and p.tipo = 'pacote' and p.aprovado_em >= app.inicio_da_franquia(p_salon)
$$;

revoke execute on function app.situacao_cobranca(uuid), app.aceita_agendamento_publico(uuid), app.mensagens_extras(uuid)
  from public, anon, authenticated;

-- 5) Franquia (como na migration 28) com a situação e os pacotes.
create or replace function app.mensagens_permitidas(p_salon uuid, p_tipo text)
returns int
language sql stable security definer set search_path = ''
as $$
  select case
    when x.salon_id is null or x.max_mensagens is null then null
    when app.situacao_cobranca(p_salon) in ('teste_encerrado', 'leitura', 'pagina_fechada', 'suspensa') then 0
    when x.plano = 'teste' and p_tipo <> 'confirmacao' then 0
    when x.plano = 'teste' then x.max_mensagens
    when p_tipo = 'confirmacao' then floor(x.max_mensagens * 1.1)::int + app.mensagens_extras(p_salon)
    else x.max_mensagens + app.mensagens_extras(p_salon)
  end
  from (select p_salon as id) s
  left join public.subscriptions x on x.salon_id = s.id
$$;

revoke execute on function app.mensagens_permitidas(uuid, text) from public, anon, authenticated;

-- 6) Página pública: fechada no teste encerrado e na inadimplência a partir do 31º dia.
create or replace function app.guarda_agendamento_publico()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.origem = 'publico' and not app.aceita_agendamento_publico(new.salon_id) then
    raise exception 'agendamento_indisponivel' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function app.guarda_agendamento_publico() from public, anon, authenticated;

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
    'aceita_agendamento', app.aceita_agendamento_publico(s.id),
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

-- 7) Registrar um pagamento do MP (só o servidor, depois de buscar o pagamento na API do MP).
-- Idempotente pelo mp_id: aplica o plano e estende pago_ate só na primeira vez que fica aprovado.
-- Devolve true se aplicou agora.
create function public.cobranca_registrar_pagamento(
  p_salon uuid,
  p_mp_id text,
  p_tipo text,
  p_plano text,
  p_ciclo text,
  p_valor numeric,
  p_status text
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_ja_aprovado boolean;
  v_id uuid;
  v_limites record;
  v_meses int;
begin
  if not exists (select 1 from public.salons where id = p_salon) then
    raise exception 'salao_nao_encontrado' using errcode = 'P0002';
  end if;
  if p_mp_id is null or char_length(p_mp_id) not between 1 and 64 then
    raise exception 'pagamento_invalido' using errcode = '22023';
  end if;

  -- Dois avisos do mesmo pagamento ao mesmo tempo não aplicam duas vezes (o lock vale mesmo sem linha
  -- em subscriptions); pagamentos diferentes do mesmo salão se enfileiram pela linha do plano.
  perform pg_advisory_xact_lock(hashtextextended('cobranca:' || p_mp_id, 0));
  perform 1 from public.subscriptions where salon_id = p_salon for update;

  select p.aprovado_em is not null into v_ja_aprovado from public.pagamentos p where p.mp_id = p_mp_id;

  insert into public.pagamentos as p (salon_id, mp_id, tipo, plano, ciclo, valor, status, aprovado_em)
  values (p_salon, p_mp_id, p_tipo, p_plano, p_ciclo, p_valor, p_status,
          case when p_status = 'approved' then now() end)
  on conflict (mp_id) do update
    set status = excluded.status,
        aprovado_em = coalesce(p.aprovado_em, excluded.aprovado_em),
        atualizado_em = now()
    where p.salon_id = excluded.salon_id
  returning p.id into v_id;

  if v_id is null then
    raise exception 'pagamento_de_outro_salao' using errcode = '22023';
  end if;
  if p_status <> 'approved' or coalesce(v_ja_aprovado, false) or p_tipo = 'pacote' then
    if p_status = 'approved' and not coalesce(v_ja_aprovado, false) then
      insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
      values (p_salon, null, 'pagamento_aprovado', 'pagamentos', v_id);
      return true;
    end if;
    return false;
  end if;

  select * into v_limites from app.limites_do_plano(p_plano);
  if v_limites.max_agendas is null then
    raise exception 'plano_invalido' using errcode = '22023';
  end if;
  v_meses := case p_ciclo when 'anual' then 12 else 1 end;

  insert into public.subscriptions (salon_id, plano, max_agendas, max_mensagens, teste_ate)
  values (p_salon, p_plano, v_limites.max_agendas, v_limites.max_mensagens, null)
  on conflict (salon_id) do nothing;

  update public.subscriptions
  set plano = p_plano,
      max_agendas = v_limites.max_agendas,
      max_mensagens = v_limites.max_mensagens,
      teste_ate = null,
      ciclo = p_ciclo,
      forma = case when p_tipo = 'assinatura' then 'cartao' else 'avulso' end,
      pago_ate = greatest(coalesce(pago_ate, now()), now()) + make_interval(months => v_meses),
      plano_proximo = null
  where salon_id = p_salon;

  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  values (p_salon, null, 'pagamento_aprovado', 'pagamentos', v_id);
  return true;
end;
$$;

revoke execute on function public.cobranca_registrar_pagamento(uuid, text, text, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.cobranca_registrar_pagamento(uuid, text, text, text, text, numeric, text)
  to service_role;

-- 8) meu_plano (como na migration 28) com a situação e a cobrança.
create or replace function public.meu_plano(p_salon uuid)
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
    'situacao', app.situacao_cobranca(p_salon),
    'ciclo', x.ciclo,
    'forma', x.forma,
    'pago_ate', x.pago_ate,
    'plano_proximo', x.plano_proximo,
    'max_agendas', x.max_agendas,
    'agendas', (select count(*)::int from public.professionals p where p.salon_id = p_salon and p.ativo),
    'max_mensagens', x.max_mensagens,
    'mensagens_extras', app.mensagens_extras(p_salon),
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
