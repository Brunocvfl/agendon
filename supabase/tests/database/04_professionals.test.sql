-- Profissionais: quem cadastra, quem edita horários e folgas, integridade entre salões.

begin;
select plan(20);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'dono.g@teste.local'),
  ('10000000-0000-0000-0000-000000000002', 'recepcao.g@teste.local'),
  ('10000000-0000-0000-0000-000000000003', 'prof.g@teste.local'),
  ('20000000-0000-0000-0000-000000000001', 'dono.h@teste.local');

insert into public.salons (id, nome, slug) values
  ('11111111-0000-0000-0000-000000000001', 'Salão G', 'salao-g-pgtap'),
  ('22222222-0000-0000-0000-000000000001', 'Salão H', 'salao-h-pgtap');

insert into public.members (id, salon_id, user_id, perfil) values
  ('11000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'dono'),
  ('11000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'recepcao'),
  ('11000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'profissional'),
  ('22000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'dono');

insert into public.professionals (id, salon_id, nome) values
  ('11200000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Ana Lima'),
  ('22200000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Carla Souza');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('11300000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Corte', 60, 90),
  ('11300000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Escova', 45, 60),
  ('22300000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Barba', 30, 40);

set local role authenticated;

-- Dono(a) do salão G
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.professionals (salon_id, nome, member_id) values ('11111111-0000-0000-0000-000000000001', 'Dona G', '11000000-0000-0000-0000-000000000001')$$,
  'Dono(a) cadastra a si mesmo como profissional ("eu também atendo")'
);
select throws_ok(
  $$insert into public.professionals (salon_id, nome, member_id) values ('11111111-0000-0000-0000-000000000001', 'Dona G 2', '11000000-0000-0000-0000-000000000001')$$,
  '23505', null,
  'um login vira no máximo um profissional'
);
select throws_ok(
  $$insert into public.professionals (salon_id, nome, member_id) values ('11111111-0000-0000-0000-000000000001', 'Intrusa', '22000000-0000-0000-0000-000000000001')$$,
  '23503', null,
  'não liga profissional a login de outro salão'
);
select throws_ok(
  $$insert into public.professionals (salon_id, nome) values ('11111111-0000-0000-0000-000000000001', '  ana LIMA ')$$,
  '23505', null,
  'nome de profissional repetido no salão é recusado'
);
select lives_ok(
  $$select public.salvar_servicos_profissional('11200000-0000-0000-0000-000000000001', array['11300000-0000-0000-0000-000000000001', '11300000-0000-0000-0000-000000000002']::uuid[])$$,
  'Dono(a) define os serviços da profissional'
);
select lives_ok(
  $$select public.salvar_servicos_profissional('11200000-0000-0000-0000-000000000001', array['11300000-0000-0000-0000-000000000002']::uuid[])$$,
  'Dono(a) troca a lista de serviços'
);
select results_eq(
  $$select service_id from public.professional_services where professional_id = '11200000-0000-0000-0000-000000000001'$$,
  $$values ('11300000-0000-0000-0000-000000000002'::uuid)$$,
  'a lista nova substitui a anterior'
);
select throws_ok(
  $$select public.salvar_servicos_profissional('11200000-0000-0000-0000-000000000001', array['22300000-0000-0000-0000-000000000001']::uuid[])$$,
  '23503', null,
  'não liga serviço de outro salão'
);
select throws_ok(
  $$select public.salvar_servicos_profissional('22200000-0000-0000-0000-000000000001', array['11300000-0000-0000-0000-000000000001']::uuid[])$$,
  'P0002', 'profissional_nao_encontrado',
  'Dono(a) do salão G não enxerga profissional do salão H'
);
select lives_ok(
  $$select public.salvar_horarios('11200000-0000-0000-0000-000000000001', '[{"dia":2,"inicio":"09:00","fim":"12:00"},{"dia":2,"inicio":"13:00","fim":"18:00"}]')$$,
  'Dono(a) grava horário com intervalo'
);
select throws_ok(
  $$select public.salvar_horarios('11200000-0000-0000-0000-000000000001', '[{"dia":3,"inicio":"09:00","fim":"13:00"},{"dia":3,"inicio":"12:00","fim":"18:00"}]')$$,
  '23P01', null,
  'horários sobrepostos no mesmo dia são recusados'
);
select is(
  (select count(*)::int from public.working_hours where professional_id = '11200000-0000-0000-0000-000000000001'),
  2,
  'gravação recusada não apaga o horário anterior (transação)'
);
select public.adicionar_folga('11200000-0000-0000-0000-000000000001', '2026-12-01 14:00', '2026-12-01 16:00', 'Compromisso');
select is(
  (select to_char(inicio at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from public.time_off where motivo = 'Compromisso'),
  '2026-12-01 17:00',
  'folga digitada às 14:00 de São Paulo é gravada como 17:00 UTC'
);

-- Recepção do salão G
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.professionals (salon_id, nome) values ('11111111-0000-0000-0000-000000000001', 'Nova')$$,
  '42501', null,
  'Recepção não cadastra profissional'
);
select lives_ok(
  $$select public.salvar_horarios('11200000-0000-0000-0000-000000000001', '[{"dia":4,"inicio":"10:00","fim":"16:00"}]')$$,
  'Recepção edita horários'
);
select lives_ok(
  $$select public.adicionar_folga('11200000-0000-0000-0000-000000000001', '2026-12-24 00:00', '2026-12-26 00:00', 'Natal')$$,
  'Recepção lança folga'
);
select throws_ok(
  $$select public.salvar_servicos_profissional('11200000-0000-0000-0000-000000000001', array['11300000-0000-0000-0000-000000000001']::uuid[])$$,
  '42501', null,
  'Recepção não altera serviços da profissional'
);

-- Profissional do salão G
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.salvar_horarios('11200000-0000-0000-0000-000000000001', '[]')$$,
  '42501', null,
  'Profissional não edita horários'
);
select is_empty(
  $$delete from public.time_off where professional_id = '11200000-0000-0000-0000-000000000001' returning id$$,
  'Profissional não apaga folgas'
);

-- Anônimo
reset role;
set local role anon;
select throws_ok(
  $$select public.salvar_horarios('11200000-0000-0000-0000-000000000001', '[]')$$,
  '42501', null,
  'anon não chama as funções'
);

select * from finish();
rollback;
