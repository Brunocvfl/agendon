-- Planos (AGE-15): teste grátis, limite de agendas, franquia de mensagens e teste encerrado.

begin;
select plan(30);

insert into auth.users (id, email) values
  ('a7000000-0000-0000-0000-000000000001', 'dono.plano@teste.local'),
  ('a7000000-0000-0000-0000-000000000002', 'recepcao.plano@teste.local');

-- T: teste com 2 mensagens; E: teste encerrado; P: Essencial; C: cortesia; S: sem linha em subscriptions.
insert into public.salons (id, nome, slug) values
  ('a7100000-0000-0000-0000-000000000001', 'Salão T', 'salao-plano-t'),
  ('a7100000-0000-0000-0000-000000000002', 'Salão E', 'salao-plano-e'),
  ('a7100000-0000-0000-0000-000000000003', 'Salão P', 'salao-plano-p'),
  ('a7100000-0000-0000-0000-000000000004', 'Salão C', 'salao-plano-c'),
  ('a7100000-0000-0000-0000-000000000005', 'Salão S', 'salao-plano-s');

-- Como o create_salon faz: só o salon_id.
insert into public.subscriptions (salon_id) values ('a7100000-0000-0000-0000-000000000001');
select results_eq(
  $$select plano, max_agendas, max_mensagens, teste_ate = now() + interval '30 days'
    from public.subscriptions where salon_id = 'a7100000-0000-0000-0000-000000000001'$$,
  $$values ('teste'::text, 15, 10, true)$$,
  'salão novo começa no teste grátis: 30 dias, 15 agendas e 10 mensagens');
update public.subscriptions set max_mensagens = 2 where salon_id = 'a7100000-0000-0000-0000-000000000001';

insert into public.subscriptions (salon_id, plano, max_agendas, max_mensagens, teste_ate) values
  ('a7100000-0000-0000-0000-000000000002', 'teste', 15, 10, now() - interval '1 minute'),
  ('a7100000-0000-0000-0000-000000000003', 'essencial', 1, 10, null),
  ('a7100000-0000-0000-0000-000000000004', 'cortesia', null, null, null);

select throws_ok(
  $$insert into public.subscriptions (salon_id, plano, teste_ate) values ('a7100000-0000-0000-0000-000000000005', 'essencial', now())$$,
  '23514', null, 'só o teste tem prazo');
select throws_ok(
  $$insert into public.subscriptions (salon_id, plano, teste_ate) values ('a7100000-0000-0000-0000-000000000005', 'gratis', null)$$,
  '23514', null, 'plano desconhecido é recusado');

insert into public.members (salon_id, user_id, perfil) values
  ('a7100000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000001', 'dono'),
  ('a7100000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000002', 'recepcao');

-- Limite de agendas (P: Essencial, 1 agenda).
insert into public.professionals (id, salon_id, nome) values
  ('a7300000-0000-0000-0000-000000000031', 'a7100000-0000-0000-0000-000000000003', 'Prof P1');
select throws_ok(
  $$insert into public.professionals (salon_id, nome) values ('a7100000-0000-0000-0000-000000000003', 'Prof P2')$$,
  'P0001', 'limite_de_agendas', 'Essencial: a segunda agenda ativa é recusada');
select lives_ok(
  $$insert into public.professionals (id, salon_id, nome, ativo) values ('a7300000-0000-0000-0000-000000000032', 'a7100000-0000-0000-0000-000000000003', 'Prof P2', false)$$,
  'agenda inativa não conta');
select throws_ok(
  $$update public.professionals set ativo = true where id = 'a7300000-0000-0000-0000-000000000032'$$,
  'P0001', 'limite_de_agendas', 'reativar além do limite é recusado');
select lives_ok(
  $$update public.professionals set nome = 'Prof P1 editado' where id = 'a7300000-0000-0000-0000-000000000031'$$,
  'editar a agenda que já está ativa continua valendo');
update public.professionals set ativo = false where id = 'a7300000-0000-0000-0000-000000000031';
select lives_ok(
  $$update public.professionals set ativo = true where id = 'a7300000-0000-0000-0000-000000000032'$$,
  'desativou uma, ativa outra');
select lives_ok(
  $$insert into public.professionals (salon_id, nome) values
      ('a7100000-0000-0000-0000-000000000004', 'Prof C1'), ('a7100000-0000-0000-0000-000000000004', 'Prof C2'),
      ('a7100000-0000-0000-0000-000000000005', 'Prof S1'), ('a7100000-0000-0000-0000-000000000005', 'Prof S2')$$,
  'cortesia e salão sem plano não têm limite de agendas');

-- Mensagens permitidas por tipo.
select results_eq(
  $$select app.mensagens_permitidas('a7100000-0000-0000-0000-000000000001', 'confirmacao'),
           app.mensagens_permitidas('a7100000-0000-0000-0000-000000000001', 'lembrete')$$,
  $$values (2, 0)$$, 'teste: só confirmação, sem tolerância');
select results_eq(
  $$select app.mensagens_permitidas('a7100000-0000-0000-0000-000000000003', 'confirmacao'),
           app.mensagens_permitidas('a7100000-0000-0000-0000-000000000003', 'lembrete')$$,
  $$values (11, 10)$$, 'plano pago: confirmação com 10% de tolerância, lembrete para na franquia');
select is(app.mensagens_permitidas('a7100000-0000-0000-0000-000000000002', 'confirmacao'), 0,
  'teste encerrado: nenhuma mensagem');
select ok(app.mensagens_permitidas('a7100000-0000-0000-0000-000000000004', 'lembrete') is null
      and app.mensagens_permitidas('a7100000-0000-0000-0000-000000000005', 'lembrete') is null,
  'cortesia e salão sem plano: sem limite');

-- Plano pago conta o mês do calendário: o que saiu no mês passado não conta.
insert into public.clients (id, salon_id, nome, telefone, consentimento_whatsapp_em, consentimento_origem) values
  ('a7500000-0000-0000-0000-000000000031', 'a7100000-0000-0000-0000-000000000003', 'Cliente P', '+5511987700031', now(), 'pagina_publica');
insert into public.message_log (salon_id, client_id, tipo, template, status, enviada_em, atualizada_em) values
  ('a7100000-0000-0000-0000-000000000003', 'a7500000-0000-0000-0000-000000000031', 'confirmacao', 'x', 'entregue', now() - interval '40 days', now() - interval '40 days'),
  ('a7100000-0000-0000-0000-000000000003', 'a7500000-0000-0000-0000-000000000031', 'confirmacao', 'x', 'lida', now(), now()),
  ('a7100000-0000-0000-0000-000000000003', 'a7500000-0000-0000-0000-000000000031', 'confirmacao', 'x', 'falhou', null, now());
select is(app.mensagens_usadas('a7100000-0000-0000-0000-000000000003'), 1,
  'conta só o que saiu neste mês (falha não conta)');

-- Teste com 2 mensagens: três agendamentos com opt-in.
insert into public.professionals (id, salon_id, nome) values
  ('a7300000-0000-0000-0000-000000000011', 'a7100000-0000-0000-0000-000000000001', 'Prof T'),
  ('a7300000-0000-0000-0000-000000000021', 'a7100000-0000-0000-0000-000000000002', 'Prof E');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('a7400000-0000-0000-0000-000000000011', 'a7100000-0000-0000-0000-000000000001', 'Corte T', 30, 50),
  ('a7400000-0000-0000-0000-000000000021', 'a7100000-0000-0000-0000-000000000002', 'Corte E', 30, 50);
insert into public.clients (id, salon_id, nome, telefone, consentimento_whatsapp_em, consentimento_origem) values
  ('a7500000-0000-0000-0000-000000000011', 'a7100000-0000-0000-0000-000000000001', 'Cliente T', '+5511987700011', now(), 'pagina_publica'),
  ('a7500000-0000-0000-0000-000000000021', 'a7100000-0000-0000-0000-000000000002', 'Cliente E', '+5511987700021', now(), 'pagina_publica');

insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco, created_at) values
  ('a7600000-0000-0000-0000-000000000011', 'a7100000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000011', 'a7400000-0000-0000-0000-000000000011', 'a7500000-0000-0000-0000-000000000011', now() + interval '10 hours', now() + interval '10.5 hours', 50, now() - interval '3 days'),
  ('a7600000-0000-0000-0000-000000000012', 'a7100000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000011', 'a7400000-0000-0000-0000-000000000011', 'a7500000-0000-0000-0000-000000000011', now() + interval '11 hours', now() + interval '11.5 hours', 50, now() - interval '3 days'),
  ('a7600000-0000-0000-0000-000000000013', 'a7100000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000011', 'a7400000-0000-0000-0000-000000000011', 'a7500000-0000-0000-0000-000000000011', now() + interval '12 hours', now() + interval '12.5 hours', 50, now() - interval '3 days');
select is((select count(*)::int from public.message_log where salon_id = 'a7100000-0000-0000-0000-000000000001' and tipo = 'confirmacao'),
  3, 'as três confirmações entram na fila (nenhuma saiu ainda)');

select app.enfileirar_lembretes();
select is((select count(*)::int from public.message_log where salon_id = 'a7100000-0000-0000-0000-000000000001' and tipo = 'lembrete'),
  0, 'teste grátis: lembrete não entra na fila');

select is((select count(*)::int from public.whatsapp_reservar(50) r
           join public.message_log m on m.id = r.mensagem_id
           where m.salon_id = 'a7100000-0000-0000-0000-000000000001'),
  2, 'no mesmo lote, o salão leva só o que cabe na franquia');
select is((select count(*)::int from public.message_log
           where salon_id = 'a7100000-0000-0000-0000-000000000001' and status = 'na_fila'),
  1, 'a que não coube continua na fila');
select is(app.mensagens_usadas('a7100000-0000-0000-0000-000000000001'), 2, 'as reservadas contam');

select is((select count(*)::int from public.whatsapp_reservar(50) r
           join public.message_log m on m.id = r.mensagem_id
           where m.salon_id = 'a7100000-0000-0000-0000-000000000001'),
  0, 'franquia esgotada: nada mais é reservado');
select is((select erro from public.message_log
           where salon_id = 'a7100000-0000-0000-0000-000000000001' and status = 'falhou'),
  'franquia_esgotada', 'e a que sobrou é descartada com o motivo');

insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco) values
  ('a7600000-0000-0000-0000-000000000014', 'a7100000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000011', 'a7400000-0000-0000-0000-000000000011', 'a7500000-0000-0000-0000-000000000011', now() + interval '13 hours', now() + interval '13.5 hours', 50);
select is((select count(*)::int from public.message_log where appointment_id = 'a7600000-0000-0000-0000-000000000014'),
  0, 'com a franquia esgotada, a confirmação nem entra na fila');

-- Teste encerrado: página pública fechada, painel continua.
select is(public.pagina_publica('salao-plano-e') -> 'aceita_agendamento', 'false'::jsonb,
  'teste encerrado: a página pública avisa que não aceita agendamento');
select is(public.pagina_publica('salao-plano-t') -> 'aceita_agendamento', 'true'::jsonb,
  'teste em dia: aceita');
select throws_ok(
  $$insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem) values
      ('a7100000-0000-0000-0000-000000000002', 'a7300000-0000-0000-0000-000000000021', 'a7400000-0000-0000-0000-000000000021', 'a7500000-0000-0000-0000-000000000021', now() + interval '1 day', now() + interval '1 day 30 minutes', 50, 'publico')$$,
  'P0001', 'agendamento_indisponivel', 'teste encerrado: agendamento pela página pública é recusado');
select lives_ok(
  $$insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem) values
      ('a7600000-0000-0000-0000-000000000021', 'a7100000-0000-0000-0000-000000000002', 'a7300000-0000-0000-0000-000000000021', 'a7400000-0000-0000-0000-000000000021', 'a7500000-0000-0000-0000-000000000021', now() + interval '1 day', now() + interval '1 day 30 minutes', 50, 'painel')$$,
  'teste encerrado: o painel continua agendando');
select is((select count(*)::int from public.message_log where appointment_id = 'a7600000-0000-0000-0000-000000000021'),
  0, 'teste encerrado: sem mensagens');

-- Painel: meu_plano só para o Dono(a); plano só o servidor altera.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq(
  $$select v ->> 'plano', (v ->> 'max_agendas')::int, (v ->> 'agendas')::int, (v ->> 'mensagens')::int
    from public.meu_plano('a7100000-0000-0000-0000-000000000003') v$$,
  $$values ('essencial'::text, 1, 1, 1)$$,
  'Dono(a) vê o plano, as agendas e as mensagens do mês');
select throws_ok(
  $$update public.subscriptions set plano = 'cortesia' where salon_id = 'a7100000-0000-0000-0000-000000000003'$$,
  '42501', null, 'Dono(a) não muda o próprio plano');
select set_config('request.jwt.claims', '{"sub":"a7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.meu_plano('a7100000-0000-0000-0000-000000000003')$$, '42501', null,
  'Recepção não vê o plano');
reset role;

select * from finish();
rollback;
