-- Excluir profissional e remover alguém da equipe (2026-11-17). Nada é apagado de verdade:
-- agendamentos antigos e o histórico dos clientes continuam apontando para o profissional e o login.
--
-- Profissional arquivado: some do painel (lista, agenda, formulários) e da página pública, mas o nome
-- continua nos agendamentos antigos. O nome fica livre para um cadastro novo. Não volta (sem desarquivar).
-- Membro removido: perde o acesso (status inativo) e some da Equipe. O registro fica para auditoria;
-- convidar o mesmo e-mail de novo traz a pessoa de volta, desativada (restaurar_membro).

alter table public.professionals
  add column arquivado_em timestamptz,
  add constraint professionals_arquivado_inativo check (arquivado_em is null or not ativo);

-- Nome único só entre os não arquivados.
drop index public.professionals_salon_nome_unico;
create unique index professionals_salon_nome_unico on public.professionals (salon_id, lower(trim(nome)))
  where arquivado_em is null;

alter table public.members
  add column removido_em timestamptz,
  add constraint members_removido_inativo check (removido_em is null or status = 'inativo');

-- Arquiva o profissional (só Dono(a)). Recusa (P0001) se há agendamento futuro marcado ou confirmado
-- (tem_agendamentos_futuros) ou se ele é a agenda de um login com perfil Profissional que ainda tem
-- acesso (agenda_de_login); a agenda de Dono(a)/Recepção é só desligada do login.
create function public.arquivar_profissional(p_professional uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_prof public.professionals%rowtype;
begin
  select * into v_prof from public.professionals where id = p_professional;
  if not found or v_prof.arquivado_em is not null then
    raise exception 'nao_encontrado' using errcode = 'P0002';
  end if;
  if not app.has_role(v_prof.salon_id, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.appointments a
    where a.professional_id = v_prof.id and a.salon_id = v_prof.salon_id
      and a.status in ('agendado', 'confirmado') and a.fim > now()
  ) then
    raise exception 'tem_agendamentos_futuros' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.members m
    where m.id = v_prof.member_id and m.perfil = 'profissional' and m.status in ('ativo', 'convidado')
  ) then
    raise exception 'agenda_de_login' using errcode = 'P0001';
  end if;

  update public.professionals
     set ativo = false, arquivado_em = now(), member_id = null
   where id = v_prof.id;
  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  values (v_prof.salon_id, (select auth.uid()), 'arquivar', 'professionals', v_prof.id);
end
$$;
revoke execute on function public.arquivar_profissional(uuid) from public, anon;
grant execute on function public.arquivar_profissional(uuid) to authenticated;

-- Tira alguém da equipe (só Dono(a)): acesso cortado e fora da lista; a agenda ligada fica livre.
-- Convite pendente não passa por aqui (cancelar convite apaga o vínculo). O gatilho members_guarda
-- continua valendo: ninguém remove a si mesmo (proprio_acesso) e sempre fica um Dono(a) ativo.
create function public.remover_membro(p_member uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_m public.members%rowtype;
begin
  select * into v_m from public.members where id = p_member;
  if not found or v_m.removido_em is not null then
    raise exception 'nao_encontrado' using errcode = 'P0002';
  end if;
  if not app.has_role(v_m.salon_id, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if v_m.status = 'convidado' then
    raise exception 'convite_pendente' using errcode = '22023';
  end if;

  update public.members set status = 'inativo', removido_em = now() where id = v_m.id;
  update public.professionals set member_id = null where member_id = v_m.id and salon_id = v_m.salon_id;
  insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
  values (v_m.salon_id, (select auth.uid()), 'remover_membro', 'members', v_m.id);
end
$$;
revoke execute on function public.remover_membro(uuid) from public, anon;
grant execute on function public.remover_membro(uuid) to authenticated;

-- Convidar de novo um e-mail removido deste salão: a pessoa volta para a lista, ainda desativada
-- (o Dono(a) confere perfil e agenda e reativa). Devolve o id do vínculo, ou null se não há removido.
create function public.restaurar_membro(p_salon uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not app.has_role(p_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  update public.members m
     set removido_em = null
    from auth.users u
   where u.id = m.user_id and m.salon_id = p_salon and m.removido_em is not null
     and lower(u.email) = lower(trim(p_email))
  returning m.id into v_id;
  if v_id is not null then
    insert into public.audit_log (salon_id, user_id, acao, tabela, registro_id)
    values (p_salon, (select auth.uid()), 'restaurar_membro', 'members', v_id);
  end if;
  return v_id;
end
$$;
revoke execute on function public.restaurar_membro(uuid, text) from public, anon;
grant execute on function public.restaurar_membro(uuid, text) to authenticated;

-- equipe(): sem os removidos.
create or replace function public.equipe(p_salon uuid)
returns table (
  id uuid,
  user_id uuid,
  nome text,
  email text,
  perfil public.member_role,
  status text,
  convidado_em timestamptz,
  ultimo_acesso timestamptz,
  profissional_id uuid,
  profissional_nome text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not app.has_role(p_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    select m.id, m.user_id, m.nome, u.email::text, m.perfil, m.status, u.invited_at, u.last_sign_in_at,
           p.id, p.nome
    from public.members m
    join auth.users u on u.id = m.user_id
    left join public.professionals p on p.member_id = m.id and p.salon_id = m.salon_id
    where m.salon_id = p_salon and m.removido_em is null
    order by case m.status when 'ativo' then 0 when 'convidado' then 1 else 2 end,
             case m.perfil when 'dono' then 0 when 'recepcao' then 1 else 2 end,
             coalesce(m.nome, u.email);
end
$$;
