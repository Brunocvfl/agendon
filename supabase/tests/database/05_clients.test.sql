-- Clientes: quem vê e edita (só Dono(a) e Recepção), dados válidos, sem delete,
-- isolamento entre salões e a lista com busca (listar_clientes).

begin;
select plan(21);

insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'dono.g@teste.local'),
  ('50000000-0000-0000-0000-000000000002', 'recepcao.g@teste.local'),
  ('50000000-0000-0000-0000-000000000003', 'prof.g@teste.local'),
  ('56000000-0000-0000-0000-000000000001', 'dono.h@teste.local');

insert into public.salons (id, nome, slug) values
  ('55555555-0000-0000-0000-000000000001', 'Salão G', 'salao-clientes-g'),
  ('56666666-0000-0000-0000-000000000001', 'Salão H', 'salao-clientes-h');

insert into public.members (id, salon_id, user_id, perfil) values
  ('57000000-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'dono'),
  ('57000000-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'recepcao'),
  ('57000000-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'profissional'),
  ('57000000-0000-0000-0000-000000000004', '56666666-0000-0000-0000-000000000001', '56000000-0000-0000-0000-000000000001', 'dono');

insert into public.professionals (id, salon_id, member_id, nome) values
  ('51000000-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000003', 'Prof G');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('52000000-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Corte G', 60, 90);

insert into public.clients (id, salon_id, nome, telefone) values
  ('53000000-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Marina Prado', '+5511987654321'),
  ('53000000-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', 'Lucas 100%_Faria', '+5511912345678'),
  ('53000000-0000-0000-0000-000000000003', '56666666-0000-0000-0000-000000000001', 'Cliente do H', '+5521999990000');

-- Histórico da Marina: 2 concluídos, 1 falta, 1 cancelado.
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, status) values
  ('55555555-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
   '53000000-0000-0000-0000-000000000001', '2026-10-01 12:00Z', '2026-10-01 13:00Z', 'concluido'),
  ('55555555-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
   '53000000-0000-0000-0000-000000000001', '2026-10-15 12:00Z', '2026-10-15 13:00Z', 'concluido'),
  ('55555555-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
   '53000000-0000-0000-0000-000000000001', '2026-10-20 12:00Z', '2026-10-20 13:00Z', 'faltou'),
  ('55555555-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
   '53000000-0000-0000-0000-000000000001', '2026-10-25 12:00Z', '2026-10-25 13:00Z', 'cancelado');

set local role authenticated;

-- Dono(a) do salão G
select set_config('request.jwt.claims', '{"sub":"50000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.clients), 2, 'Dono(a) vê só os clientes do próprio salão');
select lives_ok(
  $$insert into public.clients (salon_id, nome, telefone) values ('55555555-0000-0000-0000-000000000001', 'Júlia Ramos', '+5511976543210')$$,
  'Dono(a) cadastra cliente'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome) values ('55555555-0000-0000-0000-000000000001', 'Sem Telefone')$$,
  '23514', null,
  'WhatsApp é obrigatório'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone) values ('55555555-0000-0000-0000-000000000001', 'Formato Errado', '11987654321')$$,
  '23514', null,
  'WhatsApp fora do E.164 é recusado'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone) values ('55555555-0000-0000-0000-000000000001', 'Outra Marina', '+5511987654321')$$,
  '23505', null,
  'mesmo WhatsApp duas vezes no salão é recusado'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone) values ('55555555-0000-0000-0000-000000000001', 'X', '+5511900001111')$$,
  '23514', null,
  'nome curto demais é recusado'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone, observacoes) values ('55555555-0000-0000-0000-000000000001', 'Muito Texto', '+5511900002222', repeat('x', 501))$$,
  '23514', null,
  'observações acima de 500 caracteres são recusadas'
);
select throws_ok(
  $$delete from public.clients where id = '53000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'cliente não é apagado (a eliminação será por anonimização)'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone) values ('56666666-0000-0000-0000-000000000001', 'Intrusa', '+5511900003333')$$,
  '42501', null,
  'Dono(a) do salão G não cadastra cliente no salão H'
);
select is_empty(
  $$update public.clients set nome = 'Alterado' where id = '53000000-0000-0000-0000-000000000003' returning id$$,
  'Dono(a) do salão G não altera cliente do salão H'
);

-- listar_clientes
select is(
  (select total::int from public.listar_clientes('55555555-0000-0000-0000-000000000001') limit 1),
  3,
  'lista traz o total de clientes do salão'
);
select results_eq(
  $$select nome, visitas, faltas, ultimo_atendimento from public.listar_clientes('55555555-0000-0000-0000-000000000001', 'marina')$$,
  $$values ('Marina Prado'::text, 2, 1, '2026-10-15 12:00Z'::timestamptz)$$,
  'busca por nome (sem diferenciar maiúsculas) com visitas, faltas e último atendimento'
);
select results_eq(
  $$select nome from public.listar_clientes('55555555-0000-0000-0000-000000000001', '(11) 91234')$$,
  $$values ('Lucas 100%_Faria'::text)$$,
  'busca pelos dígitos do WhatsApp'
);
select is(
  (select count(*)::int from public.listar_clientes('55555555-0000-0000-0000-000000000001', '%')),
  1,
  '% digitado é procurado como texto, não como curinga'
);
select is(
  (select count(*)::int from public.listar_clientes('55555555-0000-0000-0000-000000000001', '', 2, 2)),
  1,
  'paginação com limite e deslocamento'
);
select throws_ok(
  $$select * from public.listar_clientes('56666666-0000-0000-0000-000000000001')$$,
  '42501', 'sem_permissao',
  'Dono(a) do salão G não lista clientes do salão H'
);

-- Recepção do salão G
select set_config('request.jwt.claims', '{"sub":"50000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$update public.clients set observacoes = 'Prefere manhã' where id = '53000000-0000-0000-0000-000000000001'$$,
  'Recepção edita cliente'
);

-- Profissional do salão G
select set_config('request.jwt.claims', '{"sub":"50000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.clients), 0, 'Profissional não vê clientes');
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone) values ('55555555-0000-0000-0000-000000000001', 'Pelo Prof', '+5511900004444')$$,
  '42501', null,
  'Profissional não cadastra cliente'
);
select throws_ok(
  $$select * from public.listar_clientes('55555555-0000-0000-0000-000000000001')$$,
  '42501', 'sem_permissao',
  'Profissional não usa a lista de clientes'
);

-- Anônimo
reset role;
set local role anon;
select throws_ok(
  $$select * from public.listar_clientes('55555555-0000-0000-0000-000000000001')$$,
  '42501', null,
  'anon não executa listar_clientes'
);

select * from finish();
rollback;
