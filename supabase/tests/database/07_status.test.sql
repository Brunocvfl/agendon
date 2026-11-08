-- Status e remarcação: mudar_status (transições, início, conflito ao reabrir), remarcar_agendamento
-- (duração, serviço, expediente, conflito, só na própria agenda), horarios_livres(p_ignorar),
-- agendamento(id) e o fim do UPDATE direto. Datas: terça 08/01/2030 (futuro) e terça 07/01/2020 (passado).

begin;
select plan(30);

insert into auth.users (id, email) values
  ('70000000-0000-0000-0000-000000000001', 'dono.k@teste.local'),
  ('70000000-0000-0000-0000-000000000002', 'recepcao.k@teste.local'),
  ('70000000-0000-0000-0000-000000000003', 'prof.k@teste.local'),
  ('77000000-0000-0000-0000-000000000001', 'dono.l@teste.local');

insert into public.salons (id, nome, slug) values
  ('7a000000-0000-0000-0000-000000000001', 'Salão K', 'salao-status-k'),
  ('7b000000-0000-0000-0000-000000000001', 'Salão L', 'salao-status-l');

insert into public.members (id, salon_id, user_id, perfil) values
  ('78000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'dono'),
  ('78000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'recepcao'),
  ('78000000-0000-0000-0000-000000000003', '7a000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'profissional'),
  ('78000000-0000-0000-0000-000000000004', '7b000000-0000-0000-0000-000000000001', '77000000-0000-0000-0000-000000000001', 'dono');

-- A tem login (Profissional); B não tem; C não faz o Corte; X é do salão L.
insert into public.professionals (id, salon_id, member_id, nome) values
  ('71000000-0000-0000-0000-00000000000a', '7a000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000003', 'Prof A'),
  ('71000000-0000-0000-0000-00000000000b', '7a000000-0000-0000-0000-000000000001', null, 'Prof B'),
  ('71000000-0000-0000-0000-00000000000c', '7a000000-0000-0000-0000-000000000001', null, 'Prof C'),
  ('71000000-0000-0000-0000-0000000000ff', '7b000000-0000-0000-0000-000000000001', null, 'Prof X');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('72000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'Corte K', 60, 90),
  ('72000000-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000001', 'Corte L', 60, 90);

-- B faz o Corte em 30 min.
insert into public.professional_services (salon_id, professional_id, service_id, duracao_min) values
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000a', '72000000-0000-0000-0000-000000000001', null),
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000b', '72000000-0000-0000-0000-000000000001', 30),
  ('7b000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-0000000000ff', '72000000-0000-0000-0000-000000000002', null);

-- Terça: todos das 09 às 18 (horário do salão).
insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim) values
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000a', 2, '09:00', '18:00'),
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000b', 2, '09:00', '18:00'),
  ('7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000c', 2, '09:00', '18:00'),
  ('7b000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-0000000000ff', 2, '09:00', '18:00');

insert into public.clients (id, salon_id, nome, telefone) values
  ('73000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'Cliente K', '+5511910000001');

-- F1 (A, futuro), F2 (B, futuro, R$ 100), G (B, futuro), P1 e P2 (A, passado).
insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco, status) values
  ('74000000-0000-0000-0000-0000000000f1', '7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000a',
   '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '2030-01-08 12:00Z', '2030-01-08 13:00Z', 90, 'agendado'),
  ('74000000-0000-0000-0000-0000000000f2', '7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000b',
   '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '2030-01-08 12:00Z', '2030-01-08 12:30Z', 100, 'agendado'),
  ('74000000-0000-0000-0000-0000000000a9', '7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000b',
   '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '2030-01-08 18:00Z', '2030-01-08 18:30Z', 100, 'agendado'),
  ('74000000-0000-0000-0000-0000000000b1', '7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000a',
   '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '2020-01-07 12:00Z', '2020-01-07 13:00Z', 90, 'agendado'),
  ('74000000-0000-0000-0000-0000000000b2', '7a000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-00000000000a',
   '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '2020-01-07 14:00Z', '2020-01-07 15:00Z', 90, 'confirmado');

set local role authenticated;

-- Recepção do salão K
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000f1', 'confirmado')$$,
  'agendado → confirmado'
);
select is(
  (select status::text from public.appointments where id = '74000000-0000-0000-0000-0000000000f1'),
  'confirmado',
  'status gravado'
);
select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000f1', 'confirmado')$$,
  '22023', 'transicao_invalida',
  'confirmado → confirmado é recusado'
);
select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000f1', 'concluido')$$,
  '22023', 'ainda_nao_comecou',
  'concluir antes do início é recusado'
);
select lives_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000b1', 'concluido')$$,
  'concluir depois do início'
);
select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000b1', 'agendado')$$,
  '22023', 'transicao_invalida',
  'concluído é final'
);
select lives_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000f1', 'cancelado')$$,
  'confirmado → cancelado'
);
select throws_ok(
  $$update public.appointments set status = 'agendado' where id = '74000000-0000-0000-0000-0000000000f1'$$,
  '42501', null,
  'UPDATE direto não é permitido'
);
select lives_ok(
  $$select public.criar_agendamento('71000000-0000-0000-0000-00000000000a', '72000000-0000-0000-0000-000000000001',
    '2030-01-08 09:00', '73000000-0000-0000-0000-000000000001')$$,
  'cancelado libera o horário para outro agendamento'
);
select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000f1', 'agendado')$$,
  '23P01', null,
  'reabrir um cancelado cujo horário foi ocupado dá conflito'
);
select throws_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f1', '71000000-0000-0000-0000-00000000000a', '2030-01-08 14:00')$$,
  '22023', 'transicao_invalida',
  'cancelado não é remarcado'
);

do $$ begin perform public.mudar_status('74000000-0000-0000-0000-0000000000f2', 'confirmado'); end $$;
select lives_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000b', '2030-01-08 14:00')$$,
  'remarca no mesmo profissional'
);
select results_eq(
  $$select inicio, fim - inicio, status::text from public.appointments where id = '74000000-0000-0000-0000-0000000000f2'$$,
  $$values ('2030-01-08 17:00Z'::timestamptz, interval '30 minutes', 'agendado')$$,
  'novo horário em UTC, mesma duração e volta para agendado'
);
select lives_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000a', '2030-01-08 14:00')$$,
  'remarca para outro profissional'
);
select results_eq(
  $$select professional_id, fim - inicio, preco from public.appointments where id = '74000000-0000-0000-0000-0000000000f2'$$,
  $$values ('71000000-0000-0000-0000-00000000000a'::uuid, interval '60 minutes', 100.00::numeric)$$,
  'outro profissional: duração dele, preço mantido'
);
select throws_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000c', '2030-01-08 14:00')$$,
  '22023', 'servico_nao_atendido',
  'profissional que não faz o serviço é recusado'
);
select throws_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-0000000000ff', '2030-01-08 14:00')$$,
  'P0002', 'profissional_nao_encontrado',
  'profissional de outro salão é recusado'
);
select throws_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000a', '2030-01-08 07:00')$$,
  '22023', 'fora_do_expediente',
  'fora do expediente exige encaixe'
);
select lives_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000a', '2030-01-08 07:00', true)$$,
  'com encaixe, remarca fora do expediente'
);
select throws_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000a', '2030-01-08 09:30')$$,
  '23P01', null,
  'remarcar para um horário ocupado dá conflito'
);

-- A tem só o agendamento das 09–10 no expediente: ignorando-o, ganha 09:00, 09:15, 09:30 e 09:45.
select is(
  (select count(*)::int from public.horarios_livres('71000000-0000-0000-0000-00000000000a', '72000000-0000-0000-0000-000000000001', '2030-01-08',
     (select id from public.appointments where professional_id = '71000000-0000-0000-0000-00000000000a' and inicio = '2030-01-08 12:00Z' and status = 'agendado')))
  - (select count(*)::int from public.horarios_livres('71000000-0000-0000-0000-00000000000a', '72000000-0000-0000-0000-000000000001', '2030-01-08')),
  4,
  'horarios_livres ignora o agendamento que está sendo remarcado'
);

-- Profissional (A) do salão K
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000a9', 'confirmado')$$,
  '42501', 'sem_permissao',
  'Profissional não muda o status na agenda de outro'
);
select lives_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000b2', 'faltou')$$,
  'Profissional marca falta na própria agenda'
);
select throws_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000b', '2030-01-08 14:00')$$,
  '42501', 'sem_permissao',
  'Profissional não passa agendamento para a agenda de outro'
);
select lives_ok(
  $$select public.remarcar_agendamento('74000000-0000-0000-0000-0000000000f2', '71000000-0000-0000-0000-00000000000a', '2030-01-08 15:00')$$,
  'Profissional remarca na própria agenda'
);
select results_eq(
  $$select profissional, cliente_nome, cliente_id is null, cliente_telefone is null
    from public.agendamento('74000000-0000-0000-0000-0000000000f2')$$,
  $$values ('Prof A', 'Cliente K', true, true)$$,
  'agendamento(): Profissional vê o nome do cliente, sem id nem telefone'
);
select is(
  (select count(*)::int from public.agendamento('74000000-0000-0000-0000-0000000000a9')),
  0,
  'agendamento(): Profissional não lê o da agenda de outro'
);

-- Dono(a) do salão L
select set_config('request.jwt.claims', '{"sub":"77000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000a9', 'confirmado')$$,
  'P0002', 'agendamento_nao_encontrado',
  'Dono(a) de outro salão não muda o status'
);
select is(
  (select count(*)::int from public.agendamento('74000000-0000-0000-0000-0000000000a9')),
  0,
  'Dono(a) de outro salão não lê o agendamento'
);

-- Anônimo
reset role;
set local role anon;
select throws_ok(
  $$select public.mudar_status('74000000-0000-0000-0000-0000000000a9', 'confirmado')$$,
  '42501', null,
  'anon não executa mudar_status'
);

select * from finish();
rollback;
