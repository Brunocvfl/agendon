-- Cliente anonimizado não volta a ter dado pessoal: o UPDATE pelo painel só vale para quem
-- não foi anonimizado (achado do Strix na PR #19). A anonimização é definitiva.

drop policy clients_update on public.clients;
create policy clients_update on public.clients for update to authenticated
  using (anonimizado_em is null and app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]))
  with check (anonimizado_em is null and app.has_role(salon_id, array['dono', 'recepcao']::public.member_role[]));
