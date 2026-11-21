-- Cobrança (AGE-14): situação da cobrança, efeitos, pagamentos do Mercado Pago e isolamento.

begin;
select plan(31);

insert into auth.users (id, email) values
  ('a8000000-0000-0000-0000-000000000001', 'dono.cobranca@teste.local'),
  ('a8000000-0000-0000-0000-000000000002', 'recepcao.cobranca@teste.local'),
  ('a8000000-0000-0000-0000-000000000003', 'dono.outro.cobranca@teste.local');

-- A: teste que vira pago; D: em dia; T: tolerância; L: leitura; F: página fechada; S: suspensa; O: outro salão.
insert into public.salons (id, nome, slug) values
  ('a8100000-0000-0000-0000-00000000000a', 'Salão A', 'salao-cobranca-a'),
  ('a8100000-0000-0000-0000-00000000000d', 'Salão D', 'salao-cobranca-d'),
  ('a8100000-0000-0000-0000-000000000001', 'Salão T', 'salao-cobranca-t'),
  ('a8100000-0000-0000-0000-000000000002', 'Salão L', 'salao-cobranca-l'),
  ('a8100000-0000-0000-0000-000000000003', 'Salão F', 'salao-cobranca-f'),
  ('a8100000-0000-0000-0000-000000000004', 'Salão S', 'salao-cobranca-s'),
  ('a8100000-0000-0000-0000-000000000005', 'Salão O', 'salao-cobranca-o');

insert into public.subscriptions (salon_id) values ('a8100000-0000-0000-0000-00000000000a');
insert into public.subscriptions (salon_id, plano, max_agendas, max_mensagens, teste_ate, ciclo, forma, pago_ate) values
  ('a8100000-0000-0000-0000-00000000000d', 'essencial', 1, 2, null, 'mensal', 'avulso', now() + interval '10 days'),
  ('a8100000-0000-0000-0000-000000000001', 'essencial', 1, 300, null, 'mensal', 'avulso', now() - interval '3 days'),
  ('a8100000-0000-0000-0000-000000000002', 'essencial', 1, 300, null, 'mensal', 'avulso', now() - interval '10 days'),
  ('a8100000-0000-0000-0000-000000000003', 'essencial', 1, 300, null, 'mensal', 'avulso', now() - interval '40 days'),
  ('a8100000-0000-0000-0000-000000000004', 'essencial', 1, 300, null, 'mensal', 'avulso', now() - interval '100 days'),
  ('a8100000-0000-0000-0000-000000000005', 'essencial', 1, 300, null, 'mensal', 'avulso', now() + interval '10 days');

insert into public.members (salon_id, user_id, perfil) values
  ('a8100000-0000-0000-0000-00000000000d', 'a8000000-0000-0000-0000-000000000001', 'dono'),
  ('a8100000-0000-0000-0000-00000000000d', 'a8000000-0000-0000-0000-000000000002', 'recepcao'),
  ('a8100000-0000-0000-0000-000000000005', 'a8000000-0000-0000-0000-000000000003', 'dono');

-- Catálogo.
select results_eq(
  $$select c.plano, l.max_agendas, l.max_mensagens
    from (values ('essencial'), ('salao'), ('salao_mais')) c (plano), app.limites_do_plano(c.plano) l$$,
  $$values ('essencial'::text, 1, 300), ('salao', 5, 1200), ('salao_mais', 15, 3000)$$,
  'limites de cada plano');
select is((select max_agendas from app.limites_do_plano('cortesia')), null, 'plano fora do catálogo não tem limites');

-- Situação (regra da AGE-13).
select results_eq(
  $$select app.situacao_cobranca(id) from (values
      ('a8100000-0000-0000-0000-00000000000a'::uuid), ('a8100000-0000-0000-0000-00000000000d'),
      ('a8100000-0000-0000-0000-000000000001'), ('a8100000-0000-0000-0000-000000000002'),
      ('a8100000-0000-0000-0000-000000000003'), ('a8100000-0000-0000-0000-000000000004')) v (id)$$,
  $$values ('em_dia'::text), ('em_dia'), ('tolerancia'), ('leitura'), ('pagina_fechada'), ('suspensa')$$,
  'em dia, tolerância (até 7 dias), leitura (8–30), página fechada (31–89) e suspensa (90+)');

-- Efeitos: mensagens e página pública.
select is(app.mensagens_permitidas('a8100000-0000-0000-0000-000000000001', 'lembrete'), 300, 'tolerância: mensagens seguem');
select is(app.mensagens_permitidas('a8100000-0000-0000-0000-000000000002', 'confirmacao'), 0, 'leitura: sem mensagens');
select is(app.mensagens_permitidas('a8100000-0000-0000-0000-000000000004', 'confirmacao'), 0, 'suspensa: sem mensagens');
select ok(app.aceita_agendamento_publico('a8100000-0000-0000-0000-000000000002'), 'leitura: a página pública continua');
select ok(not app.aceita_agendamento_publico('a8100000-0000-0000-0000-000000000003'), 'a partir do 31º dia a página fecha');
select is(public.pagina_publica('salao-cobranca-s') -> 'aceita_agendamento', 'false'::jsonb, 'suspensa: página fechada');

insert into public.professionals (id, salon_id, nome) values
  ('a8300000-0000-0000-0000-000000000003', 'a8100000-0000-0000-0000-000000000003', 'Prof F');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('a8400000-0000-0000-0000-000000000003', 'a8100000-0000-0000-0000-000000000003', 'Corte F', 30, 50);
insert into public.clients (id, salon_id, nome, telefone) values
  ('a8500000-0000-0000-0000-000000000003', 'a8100000-0000-0000-0000-000000000003', 'Cliente F', '+5511987600003');
select throws_ok(
  $$insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem) values
      ('a8100000-0000-0000-0000-000000000003', 'a8300000-0000-0000-0000-000000000003', 'a8400000-0000-0000-0000-000000000003', 'a8500000-0000-0000-0000-000000000003', now() + interval '1 day', now() + interval '1 day 30 minutes', 50, 'publico')$$,
  'P0001', 'agendamento_indisponivel', 'página fechada: agendamento público recusado');

-- Pagamento avulso: pendente, depois aprovado (uma vez só), e o pacote extra.
select is(public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-00000000000a', 'mp-1', 'avulso', 'salao', 'mensal', 89.90, 'pending'),
  false, 'pagamento pendente não aplica nada');
select is((select plano from public.subscriptions where salon_id = 'a8100000-0000-0000-0000-00000000000a'), 'teste',
  'continua no teste enquanto pendente');
select is(public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-00000000000a', 'mp-1', 'avulso', 'salao', 'mensal', 89.90, 'approved'),
  true, 'aprovado: aplica');
select results_eq(
  $$select plano, max_agendas, max_mensagens, teste_ate is null, ciclo, forma, pago_ate = now() + interval '1 month'
    from public.subscriptions where salon_id = 'a8100000-0000-0000-0000-00000000000a'$$,
  $$values ('salao'::text, 5, 1200, true, 'mensal'::text, 'avulso'::text, true)$$,
  'sai do teste: plano, limites, ciclo, forma e pago até daqui a um mês');
select is(public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-00000000000a', 'mp-1', 'avulso', 'salao', 'mensal', 89.90, 'approved'),
  false, 'o mesmo aviso de novo não aplica outra vez');
select is((select count(*)::int from public.pagamentos where mp_id = 'mp-1'), 1, 'um registro por pagamento do MP');
select is((select count(*)::int from public.audit_log where salon_id = 'a8100000-0000-0000-0000-00000000000a' and acao = 'pagamento_aprovado'),
  1, 'aprovação vai para a auditoria uma vez');

select public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-00000000000a', 'mp-2', 'avulso', 'salao', 'anual', 863.04, 'approved');
select ok((select pago_ate = now() + interval '1 month' + interval '12 months' from public.subscriptions where salon_id = 'a8100000-0000-0000-0000-00000000000a'),
  'anual em dia estende a partir do pago até atual');

select public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-000000000003', 'mp-3', 'avulso', 'essencial', 'mensal', 39.90, 'approved');
select ok((select pago_ate = now() + interval '1 month' from public.subscriptions where salon_id = 'a8100000-0000-0000-0000-000000000003'),
  'atrasado: o novo período conta a partir de hoje');
select is(app.situacao_cobranca('a8100000-0000-0000-0000-000000000003'), 'em_dia', 'pagou: volta na hora');

select is(app.mensagens_permitidas('a8100000-0000-0000-0000-00000000000d', 'lembrete'), 2, 'franquia do mês sem pacote');
select is(public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-00000000000d', 'mp-4', 'pacote', null, null, 14.90, 'approved'),
  true, 'pacote aprovado');
select results_eq(
  $$select app.mensagens_permitidas('a8100000-0000-0000-0000-00000000000d', 'lembrete'),
           app.mensagens_permitidas('a8100000-0000-0000-0000-00000000000d', 'confirmacao')$$,
  $$values (202, 202)$$, 'o pacote soma 200 mensagens no mês');
select is((select plano from public.subscriptions where salon_id = 'a8100000-0000-0000-0000-00000000000d'), 'essencial',
  'pacote não mexe no plano');

select throws_ok(
  $$select public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-000000000005', 'mp-4', 'pacote', null, null, 14.90, 'approved')$$,
  '22023', 'pagamento_de_outro_salao', 'o mesmo pagamento não vale para outro salão');
select throws_ok(
  $$select public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-000000000005', 'mp-5', 'avulso', 'cortesia', 'mensal', 0, 'approved')$$,
  '23514', null, 'plano fora do catálogo é recusado');

-- Acesso.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.pagamentos), 1, 'Dono(a) vê só os pagamentos do próprio salão');
select is(public.meu_plano('a8100000-0000-0000-0000-00000000000d') ->> 'situacao', 'em_dia', 'meu_plano devolve a situação');
select throws_ok(
  $$select public.cobranca_registrar_pagamento('a8100000-0000-0000-0000-00000000000d', 'mp-9', 'pacote', null, null, 14.90, 'approved')$$,
  '42501', null, 'painel não registra pagamento');
select throws_ok(
  $$insert into public.pagamentos (salon_id, mp_id, tipo, valor, status) values ('a8100000-0000-0000-0000-00000000000d', 'mp-9', 'pacote', 0, 'approved')$$,
  '42501', null, 'painel não grava em pagamentos');
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.pagamentos), 0, 'Recepção não vê pagamentos');
reset role;

select * from finish();
rollback;
