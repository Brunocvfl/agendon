-- Agenda: criar_agendamento (expediente, encaixe, conflito, cliente novo), horarios_livres
-- e agenda() (Profissional vê só a própria agenda, com o nome do cliente e sem o telefone).
-- Datas: terça-feira, 08/01/2030, no fuso America/Sao_Paulo (UTC-3).

begin;
select plan(23);

insert into auth.users (id, email) values
  ('60000000-0000-0000-0000-000000000001', 'dono.i@teste.local'),
  ('60000000-0000-0000-0000-000000000002', 'recepcao.i@teste.local'),
  ('60000000-0000-0000-0000-000000000003', 'prof.i@teste.local'),
  ('67000000-0000-0000-0000-000000000001', 'dono.j@teste.local');

insert into public.salons (id, nome, slug) values
  ('66666666-0000-0000-0000-000000000001', 'Salão I', 'salao-agenda-i'),
  ('67777777-0000-0000-0000-000000000001', 'Salão J', 'salao-agenda-j');

insert into public.members (id, salon_id, user_id, perfil) values
  ('68000000-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'dono'),
  ('68000000-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'recepcao'),
  ('68000000-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 'profissional'),
  ('68000000-0000-0000-0000-000000000004', '67777777-0000-0000-0000-000000000001', '67000000-0000-0000-0000-000000000001', 'dono');

-- A tem login (perfil Profissional); B não tem; X é do salão J.
insert into public.professionals (id, salon_id, member_id, nome) values
  ('61000000-0000-0000-0000-00000000000a', '66666666-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000003', 'Prof A'),
  ('61000000-0000-0000-0000-00000000000b', '66666666-0000-0000-0000-000000000001', null, 'Prof B'),
  ('61000000-0000-0000-0000-00000000000c', '67777777-0000-0000-0000-000000000001', null, 'Prof X');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('62000000-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Corte I', 60, 90),
  ('62000000-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', 'Barba I', 30, 40),
  ('62000000-0000-0000-0000-000000000003', '67777777-0000-0000-0000-000000000001', 'Corte J', 60, 90);

-- B faz o Corte com duração e preço próprios (30 min, R$ 100) e não faz Barba.
insert into public.professional_services (salon_id, professional_id, service_id, duracao_min, preco) values
  ('66666666-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001', null, null),
  ('66666666-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000b', '62000000-0000-0000-0000-000000000001', 30, 100),
  ('67777777-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000c', '62000000-0000-0000-0000-000000000003', null, null);

-- Terça (dia 2): A 09–12 e 13–18; B 09–18. A tem folga 15:00–16:00 em 08/01/2030.
insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim) values
  ('66666666-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000a', 2, '09:00', '12:00'),
  ('66666666-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000a', 2, '13:00', '18:00'),
  ('66666666-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000b', 2, '09:00', '18:00'),
  ('67777777-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000c', 2, '09:00', '18:00');

insert into public.time_off (salon_id, professional_id, inicio, fim) values
  ('66666666-0000-0000-0000-000000000001', '61000000-0000-0000-0000-00000000000a', '2030-01-08 18:00Z', '2030-01-08 19:00Z');

insert into public.clients (id, salon_id, nome, telefone) values
  ('63000000-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Cliente Um', '+5511900000001');

set local role authenticated;

-- Dono(a) do salão I
select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select isnt(
  public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 09:00', '63000000-0000-0000-0000-000000000001'),
  null,
  'Dono(a) cria agendamento dentro do expediente'
);
select results_eq(
  $$select inicio, fim, preco, origem::text from public.appointments
    where professional_id = '61000000-0000-0000-0000-00000000000a'$$,
  $$values ('2030-01-08 12:00Z'::timestamptz, '2030-01-08 13:00Z'::timestamptz, 90.00::numeric, 'painel')$$,
  'horário local vira UTC; fim e preço vêm do serviço'
);
select throws_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 09:30', '63000000-0000-0000-0000-000000000001')$$,
  '23P01', null,
  'horário sobreposto é recusado'
);
select throws_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 11:30', '63000000-0000-0000-0000-000000000001')$$,
  '22023', 'fora_do_expediente',
  'invadir o intervalo exige encaixe'
);
select isnt(
  public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 11:30', '63000000-0000-0000-0000-000000000001', p_encaixe => true),
  null,
  'com encaixe, o agendamento fora do expediente é aceito'
);
select throws_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 15:00', '63000000-0000-0000-0000-000000000001')$$,
  '22023', 'fora_do_expediente',
  'folga também exige encaixe'
);
select throws_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000b', '62000000-0000-0000-0000-000000000002',
    '2030-01-08 10:00', '63000000-0000-0000-0000-000000000001')$$,
  '22023', 'servico_nao_atendido',
  'serviço que o profissional não faz é recusado'
);
select lives_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000b', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 10:00', '63000000-0000-0000-0000-000000000001')$$,
  'Dono(a) agenda com o profissional B'
);
select results_eq(
  $$select fim - inicio, preco from public.appointments
    where professional_id = '61000000-0000-0000-0000-00000000000b' and inicio = '2030-01-08 13:00Z'$$,
  $$values (interval '30 minutes', 100.00::numeric)$$,
  'duração e preço próprios do profissional valem'
);
select lives_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000b', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 11:00', p_cliente_nome => 'Cliente Novo', p_cliente_telefone => '+5511900000002')$$,
  'cria o cliente junto com o agendamento'
);
select lives_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000b', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 11:30', p_cliente_nome => 'Outro Nome', p_cliente_telefone => '+5511900000002')$$,
  'WhatsApp já cadastrado reaproveita o cliente'
);
select is(
  (select count(*)::int from public.clients where salon_id = '66666666-0000-0000-0000-000000000001'),
  2,
  'nenhum cliente duplicado'
);
do $$ begin
  perform public.mudar_status(
    (select id from public.appointments where professional_id = '61000000-0000-0000-0000-00000000000a' and inicio = '2030-01-08 12:00Z'),
    'cancelado');
end $$;
select lives_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 09:00', '63000000-0000-0000-0000-000000000001')$$,
  'cancelado libera o horário'
);
select throws_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000c', '62000000-0000-0000-0000-000000000003',
    '2030-01-08 10:00', '63000000-0000-0000-0000-000000000001')$$,
  'P0002', 'profissional_nao_encontrado',
  'Dono(a) do salão I não agenda no salão J (o profissional nem aparece)'
);

-- Livres de A (Corte, 60 min): 10:00–10:30, 13:00–14:00 e 16:00–17:00, de 15 em 15.
select is(
  (select count(*)::int from public.horarios_livres('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001', '2030-01-08')),
  13,
  'horários livres respeitam ocupados, intervalo, folga e duração'
);
select is(
  (select min(h) from public.horarios_livres('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001', '2030-01-08') h),
  '2030-01-08 13:00Z'::timestamptz,
  'primeiro horário livre é 10:00 (horário do salão)'
);

select is(
  (select count(*)::int from public.agenda('66666666-0000-0000-0000-000000000001', '2030-01-08', '2030-01-08') where cliente_telefone is not null),
  6,
  'Dono(a) vê a agenda de todos, com telefone'
);
select throws_ok(
  $$select * from public.agenda('66666666-0000-0000-0000-000000000001', '2030-01-08', '2030-03-08')$$,
  '22023', 'periodo_invalido',
  'período acima de 31 dias é recusado'
);

-- Profissional (A) do salão I
select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.criar_agendamento('61000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-000000000001',
    '2030-01-08 13:00', '63000000-0000-0000-0000-000000000001')$$,
  '42501', 'sem_permissao',
  'Profissional ainda não agenda pelo painel'
);
select is(
  (select count(*)::int from public.agenda('66666666-0000-0000-0000-000000000001', '2030-01-08', '2030-01-08')
    where professional_id = '61000000-0000-0000-0000-00000000000a'),
  3,
  'Profissional vê a própria agenda'
);
select is(
  (select count(*)::int from public.agenda('66666666-0000-0000-0000-000000000001', '2030-01-08', '2030-01-08')
    where professional_id <> '61000000-0000-0000-0000-00000000000a' or cliente_telefone is not null
       or cliente_id is not null or cliente_nome is null),
  0,
  'Profissional não vê outras agendas nem telefone e id do cliente, só o nome'
);

-- Dono(a) do salão J
select set_config('request.jwt.claims', '{"sub":"67000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.agenda('66666666-0000-0000-0000-000000000001', '2030-01-08', '2030-01-08')$$,
  '42501', 'sem_permissao',
  'Dono(a) do salão J não lê a agenda do salão I'
);

-- Anônimo
reset role;
set local role anon;
select throws_ok(
  $$select * from public.agenda('66666666-0000-0000-0000-000000000001', '2030-01-08', '2030-01-08')$$,
  '42501', null,
  'anon não executa agenda'
);

select * from finish();
rollback;
