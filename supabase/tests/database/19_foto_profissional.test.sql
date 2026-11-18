-- Foto do profissional: Storage (bucket fotos, só Dono(a), pasta do salão), coluna foto_path
-- (sempre na pasta do salão, só quem edita o profissional) e pagina_publica.

begin;
select plan(9);

insert into auth.users (id, email) values
  ('d7000000-0000-0000-0000-000000000001', 'dono.fp@teste.local'),
  ('d7000000-0000-0000-0000-000000000002', 'recepcao.fp@teste.local');

insert into public.salons (id, nome, slug, status) values
  ('d7100000-0000-0000-0000-000000000001', 'Salão FP', 'salao-foto-p', 'ativo'),
  ('d7100000-0000-0000-0000-000000000002', 'Salão FQ', 'salao-foto-q', 'ativo');

insert into public.members (salon_id, user_id, perfil) values
  ('d7100000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'dono'),
  ('d7100000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000002', 'recepcao');

insert into public.professionals (id, salon_id, nome) values
  ('d7200000-0000-0000-0000-000000000001', 'd7100000-0000-0000-0000-000000000001', 'Foto P');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('d7300000-0000-0000-0000-000000000001', 'd7100000-0000-0000-0000-000000000001', 'Corte FP', 60, 50);
insert into public.professional_services (salon_id, professional_id, service_id) values
  ('d7100000-0000-0000-0000-000000000001', 'd7200000-0000-0000-0000-000000000001', 'd7300000-0000-0000-0000-000000000001');
insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim) values
  ('d7100000-0000-0000-0000-000000000001', 'd7200000-0000-0000-0000-000000000001', 1, '09:00', '18:00');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'd7100000-0000-0000-0000-000000000001/prof-1.png')$$,
  'Dono(a) envia a foto na pasta do salão');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'd7100000-0000-0000-0000-000000000002/prof-1.png')$$,
  '42501', null, 'Dono(a) não grava na pasta de outro salão');
select lives_ok(
  $$update public.professionals set foto_path = 'd7100000-0000-0000-0000-000000000001/prof-1.png'
    where id = 'd7200000-0000-0000-0000-000000000001'$$,
  'Dono(a) liga a foto ao profissional');
select throws_ok(
  $$update public.professionals set foto_path = 'd7100000-0000-0000-0000-000000000002/prof-1.png'
    where id = 'd7200000-0000-0000-0000-000000000001'$$,
  '23514', null, 'foto só na pasta do próprio salão');

select set_config('request.jwt.claims', '{"sub":"d7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'd7100000-0000-0000-0000-000000000001/prof-2.png')$$,
  '42501', null, 'Recepção não envia foto');
update public.professionals set foto_path = null where id = 'd7200000-0000-0000-0000-000000000001';
reset role;
select is(
  (select foto_path from public.professionals where id = 'd7200000-0000-0000-0000-000000000001'),
  'd7100000-0000-0000-0000-000000000001/prof-1.png', 'Recepção não troca a foto (RLS)');

set local role anon;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'd7100000-0000-0000-0000-000000000001/prof-3.png')$$,
  '42501', null, 'anon não envia foto');
reset role;

set local role service_role;
select is(
  public.pagina_publica('salao-foto-p') -> 'profissionais' -> 0 ->> 'foto_path',
  'd7100000-0000-0000-0000-000000000001/prof-1.png', 'pagina_publica devolve a foto do profissional');
select is(
  jsonb_array_length(public.pagina_publica('salao-foto-p') -> 'profissionais'), 1,
  'a foto não duplica o profissional na página pública');
reset role;

select * from finish();
rollback;
