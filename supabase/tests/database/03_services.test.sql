-- Serviços: quem pode criar, editar e ver; dados válidos; isolamento entre salões.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'dono.e@teste.local'),
  ('e0000000-0000-0000-0000-000000000002', 'recepcao.e@teste.local'),
  ('e0000000-0000-0000-0000-000000000003', 'prof.e@teste.local'),
  ('f0000000-0000-0000-0000-000000000001', 'dono.f@teste.local');

insert into public.salons (id, nome, slug) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'Salão E', 'salao-e'),
  ('ffffffff-0000-0000-0000-000000000001', 'Salão F', 'salao-f');

insert into public.members (salon_id, user_id, perfil) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'dono'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'recepcao'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'profissional'),
  ('ffffffff-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'dono');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('e3000000-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Corte feminino', 60, 90),
  ('f3000000-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'Escova', 45, 60);

select is(
  (select n.nspname::text from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'btree_gist'),
  'extensions',
  'btree_gist fica no schema extensions'
);

set local role authenticated;

-- Dono(a) do salão E
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.services (salon_id, nome, duracao_min, preco) values ('eeeeeeee-0000-0000-0000-000000000001', 'Barba', 30, 40)$$,
  'Dono(a) cria serviço'
);
select is(
  (select count(*)::int from public.services),
  2,
  'Dono(a) vê só os serviços do próprio salão'
);
select throws_ok(
  $$insert into public.services (salon_id, nome, duracao_min, preco) values ('eeeeeeee-0000-0000-0000-000000000001', '  corte FEMININO ', 30, 40)$$,
  '23505', null,
  'nome repetido no mesmo salão é recusado (sem diferenciar maiúsculas)'
);
select throws_ok(
  $$insert into public.services (salon_id, nome, duracao_min, preco) values ('eeeeeeee-0000-0000-0000-000000000001', 'Relâmpago', 2, 40)$$,
  '23514', null,
  'duração menor que 5 minutos é recusada'
);
select throws_ok(
  $$insert into public.services (salon_id, nome, duracao_min, preco) values ('eeeeeeee-0000-0000-0000-000000000001', 'X', 30, 40)$$,
  '23514', null,
  'nome curto demais é recusado'
);
select lives_ok(
  $$update public.services set ativo = false where id = 'e3000000-0000-0000-0000-000000000001'$$,
  'Dono(a) desativa serviço'
);
select throws_ok(
  $$delete from public.services where id = 'e3000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'serviço não é apagado, só desativado'
);
select throws_ok(
  $$insert into public.services (salon_id, nome, duracao_min, preco) values ('ffffffff-0000-0000-0000-000000000001', 'Intruso', 30, 40)$$,
  '42501', null,
  'Dono(a) do salão E não cria serviço no salão F'
);
select is_empty(
  $$update public.services set preco = 1 where id = 'f3000000-0000-0000-0000-000000000001' returning id$$,
  'Dono(a) do salão E não altera serviço do salão F'
);

-- Recepção do salão E
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.services), 2, 'Recepção vê os serviços do salão');
select throws_ok(
  $$insert into public.services (salon_id, nome, duracao_min, preco) values ('eeeeeeee-0000-0000-0000-000000000001', 'Hidratação', 30, 50)$$,
  '42501', null,
  'Recepção não cria serviço'
);

-- Profissional do salão E
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is_empty(
  $$update public.services set preco = 1 where salon_id = 'eeeeeeee-0000-0000-0000-000000000001' returning id$$,
  'Profissional não altera preço'
);

-- Anônimo
reset role;
set local role anon;
select throws_ok($$select * from public.services$$, '42501', null, 'anon não lê serviços');

select * from finish();
rollback;
