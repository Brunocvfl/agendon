-- Exportar a lista de clientes (CSV no app), só Dono(a): o salão é o controlador dos dados.
-- Filtros: busca (nome ou dígitos do WhatsApp, como em listar_clientes) e autorização do WhatsApp
-- ('todos', 'autorizou' = opt-in sem SAIR, 'nao_autorizou' = sem opt-in ou saiu).
-- Anonimizados ficam de fora. Cada exportação vai para o audit_log ('exportar_lista').

create function public.exportar_clientes(p_salon uuid, p_busca text default '', p_whatsapp text default 'todos')
returns table (
  nome text,
  telefone text,
  observacoes text,
  cadastrado_em timestamptz,
  ultimo_atendimento timestamptz,
  proximo_agendamento timestamptz,
  visitas int,
  faltas int,
  cancelamentos int,
  total_gasto numeric,
  consentimento_whatsapp_em timestamptz,
  consentimento_origem text,
  optout_em timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_busca text := trim(coalesce(p_busca, ''));
  v_digitos text := regexp_replace(coalesce(p_busca, ''), '\D', '', 'g');
  v_like text;
begin
  if not app.has_role(p_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if coalesce(p_whatsapp, '') not in ('todos', 'autorizou', 'nao_autorizou') or char_length(v_busca) > 80 then
    raise exception 'filtro_invalido' using errcode = '22023';
  end if;

  v_like := '%' || replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  values (p_salon, (select auth.uid()), 'exportar_lista', 'clients', null);

  return query
  select
    c.nome,
    c.telefone,
    c.observacoes,
    c.created_at,
    h.ultimo,
    h.proximo,
    coalesce(h.visitas, 0),
    coalesce(h.faltas, 0),
    coalesce(h.cancelamentos, 0),
    coalesce(h.gasto, 0),
    c.consentimento_whatsapp_em,
    c.consentimento_origem,
    c.optout_em
  from public.clients c
  left join lateral (
    select
      max(a.inicio) filter (where a.status = 'concluido') as ultimo,
      min(a.inicio) filter (where a.status in ('agendado', 'confirmado') and a.inicio > now()) as proximo,
      (count(*) filter (where a.status = 'concluido'))::int as visitas,
      (count(*) filter (where a.status = 'faltou'))::int as faltas,
      (count(*) filter (where a.status = 'cancelado'))::int as cancelamentos,
      sum(a.preco) filter (where a.status = 'concluido') as gasto
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
    and (
      p_whatsapp = 'todos'
      or (p_whatsapp = 'autorizou' and c.consentimento_whatsapp_em is not null and c.optout_em is null)
      or (p_whatsapp = 'nao_autorizou' and (c.consentimento_whatsapp_em is null or c.optout_em is not null))
    )
  order by lower(c.nome), c.id;
end;
$$;

revoke execute on function public.exportar_clientes(uuid, text, text) from public, anon;
grant execute on function public.exportar_clientes(uuid, text, text) to authenticated;
