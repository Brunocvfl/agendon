-- Clientes: regras de dados, policies separadas por ação e a lista com busca.
-- Cliente é dado pessoal (LGPD): só Dono(a) e Recepção veem e editam; não há delete
-- (a eliminação será por anonimização, que mantém os agendamentos sem identificação).

-- 1) Dados válidos. WhatsApp obrigatório (E.164, já checado no schema), exceto em cliente anonimizado.
alter table public.clients
  add constraint clients_nome_tamanho check (char_length(trim(nome)) between 2 and 80),
  add constraint clients_observacoes_tamanho check (observacoes is null or char_length(observacoes) <= 500),
  add constraint clients_telefone_obrigatorio check (telefone is not null or anonimizado_em is not null);

-- 2) Policies separadas por ação; sem delete.
drop policy clients_all on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy clients_insert on public.clients for insert to authenticated
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy clients_update on public.clients for update to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
revoke delete on public.clients from authenticated;

-- 3) Lista de clientes com busca (nome ou dígitos do WhatsApp), paginação e resumo do histórico.
--    SECURITY INVOKER: a RLS de clients e appointments vale; a checagem de perfil dá um erro claro (42501).
create function public.listar_clientes(
  p_salon uuid,
  p_busca text default '',
  p_limite int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  nome text,
  telefone text,
  criado_em timestamptz,
  ultimo_atendimento timestamptz,
  visitas int,
  faltas int,
  total bigint
)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_busca text := trim(coalesce(p_busca, ''));
  v_digitos text := regexp_replace(coalesce(p_busca, ''), '\D', '', 'g');
  v_like text;
begin
  if not app.has_role(p_salon, array['dono', 'recepcao']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  -- % e _ digitados são procurados como texto, não como curinga.
  v_like := '%' || replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select
    c.id,
    c.nome,
    c.telefone,
    c.created_at,
    h.ultimo,
    coalesce(h.visitas, 0),
    coalesce(h.faltas, 0),
    count(*) over ()
  from public.clients c
  left join lateral (
    select
      max(a.inicio) filter (where a.status = 'concluido') as ultimo,
      (count(*) filter (where a.status = 'concluido'))::int as visitas,
      (count(*) filter (where a.status = 'faltou'))::int as faltas
    from public.appointments a
    where a.client_id = c.id and a.salon_id = c.salon_id
  ) h on true
  where c.salon_id = p_salon
    and c.anonimizado_em is null
    and (
      v_busca = ''
      or c.nome ilike v_like
      or (length(v_digitos) >= 3 and c.telefone like '%' || v_digitos || '%')
    )
  order by lower(c.nome), c.id
  limit least(greatest(coalesce(p_limite, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.listar_clientes(uuid, text, int, int) from public, anon;
grant execute on function public.listar_clientes(uuid, text, int, int) to authenticated;
