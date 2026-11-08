-- Serviços: regras de dados e policies separadas por ação.
-- Também resolve dois avisos do advisor: btree_gist fora de public e policies "for all" somando com as de select.

-- 1) Extensão fora do schema public (a restrição appointments_no_overlap guarda a referência pelo OID).
alter extension btree_gist set schema extensions;

-- 2) Serviços: dados válidos e nome único por salão (sem diferenciar maiúsculas).
alter table public.services
  add constraint services_nome_tamanho check (char_length(trim(nome)) between 2 and 60),
  add constraint services_duracao_faixa check (duracao_min between 5 and 720),
  add constraint services_preco_teto check (preco <= 99999.99);

create unique index services_salon_nome_unico on public.services (salon_id, lower(trim(nome)));

-- 3) Policies de escrita separadas por ação (insert/update/delete), só para quem pode escrever.
--    Serviços e profissionais não têm delete: são desativados, para não quebrar o histórico de agendamentos.

-- services: só Dono(a) cria e edita
drop policy services_write on public.services;
create policy services_insert on public.services for insert to authenticated
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy services_update on public.services for update to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
revoke delete on public.services from authenticated;

-- professionals: só Dono(a) cria e edita
drop policy professionals_write on public.professionals;
create policy professionals_insert on public.professionals for insert to authenticated
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy professionals_update on public.professionals for update to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
revoke delete on public.professionals from authenticated;

-- professional_services: Dono(a) liga e desliga
drop policy professional_services_write on public.professional_services;
create policy professional_services_insert on public.professional_services for insert to authenticated
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy professional_services_update on public.professional_services for update to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy professional_services_delete on public.professional_services for delete to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]));

-- working_hours e time_off: Dono(a) e Recepção
drop policy working_hours_write on public.working_hours;
create policy working_hours_insert on public.working_hours for insert to authenticated
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy working_hours_update on public.working_hours for update to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy working_hours_delete on public.working_hours for delete to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));

drop policy time_off_write on public.time_off;
create policy time_off_insert on public.time_off for insert to authenticated
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy time_off_update on public.time_off for update to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
create policy time_off_delete on public.time_off for delete to authenticated
  using (app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));

-- members: só Dono(a) gerencia
drop policy members_write on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy members_update on public.members for update to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy members_delete on public.members for delete to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]));

-- message_templates: Dono(a) edita (Recepção só lê, pela policy de select)
drop policy message_templates_write on public.message_templates;
create policy message_templates_insert on public.message_templates for insert to authenticated
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy message_templates_update on public.message_templates for update to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]))
  with check (app.has_role(salon_id, array['dono']::public.member_role[]));
create policy message_templates_delete on public.message_templates for delete to authenticated
  using (app.has_role(salon_id, array['dono']::public.member_role[]));
