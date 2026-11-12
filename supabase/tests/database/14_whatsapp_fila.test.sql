-- WhatsApp: fila de saída (message_log), gatilho da confirmação e funções do servidor.
-- Só o servidor (service_role) chama as funções; Dono(a) lê as mensagens do próprio salão.

begin;
select plan(43);

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'dono.w@teste.local'),
  ('e0000000-0000-0000-0000-000000000002', 'dono.x@teste.local');

insert into public.salons (id, nome, slug, status) values
  ('e1000000-0000-0000-0000-000000000001', 'Salão W', 'salao-wpp-w', 'ativo'),
  ('e1000000-0000-0000-0000-000000000002', 'Salão X', 'salao-wpp-x', 'ativo');

insert into public.members (id, salon_id, user_id, perfil) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'dono'),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'dono');

insert into public.professionals (id, salon_id, nome) values
  ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Prof W');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Corte W', 60, 90);
insert into public.professional_services (salon_id, professional_id, service_id, preco) values
  ('e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', null);
insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim)
select 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', d, '09:00', '18:00'
from generate_series(0, 6) d;

-- Clientes: C1 e C5 com opt-in; C2 sem; C3 saiu (SAIR); C4 anonimizado (com sobra de consentimento).
insert into public.clients (id, salon_id, nome, telefone, consentimento_whatsapp_em, consentimento_origem, optout_em, anonimizado_em) values
  ('e5000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Cliente C1', '+5511987800001', now(), 'pagina_publica', null, null),
  ('e5000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Cliente C2', '+5511987800002', null, null, null, null),
  ('e5000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Cliente C3', '+5511987800003', now(), 'pagina_publica', now(), null),
  ('e5000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'Cliente anonimizado', null, now(), 'pagina_publica', null, now()),
  ('e5000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'Cliente C5', '+5511987800005', now(), 'pagina_publica', null, null);

-- A fila começa só com os dados deste teste (o seed pode ter deixado mensagens).
delete from public.message_log where salon_id not in
  ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002');

insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco) values
  ('e6000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', '2030-03-05 12:00Z', '2030-03-05 13:00Z', 90),
  ('e6000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000002', '2030-03-05 13:00Z', '2030-03-05 14:00Z', 90),
  ('e6000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000003', '2030-03-05 14:00Z', '2030-03-05 15:00Z', 90),
  ('e6000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000004', '2030-03-05 15:00Z', '2030-03-05 16:00Z', 90),
  ('e6000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000005', '2030-03-05 16:00Z', '2030-03-05 17:00Z', 90),
  ('e6000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', '2030-03-05 17:00Z', '2030-03-05 18:00Z', 90);

-- Gatilho: só quem tem opt-in e não saiu entra na fila.
select is(
  (select count(*)::int from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000001'),
  1, 'cliente com opt-in: confirmação na fila');
select results_eq(
  $$select tipo, status, template, tentativas, client_id from public.message_log
    where appointment_id = 'e6000000-0000-0000-0000-000000000001'$$,
  $$values ('confirmacao'::text, 'na_fila'::text, 'confirmacao_agendamento'::text, 0, 'e5000000-0000-0000-0000-000000000001'::uuid)$$,
  'a mensagem na fila não guarda telefone nem nome, só o cliente e o template');
select is(
  (select count(*)::int from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000002'),
  0, 'cliente sem opt-in: nada na fila');
select is(
  (select count(*)::int from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000003'),
  0, 'cliente que respondeu SAIR: nada na fila');
select is(
  (select count(*)::int from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000004'),
  0, 'cliente anonimizado: nada na fila');
select throws_ok(
  $$insert into public.message_log (salon_id, appointment_id, client_id, tipo)
    values ('e1000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
            'e5000000-0000-0000-0000-000000000001', 'confirmacao')$$,
  '23505', null, 'uma confirmação por agendamento');
select is(
  (select count(*)::int from public.message_log where salon_id = 'e1000000-0000-0000-0000-000000000001'),
  3, 'três mensagens na fila (agendamentos 1, 5 e 6)');

-- O agendamento 5 é cancelado antes do envio.
update public.appointments set status = 'cancelado' where id = 'e6000000-0000-0000-0000-000000000005';

-- Permissões: só o servidor chama as funções; Dono(a) só lê o que é do próprio salão.
set local role anon;
select throws_ok($$select * from public.whatsapp_reservar(10)$$, '42501', null, 'anon não reserva mensagens');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select * from public.whatsapp_reservar(10)$$, '42501', null, 'usuário logado não reserva mensagens');
select throws_ok($$select public.whatsapp_optout(array['+5511987800001'])$$, '42501', null, 'usuário logado não registra opt-out');
select throws_ok($$select public.whatsapp_status_meta('wamid.X', 'lida', null)$$, '42501', null, 'usuário logado não muda status');
select throws_ok($$update public.message_log set status = 'lida'$$, '42501', null, 'usuário logado não altera message_log');
select is(
  (select count(*)::int from public.message_log), 3, 'Dono(a) do salão W vê as mensagens do salão');
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.message_log), 0, 'Dono(a) do salão X não vê mensagens do salão W');
reset role;

-- Reservar: descarta o que perdeu o sentido e entrega o resto com o que o envio precisa.
set local role service_role;
select results_eq(
  $$select telefone, cliente_nome, salao, servico, profissional, template, tipo
    from public.whatsapp_reservar(50) order by inicio$$,
  $$values
    ('+5511987800001'::text, 'Cliente C1'::text, 'Salão W'::text, 'Corte W'::text, 'Prof W'::text, 'confirmacao_agendamento'::text, 'confirmacao'::text),
    ('+5511987800001'::text, 'Cliente C1'::text, 'Salão W'::text, 'Corte W'::text, 'Prof W'::text, 'confirmacao_agendamento'::text, 'confirmacao'::text)$$,
  'reservar devolve os dados do envio (agendamentos 1 e 6)');
reset role;
select is(
  (select count(*)::int from public.message_log
   where appointment_id in ('e6000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000006')
     and status = 'enviando' and tentativas = 1),
  2, 'reservadas ficam enviando, com uma tentativa');
select results_eq(
  $$select status, erro from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000005'$$,
  $$values ('falhou'::text, 'cancelada_antes_do_envio'::text)$$,
  'agendamento cancelado antes do envio: não envia');
set local role service_role;
select is((select count(*)::int from public.whatsapp_reservar(50)), 0, 'nada a reservar de novo');
reset role;

select set_config('test.m1', (select id::text from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000001'), true);
select set_config('test.m6', (select id::text from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000006'), true);

-- Resultado do envio e status do webhook (nunca voltam para trás).
set local role service_role;
select lives_ok(
  $$select public.whatsapp_resultado(current_setting('test.m1')::uuid, 'enviada', 'wamid.TESTE1', null)$$,
  'resultado: enviada com o id da Meta');
reset role;
select results_eq(
  $$select status, meta_message_id, enviada_em is not null from public.message_log where id = current_setting('test.m1')::uuid$$,
  $$values ('enviada'::text, 'wamid.TESTE1'::text, true)$$,
  'mensagem enviada guarda o id da Meta e o horário');
set local role service_role;
select throws_ok(
  $$select public.whatsapp_resultado(current_setting('test.m1')::uuid, 'lida', null, null)$$,
  '22023', 'status_invalido', 'resultado só aceita enviada, falhou ou na_fila');
select is(public.whatsapp_status_meta('wamid.TESTE1', 'entregue', null), 1, 'webhook: entregue');
select is(public.whatsapp_status_meta('wamid.TESTE1', 'enviada', null), 0, 'webhook: não volta de entregue para enviada');
select is(public.whatsapp_status_meta('wamid.TESTE1', 'lida', null), 1, 'webhook: lida');
select is(public.whatsapp_status_meta('wamid.TESTE1', 'falhou', 'x'), 0, 'webhook: lida não vira falha');
select is(public.whatsapp_status_meta('wamid.NAOEXISTE', 'entregue', null), 0, 'webhook: id desconhecido não muda nada');
select throws_ok(
  $$select public.whatsapp_status_meta('wamid.TESTE1', 'xyz', null)$$, '22023', 'status_invalido',
  'webhook: status desconhecido é recusado');

select lives_ok(
  $$select public.whatsapp_resultado(current_setting('test.m6')::uuid, 'enviada', 'wamid.TESTE6', null)$$,
  'resultado: segunda mensagem enviada');
select is(public.whatsapp_status_meta('wamid.TESTE6', 'falhou', '131026: Message undeliverable'), 1, 'webhook: falha depois de enviada');
reset role;
select results_eq(
  $$select status, erro from public.message_log where id = current_setting('test.m6')::uuid$$,
  $$values ('falhou'::text, '131026: Message undeliverable'::text)$$,
  'falha guarda o erro curto');
set local role service_role;
select is(public.whatsapp_status_meta('wamid.TESTE6', 'entregue', null), 0, 'webhook: falha não vira entregue');
reset role;

-- Nova tentativa: volta para a fila até gastar as 3 tentativas; depois é falha.
insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco)
values ('e6000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
        'e4000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', '2030-03-05 18:00Z', '2030-03-05 19:00Z', 90);
select set_config('test.m7', (select id::text from public.message_log where appointment_id = 'e6000000-0000-0000-0000-000000000007'), true);
update public.message_log set status = 'enviando', tentativas = 2 where id = current_setting('test.m7')::uuid;
set local role service_role;
select lives_ok(
  $$select public.whatsapp_resultado(current_setting('test.m7')::uuid, 'na_fila', null, 'sem resposta da Meta')$$,
  'falha temporária com tentativas sobrando');
reset role;
select is((select status from public.message_log where id = current_setting('test.m7')::uuid), 'na_fila', 'volta para a fila');
update public.message_log set status = 'enviando', tentativas = 3 where id = current_setting('test.m7')::uuid;
set local role service_role;
select lives_ok(
  $$select public.whatsapp_resultado(current_setting('test.m7')::uuid, 'na_fila', null, 'sem resposta da Meta')$$,
  'falha temporária com as 3 tentativas gastas');
reset role;
select is((select status from public.message_log where id = current_setting('test.m7')::uuid), 'falhou', 'sem tentativas: falhou');

-- Opt-out (SAIR).
set local role service_role;
select is(public.whatsapp_optout(array['+5511987800005']), 1, 'SAIR: um cliente saiu');
reset role;
select isnt(
  (select optout_em from public.clients where id = 'e5000000-0000-0000-0000-000000000005'), null,
  'cliente fica com a data do opt-out');
select is(
  (select count(*)::int from public.audit_log
   where acao = 'optout_whatsapp' and registro_id = 'e5000000-0000-0000-0000-000000000005'),
  1, 'opt-out fica na auditoria (sem dado pessoal)');
set local role service_role;
select is(public.whatsapp_optout(array['+5511987800005']), 0, 'SAIR repetido não muda nada');
select throws_ok(
  $$select public.whatsapp_optout(array['5511987800005'])$$, '22023', 'telefone_invalido',
  'opt-out exige telefone no formato E.164');
select throws_ok(
  $$select public.whatsapp_optout(array['+5511900000001', '+5511900000002', '+5511900000003', '+5511900000004', '+5511900000005'])$$,
  '22023', 'telefone_invalido', 'opt-out aceita no máximo 4 formas do número');

-- Caminho real: agendar na página pública com opt-in deixa a confirmação na fila.
select lives_ok(
  $$select * from public.agendar_publico('salao-wpp-w', 'e4000000-0000-0000-0000-000000000001', null,
    ((now() at time zone 'America/Sao_Paulo')::date + 10) + time '10:00', 'Nova Cliente', '+5511987800009', true, 'origem-wpp')$$,
  'agendar na página pública com opt-in');
reset role;
select results_eq(
  $$select m.tipo, m.status, m.template, c.consentimento_origem
    from public.message_log m join public.clients c on c.id = m.client_id
    where c.telefone = '+5511987800009'$$,
  $$values ('confirmacao'::text, 'na_fila'::text, 'confirmacao_agendamento'::text, 'pagina_publica'::text)$$,
  'agendamento público com opt-in gera a confirmação na fila');

select * from finish();
rollback;
