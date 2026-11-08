-- Profissional agenda na própria agenda: buscar_clientes_por_nome (só nome e último atendimento,
-- sem busca por telefone) e criar_agendamento como SECURITY DEFINER (cliente novo, WhatsApp já
-- cadastrado, cliente de outro salão ou anonimizado). Datas: terça 08/01/2030.

begin;
select plan(17);

insert into auth.users (id, email) values
  ('80000000-0000-0000-0000-000000000001', 'dono.m@teste.local'),
  ('80000000-0000-0000-0000-000000000003', 'prof.m@teste.local'),
  ('88000000-0000-0000-0000-000000000001', 'dono.n@teste.local');

insert into public.salons (id, nome, slug) values
  ('8a000000-0000-0000-0000-000000000001', 'Salão M', 'salao-prof-m'),
  ('8b000000-0000-0000-0000-000000000001', 'Salão N', 'salao-prof-n');

insert into public.members (id, salon_id, user_id, perfil) values
  ('87000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'dono'),
  ('87000000-0000-0000-0000-000000000003', '8a000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', 'profissional'),
  ('87000000-0000-0000-0000-000000000004', '8b000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000001', 'dono');

insert into public.professionals (id, salon_id, member_id, nome) values
  ('81000000-0000-0000-0000-00000000000a', '8a000000-0000-0000-0000-000000000001', '87000000-0000-0000-0000-000000000003', 'Prof A'),
  ('81000000-0000-0000-0000-00000000000b', '8a000000-0000-0000-0000-000000000001', null, 'Prof B');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('82000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000001', 'Corte M', 60, 90);

insert into public.professional_services (salon_id, professional_id, service_id) values
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001'),
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-00000000000b', '82000000-0000-0000-0000-000000000001');

insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim) values
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-00000000000a', 2, '09:00', '18:00'),
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-00000000000b', 2, '09:00', '18:00');

-- Duas "Ana Souza" (homônimas), uma anonimizada e uma cliente do salão N.
insert into public.clients (id, salon_id, nome, telefone, anonimizado_em) values
  ('83000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000001', 'Ana Souza', '+5511987650001', null),
  ('83000000-0000-0000-0000-000000000002', '8a000000-0000-0000-0000-000000000001', 'Ana Souza', '+5511987650002', null),
  ('83000000-0000-0000-0000-000000000003', '8a000000-0000-0000-0000-000000000001', 'Ana Apagada', null, now()),
  ('83000000-0000-0000-0000-0000000000ff', '8b000000-0000-0000-0000-000000000001', 'Ana de N', '+5511987650009', null);

insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, status) values
  ('8a000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-00000000000b', '82000000-0000-0000-0000-000000000001',
   '83000000-0000-0000-0000-000000000001', '2020-01-07 12:00Z', '2020-01-07 13:00Z', 90, 'concluido');

set local role authenticated;

-- Profissional (A) do salão M
select set_config('request.jwt.claims', '{"sub":"80000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', 'ana')),
  2,
  'busca por nome acha as homônimas e esconde a anonimizada'
);
select results_eq(
  $$select ultimo_atendimento from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', 'souza') order by id$$,
  $$values ('2020-01-07 12:00Z'::timestamptz), (null::timestamptz)$$,
  'último atendimento (concluído) diferencia as homônimas'
);
select is(
  (select count(*)::int from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', '98765')),
  0,
  'não busca por dígitos do telefone'
);
select is(
  (select count(*)::int from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', 'a')),
  0,
  'busca com menos de 2 letras não devolve nada'
);
select is(
  (select count(*)::int from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', '%%')),
  0,
  '% é texto, não curinga'
);
select is(
  (select count(*)::int from public.clients),
  0,
  'Profissional continua sem ler clients direto'
);

select lives_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 09:00', '83000000-0000-0000-0000-000000000002')$$,
  'Profissional agenda cliente existente na própria agenda'
);
select throws_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000b', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 09:00', '83000000-0000-0000-0000-000000000002')$$,
  '42501', 'sem_permissao',
  'Profissional não agenda na agenda de outro'
);
select lives_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 10:00', p_cliente_nome => 'Bia Nova', p_cliente_telefone => '+5511987650003')$$,
  'Profissional cadastra cliente novo ao agendar'
);
select lives_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 11:00', p_cliente_nome => 'Outro Nome', p_cliente_telefone => '+5511987650001')$$,
  'WhatsApp já cadastrado vai para o cliente existente'
);
select results_eq(
  $$select cliente_nome, cliente_telefone is null from public.agenda('8a000000-0000-0000-0000-000000000001', '2030-01-08', '2030-01-08') order by inicio$$,
  $$values ('Ana Souza', true), ('Bia Nova', true), ('Ana Souza', true)$$,
  'agenda mostra os nomes (o do cadastro, não o digitado) e nenhum telefone'
);
select throws_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 13:00', '83000000-0000-0000-0000-0000000000ff')$$,
  '22023', 'cliente_nao_encontrado',
  'cliente de outro salão é recusado'
);
select throws_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 13:00', '83000000-0000-0000-0000-000000000003')$$,
  '22023', 'cliente_nao_encontrado',
  'cliente anonimizado é recusado'
);

-- Dono(a) do salão M agenda em qualquer agenda
select set_config('request.jwt.claims', '{"sub":"80000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000b', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 09:00', '83000000-0000-0000-0000-000000000001')$$,
  'Dono(a) agenda na agenda de B'
);

-- Dono(a) do salão N
select set_config('request.jwt.claims', '{"sub":"88000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', 'ana')$$,
  '42501', 'sem_permissao',
  'Dono(a) de outro salão não busca clientes do salão M'
);
select throws_ok(
  $$select public.criar_agendamento('81000000-0000-0000-0000-00000000000a', '82000000-0000-0000-0000-000000000001',
    '2030-01-08 14:00', '83000000-0000-0000-0000-0000000000ff')$$,
  'P0002', 'profissional_nao_encontrado',
  'Dono(a) de outro salão não agenda no salão M'
);

-- Anônimo
reset role;
set local role anon;
select throws_ok(
  $$select * from public.buscar_clientes_por_nome('8a000000-0000-0000-0000-000000000001', 'ana')$$,
  '42501', null,
  'anon não executa a busca'
);

select * from finish();
rollback;
