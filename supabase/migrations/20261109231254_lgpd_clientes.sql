-- LGPD: direitos do titular (cliente final) e retenção.
-- - exportar_cliente: cadastro, consentimento e histórico em JSON (acesso e portabilidade).
-- - anonimizar_cliente: eliminação por anonimização; cancela os agendamentos futuros e mantém
--   os passados sem identificação.
-- - Retenção: pg_cron anonimiza todo dia quem está sem agendamento há 24 meses.
-- Exportar e anonimizar: só Dono(a). Tudo fica em audit_log (sem dado pessoal).

-- 1) Painel grava só os campos de cadastro. Consentimento, opt-out e anonimização
--    mudam apenas pelas funções (página pública, webhook, anonimização).
revoke insert, update on public.clients from authenticated;
grant insert (salon_id, nome, telefone, observacoes) on public.clients to authenticated;
grant update (nome, telefone, observacoes) on public.clients to authenticated;

-- 2) Núcleo da anonimização (sem checagem de perfil: usado pela função pública e pela retenção).
--    Devolve quantos agendamentos futuros foram cancelados; null se o cliente não existe
--    ou já estava anonimizado.
create function app.anonimizar_cliente(p_client uuid)
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

revoke execute on function app.anonimizar_cliente(uuid) from public, anon, authenticated;

-- 3) Anonimizar pelo painel (só Dono(a)).
create function public.anonimizar_cliente(p_client uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_salon uuid;
  v_cancelados int;
begin
  select c.salon_id into v_salon
  from public.clients c
  where c.id = p_client and c.anonimizado_em is null;

  if v_salon is null then
    raise exception 'cliente_nao_encontrado' using errcode = 'P0002';
  end if;
  if not app.has_role(v_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  v_cancelados := app.anonimizar_cliente(p_client);

  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  values (v_salon, (select auth.uid()), 'anonimizar', 'clients', p_client);

  return coalesce(v_cancelados, 0);
end;
$$;

revoke execute on function public.anonimizar_cliente(uuid) from public, anon;
grant execute on function public.anonimizar_cliente(uuid) to authenticated;

-- 4) Exportar os dados de um cliente (só Dono(a)).
create function public.exportar_cliente(p_client uuid)
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

revoke execute on function public.exportar_cliente(uuid) from public, anon;
grant execute on function public.exportar_cliente(uuid) to authenticated;

-- 5) Retenção: anonimiza quem não tem agendamento (de qualquer status) nem cadastro
--    nos últimos p_meses. Agendamento futuro impede. Devolve quantos foram anonimizados.
create function app.anonimizar_inativos(p_meses int default 24)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_limite timestamptz := now() - make_interval(months => greatest(p_meses, 1));
  v_cliente record;
  v_total int := 0;
begin
  for v_cliente in
    select c.id, c.salon_id
    from public.clients c
    where c.anonimizado_em is null
      and c.created_at < v_limite
      and not exists (
        select 1 from public.appointments a
        where a.client_id = c.id and a.inicio >= v_limite
      )
  loop
    if app.anonimizar_cliente(v_cliente.id) is not null then
      insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
      values (v_cliente.salon_id, null, 'anonimizar_retencao', 'clients', v_cliente.id);
      v_total := v_total + 1;
    end if;
  end loop;
  return v_total;
end;
$$;

revoke execute on function app.anonimizar_inativos(int) from public, anon, authenticated;

-- 6) Agendamento diário (06:00 UTC = 03:00 em Brasília).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('lgpd-retencao-clientes', '0 6 * * *', $$select app.anonimizar_inativos(24)$$);
