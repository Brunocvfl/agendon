-- Testes de isolamento (pgTAP). Rode com: supabase test db
-- Provam que um salão não enxerga nem altera dados de outro e que cada perfil respeita a matriz de permissões.

begin;
select plan(12);

-- Fixtures (como superusuário, sem RLS)
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono.a@teste.local'),
  ('a0000000-0000-0000-0000-000000000002', 'recepcao.a@teste.local'),
  ('a0000000-0000-0000-0000-000000000003', 'prof.a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono.b@teste.local'),
  ('c0000000-0000-0000-0000-000000000001', 'novo@teste.local');

insert into public.salons (id, nome, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Salão A', 'salao-a'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Salão B', 'salao-b');

insert into public.members (id, salon_id, user_id, perfil) values
  ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dono'),
  ('a1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'recepcao'),
  ('a1000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'profissional'),
  ('b1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'dono');

insert into public.professionals (id, salon_id, member_id, nome) values
  ('a2000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Ana Lima'),
  ('a2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', null, 'Bruno Reis'),
  ('b2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', null, 'Carla Souza');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('a3000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Corte feminino', 60, 90),
  ('b3000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Escova', 45, 60);

insert into public.clients (id, salon_id, nome, telefone) values
  ('a4000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Marina Prado', '+5511999990001'),
  ('b4000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Júlia Ramos', '+5511999990002');

insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim) values
  ('a5000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', '2026-11-11 13:00+00', '2026-11-11 14:00+00'),
  ('a5000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', '2026-11-11 13:00+00', '2026-11-11 14:00+00'),
  ('b5000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', '2026-11-11 13:00+00', '2026-11-11 14:00+00');

-- Conflito de horário (superusuário): mesmo profissional, horário sobreposto
select throws_ok(
  $$insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', '2026-11-11 13:30+00', '2026-11-11 14:30+00')$$,
  '23P01',
  null,
  'dois agendamentos ativos no mesmo horário são recusados'
);

select lives_ok(
  $$insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, status)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', '2026-11-11 13:30+00', '2026-11-11 14:30+00', 'cancelado')$$,
  'agendamento cancelado não bloqueia o horário'
);

-- Dono(a) do salão A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.salons), 1, 'Dono(a) A vê só o próprio salão');
select is((select count(*)::int from public.clients where salon_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'Dono(a) A não vê clientes do salão B');
select throws_ok(
  $$insert into public.clients (salon_id, nome) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Intruso')$$,
  '42501',
  null,
  'Dono(a) A não cria cliente no salão B'
);
select throws_ok(
  $$insert into public.salons (nome, slug) values ('Direto', 'direto')$$,
  '42501',
  null,
  'salão só é criado pela função create_salon'
);

-- Recepção do salão A
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*)::int from public.clients), 1, 'Recepção vê os clientes do próprio salão');
select is_empty(
  $$update public.services set preco = 1 where salon_id = 'aaaaaaaa-0000-0000-0000-000000000001' returning id$$,
  'Recepção não altera serviços e preços'
);

-- Profissional do salão A (Ana Lima)
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select is((select count(*)::int from public.appointments where status <> 'cancelado'), 1, 'Profissional vê só a própria agenda');
select is((select count(*)::int from public.clients), 0, 'Profissional não vê clientes nem telefones');

-- Usuário novo cria o primeiro salão pela função de onboarding
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.create_salon('Studio Novo', 'studio-novo')$$,
  'create_salon cria salão, vínculo de Dono(a) e plano'
);

-- Anônimo não acessa tabelas
reset role;
set local role anon;
select throws_ok(
  $$select * from public.clients$$,
  '42501',
  null,
  'anon não lê tabelas'
);

select * from finish();
rollback;
