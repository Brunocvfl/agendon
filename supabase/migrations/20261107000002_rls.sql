-- AgendOn: RLS em todas as tabelas, funções auxiliares e permissões.
-- Regra de ouro: nenhuma tabela sem RLS; o salon_id do usuário vem de public.members.

create schema if not exists app;
revoke all on schema app from public, anon;
grant usage on schema app to authenticated;

-- Salões em que o usuário logado tem acesso ativo
create function app.my_salon_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.salon_id
  from public.members m
  where m.user_id = (select auth.uid()) and m.status = 'ativo'
$$;

-- O usuário logado tem um dos perfis dados neste salão?
create function app.has_role(p_salon uuid, p_roles public.member_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.salon_id = p_salon
      and m.user_id = (select auth.uid())
      and m.status = 'ativo'
      and m.perfil = any (p_roles)
  )
$$;

-- Agendas (profissionais) ligadas ao login do usuário
create function app.my_professional_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select p.id
  from public.professionals p
  join public.members m on m.id = p.member_id
  where m.user_id = (select auth.uid()) and m.status = 'ativo'
$$;

revoke execute on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated;

-- Permissões de tabela: anon não acessa nada; authenticated passa pela RLS.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.message_log, public.audit_log, public.subscriptions from authenticated;
revoke insert, delete on public.salons from authenticated;

alter table public.salons enable row level security;
alter table public.members enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.professional_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.message_templates enable row level security;
alter table public.message_log enable row level security;
alter table public.audit_log enable row level security;
alter table public.subscriptions enable row level security;

-- salons
create policy salons_select on public.salons for select to authenticated
  using (id in (select app.my_salon_ids()));
create policy salons_update on public.salons for update to authenticated
  using (app.has_role(id, array['dono']::public.member_role[]))
  with check (app.has_role(id, array['dono']::public.member_role[]));

-- members: todos do salão veem a equipe; só o Dono(a) gerencia
create policy members_select on public.members for select to authenticated
  using (salon_id in (select app.my_salon_ids()));
create policy members_write on public.members for all to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));

-- professionals, services, professional_services: todos leem; só o Dono(a) edita
create policy professionals_select on public.professionals for select to authenticated
  using (salon_id in (select app.my_salon_ids()));
create policy professionals_write on public.professionals for all to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));

create policy services_select on public.services for select to authenticated
  using (salon_id in (select app.my_salon_ids()));
create policy services_write on public.services for all to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));

create policy professional_services_select on public.professional_services for select to authenticated
  using (salon_id in (select app.my_salon_ids()));
create policy professional_services_write on public.professional_services for all to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));

-- horários e folgas: todos leem; Dono(a) e Recepção editam
create policy working_hours_select on public.working_hours for select to authenticated
  using (salon_id in (select app.my_salon_ids()));
create policy working_hours_write on public.working_hours for all to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));

create policy time_off_select on public.time_off for select to authenticated
  using (salon_id in (select app.my_salon_ids()));
create policy time_off_write on public.time_off for all to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));

-- clients (dado pessoal): só Dono(a) e Recepção
create policy clients_all on public.clients for all to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));

-- appointments: Dono(a) e Recepção veem e editam tudo; Profissional só a própria agenda
create policy appointments_select on public.appointments for select to authenticated
  using (
    app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[])
    or professional_id in (select app.my_professional_ids())
  );
create policy appointments_insert on public.appointments for insert to authenticated
  with check (
    app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[])
    or (
      app.has_role(salon_id, array['profissional']::public.member_role[])
      and professional_id in (select app.my_professional_ids())
    )
  );
create policy appointments_update on public.appointments for update to authenticated
  using (
    app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[])
    or professional_id in (select app.my_professional_ids())
  )
  with check (
    app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[])
    or professional_id in (select app.my_professional_ids())
  );
-- Sem policy de delete: agendamento é cancelado (status), não apagado.

-- lembretes: Dono(a) edita modelos; Dono(a) e Recepção leem o histórico de envio
create policy message_templates_select on public.message_templates for select to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy message_templates_write on public.message_templates for all to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));

create policy message_log_select on public.message_log for select to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));

-- auditoria e plano: só o Dono(a) lê; escrita apenas pelo servidor (service_role)
create policy audit_log_select on public.audit_log for select to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]));
