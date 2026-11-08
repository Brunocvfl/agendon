-- Profissionais: dados válidos, vínculo com login, horário semanal sem sobreposição e funções de gravação.
-- As funções são SECURITY INVOKER: rodam com o papel de quem chama, então a RLS continua valendo.

-- 1) Profissional: nome válido e único por salão.
alter table public.professionals
  add constraint professionals_nome_tamanho check (char_length(trim(nome)) between 2 and 60);
create unique index professionals_salon_nome_unico on public.professionals (salon_id, lower(trim(nome)));

-- Vínculo com o login (members): mesmo salão (FK composta) e no máximo um profissional por login.
alter table public.professionals drop constraint professionals_member_id_fkey;
alter table public.professionals
  add constraint professionals_member_fk foreign key (member_id, salon_id)
    references public.members (id, salon_id) on delete set null (member_id);
create unique index professionals_member_unico on public.professionals (member_id) where member_id is not null;

-- 2) Horário semanal: intervalos do mesmo profissional no mesmo dia não se sobrepõem.
alter table public.working_hours
  add constraint working_hours_sem_sobreposicao exclude using gist (
    professional_id with =,
    dia_semana with =,
    int4range(
      (extract(hour from inicio) * 60 + extract(minute from inicio))::int,
      (extract(hour from fim) * 60 + extract(minute from fim))::int
    ) with &&
  );

-- 3) Folga: motivo curto (é texto livre; não registrar dado de saúde nem detalhes pessoais).
alter table public.time_off
  add constraint time_off_motivo_tamanho check (motivo is null or char_length(motivo) <= 80);

-- 4) Grava o horário semanal inteiro de um profissional (substitui o anterior).
--    p_horarios: [{"dia": 1, "inicio": "09:00", "fim": "12:00"}, ...]
create function public.salvar_horarios(p_professional uuid, p_horarios jsonb)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_salon uuid;
  v_item jsonb;
begin
  select p.salon_id into v_salon from public.professionals p where p.id = p_professional;
  if v_salon is null then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  -- Erro claro em vez de "nada acontece" (a RLS continua sendo a garantia final).
  if not app.has_role(v_salon, array['dono', 'recepcao']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if jsonb_typeof(p_horarios) <> 'array' or jsonb_array_length(p_horarios) > 28 then
    raise exception 'horarios_invalidos' using errcode = '22023';
  end if;

  delete from public.working_hours where professional_id = p_professional;

  for v_item in select * from jsonb_array_elements(p_horarios) loop
    insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim)
    values (
      v_salon,
      p_professional,
      (v_item ->> 'dia')::smallint,
      (v_item ->> 'inicio')::time,
      (v_item ->> 'fim')::time
    );
  end loop;
end;
$$;

-- 5) Define os serviços que o profissional atende (substitui a lista anterior).
create function public.salvar_servicos_profissional(p_professional uuid, p_servicos uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_salon uuid;
begin
  select p.salon_id into v_salon from public.professionals p where p.id = p_professional;
  if v_salon is null then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  if not app.has_role(v_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  delete from public.professional_services ps
  where ps.professional_id = p_professional
    and not (ps.service_id = any (coalesce(p_servicos, '{}')));

  -- A FK composta (service_id, salon_id) recusa serviço de outro salão.
  insert into public.professional_services (salon_id, professional_id, service_id)
  select v_salon, p_professional, s
  from unnest(coalesce(p_servicos, '{}')) as s
  on conflict (professional_id, service_id) do nothing;
end;
$$;

-- 6) Folga/bloqueio informado no horário local do salão; grava em UTC.
create function public.adicionar_folga(
  p_professional uuid,
  p_inicio timestamp,
  p_fim timestamp,
  p_motivo text
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_salon uuid;
  v_fuso text;
  v_id uuid;
begin
  select p.salon_id, s.fuso into v_salon, v_fuso
  from public.professionals p
  join public.salons s on s.id = p.salon_id
  where p.id = p_professional;

  if v_salon is null then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  if not app.has_role(v_salon, array['dono', 'recepcao']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  insert into public.time_off (salon_id, professional_id, inicio, fim, motivo)
  values (
    v_salon,
    p_professional,
    p_inicio at time zone v_fuso,
    p_fim at time zone v_fuso,
    nullif(trim(coalesce(p_motivo, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.salvar_horarios(uuid, jsonb) from public, anon;
revoke execute on function public.salvar_servicos_profissional(uuid, uuid[]) from public, anon;
revoke execute on function public.adicionar_folga(uuid, timestamp, timestamp, text) from public, anon;
grant execute on function public.salvar_horarios(uuid, jsonb) to authenticated;
grant execute on function public.salvar_servicos_profissional(uuid, uuid[]) to authenticated;
grant execute on function public.adicionar_folga(uuid, timestamp, timestamp, text) to authenticated;
