-- Profissional agenda na própria agenda: busca de cliente só por nome (sem telefone) e
-- criar_agendamento aberto ao Profissional, só para o profissional ligado ao login dele.

-- 1) Busca de cliente para quem não vê telefone: só pelo nome, devolve id, nome e o último
--    atendimento (para diferenciar homônimos). Nenhuma parte do telefone sai daqui.
--    SECURITY DEFINER: a RLS de clients bloqueia o Profissional; a regra de acesso está aqui
--    (qualquer membro ativo do salão).
create function public.buscar_clientes_por_nome(p_salon uuid, p_busca text, p_limite int default 8)
returns table (id uuid, nome text, ultimo_atendimento timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_busca text := trim(coalesce(p_busca, ''));
  v_like text;
begin
  if not exists (select 1 from app.my_salon_ids() m where m = p_salon) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if length(v_busca) < 2 then
    return;
  end if;

  -- % e _ digitados são procurados como texto, não como curinga.
  v_like := '%' || replace(replace(replace(left(v_busca, 80), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select
    c.id,
    c.nome,
    (select max(a.inicio) from public.appointments a
      where a.client_id = c.id and a.salon_id = c.salon_id and a.status = 'concluido')
  from public.clients c
  where c.salon_id = p_salon
    and c.anonimizado_em is null
    and c.nome ilike v_like
  order by lower(c.nome), c.id
  limit least(greatest(coalesce(p_limite, 8), 1), 20);
end;
$$;

revoke execute on function public.buscar_clientes_por_nome(uuid, text, int) from public, anon;
grant execute on function public.buscar_clientes_por_nome(uuid, text, int) to authenticated;

-- 2) criar_agendamento: Dono(a) e Recepção em qualquer agenda; Profissional só na própria.
--    Passa a SECURITY DEFINER: o Profissional não lê nem grava clients pela RLS, mas pode
--    cadastrar o cliente novo (nome + WhatsApp) e agendar cliente existente pelo id.
--    Se o WhatsApp já existe no salão, usa esse cliente (como antes).
create or replace function public.criar_agendamento(
  p_professional uuid,
  p_service uuid,
  p_inicio timestamp,
  p_client uuid default null,
  p_cliente_nome text default null,
  p_cliente_telefone text default null,
  p_encaixe boolean default false
)
returns uuid
language plpgsql security definer set search_path = ''
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

  if v_salon is null or not exists (select 1 from app.my_salon_ids() m where m = v_salon) then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  if not app.pode_mexer_no_agendamento(v_salon, p_professional) then
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
  elsif not exists (
    select 1 from public.clients c where c.id = v_client and c.salon_id = v_salon and c.anonimizado_em is null
  ) then
    raise exception 'cliente_nao_encontrado' using errcode = '22023';
  end if;

  insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem)
  values (v_salon, p_professional, p_service, v_client, v_inicio, v_fim, v_preco, 'painel')
  returning id into v_id;

  return v_id;
end;
$$;
