-- Exportar a lista de clientes: só Dono(a), isolamento entre salões, filtros, colunas e auditoria.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'dono.ex@teste.local'),
  ('f0000000-0000-0000-0000-000000000002', 'recepcao.ex@teste.local'),
  ('f0000000-0000-0000-0000-000000000003', 'dono.ey@teste.local');

insert into public.salons (id, nome, slug) values
  ('f1000000-0000-0000-0000-000000000001', 'Salão EX', 'salao-exportar-x'),
  ('f1000000-0000-0000-0000-000000000002', 'Salão EY', 'salao-exportar-y');

insert into public.members (id, salon_id, user_id, perfil) values
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'dono'),
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'recepcao'),
  ('f2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 'dono');

insert into public.professionals (id, salon_id, nome) values
  ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Prof EX');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('f4000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Corte EX', 60, 50);

insert into public.clients (id, salon_id, nome, telefone, observacoes, consentimento_whatsapp_em, consentimento_origem, optout_em) values
  ('f5000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Ana Exporta', '+5511966600001', 'Gosta de café', now(), 'pagina_publica', null),
  ('f5000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Bia Exporta', '+5511966600002', null, now(), 'pagina_publica', now()),
  ('f5000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'Caio Exporta', '+5511966600003', null, null, null, null),
  ('f5000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000002', 'Outro Salão', '+5511966600009', null, null, null, null);
insert into public.clients (id, salon_id, nome, telefone, anonimizado_em) values
  ('f5000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'Cliente anonimizado', null, now());

-- Ana: 2 concluídos (50 + 50), 1 faltou, 1 cancelado, 1 futuro.
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, status) values
  ('f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001',
   date_trunc('hour', now()) - interval '30 days', date_trunc('hour', now()) - interval '30 days' + interval '1 hour', 50, 'concluido'),
  ('f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001',
   date_trunc('hour', now()) - interval '20 days', date_trunc('hour', now()) - interval '20 days' + interval '1 hour', 50, 'concluido'),
  ('f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001',
   date_trunc('hour', now()) - interval '10 days', date_trunc('hour', now()) - interval '10 days' + interval '1 hour', 50, 'faltou'),
  ('f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001',
   date_trunc('hour', now()) - interval '5 days', date_trunc('hour', now()) - interval '5 days' + interval '1 hour', 50, 'cancelado'),
  ('f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001',
   date_trunc('hour', now()) + interval '5 days', date_trunc('hour', now()) + interval '5 days 1 hour', 50, 'agendado');

set local role anon;
select throws_ok($$select * from public.exportar_clientes('f1000000-0000-0000-0000-000000000001')$$, '42501', null, 'anon não exporta');
reset role;

set local role authenticated;

-- Recepção: não.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select * from public.exportar_clientes('f1000000-0000-0000-0000-000000000001')$$, '42501', null, 'Recepção não exporta');

-- Dono(a) de outro salão: não.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$select * from public.exportar_clientes('f1000000-0000-0000-0000-000000000001')$$, '42501', null, 'Dono(a) de outro salão não exporta');

-- Dono(a) do salão.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  (select array_agg(e.nome order by e.nome) from public.exportar_clientes('f1000000-0000-0000-0000-000000000001') e),
  array['Ana Exporta', 'Bia Exporta', 'Caio Exporta'], 'todos os clientes do salão, sem anonimizados nem de outro salão');
select is(
  (select array_agg(e.nome order by e.nome) from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', '', 'autorizou') e),
  array['Ana Exporta'], 'filtro autorizou: opt-in sem SAIR');
select is(
  (select array_agg(e.nome order by e.nome) from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', '', 'nao_autorizou') e),
  array['Bia Exporta', 'Caio Exporta'], 'filtro não autorizou: sem opt-in ou saiu');
select is(
  (select array_agg(e.nome) from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', 'caio') e),
  array['Caio Exporta'], 'busca pelo nome');
select is(
  (select array_agg(e.nome) from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', '600002') e),
  array['Bia Exporta'], 'busca pelos dígitos do WhatsApp');
select throws_ok($$select * from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', '', 'outro')$$,
  '22023', 'filtro_invalido', 'filtro desconhecido: erro');

select is(
  (select row(e.visitas, e.faltas, e.cancelamentos, e.total_gasto)::text
   from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', 'ana') e),
  '(2,1,1,100.00)', 'visitas, faltas, cancelamentos e total gasto');
select ok(
  (select e.proximo_agendamento > now() and e.ultimo_atendimento < now()
   from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', 'ana') e),
  'último atendimento e próximo agendamento');
select is(
  (select e.observacoes from public.exportar_clientes('f1000000-0000-0000-0000-000000000001', 'ana') e),
  'Gosta de café', 'traz as observações');
reset role;

select is(
  (select count(*)::int from public.audit_log
   where salon_id = 'f1000000-0000-0000-0000-000000000001' and acao = 'exportar_lista'
     and user_id = 'f0000000-0000-0000-0000-000000000001'),
  8, 'cada exportação do Dono(a) vai para a auditoria');
select is(
  (select count(*)::int from public.audit_log
   where salon_id = 'f1000000-0000-0000-0000-000000000001' and acao = 'exportar_lista'
     and user_id <> 'f0000000-0000-0000-0000-000000000001'),
  0, 'tentativa recusada não registra exportação');

select * from finish();
rollback;
