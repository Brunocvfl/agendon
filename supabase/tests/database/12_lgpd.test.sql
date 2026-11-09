-- LGPD: exportar e anonimizar cliente (só Dono(a)), campos protegidos no painel,
-- isolamento entre salões e a retenção (app.anonimizar_inativos + pg_cron).

begin;
select plan(26);

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-000000000001', 'dono.l@teste.local'),
  ('c0000000-0000-0000-0000-000000000002', 'recepcao.l@teste.local'),
  ('c0000000-0000-0000-0000-000000000003', 'prof.l@teste.local'),
  ('c0000000-0000-0000-0000-000000000004', 'dono.m@teste.local');

insert into public.salons (id, nome, slug) values
  ('c1000000-0000-0000-0000-000000000001', 'Salão L', 'salao-lgpd-l'),
  ('c1000000-0000-0000-0000-000000000002', 'Salão M', 'salao-lgpd-m');

insert into public.members (id, salon_id, user_id, perfil) values
  ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'dono'),
  ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'recepcao'),
  ('c2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'profissional'),
  ('c2000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'dono');

insert into public.professionals (id, salon_id, member_id, nome) values
  ('c3000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000003', 'Prof L');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('c4000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Corte L', 60, 90);

-- Marina: com histórico e agendamentos futuros. As outras servem à retenção.
insert into public.clients (id, salon_id, nome, telefone, observacoes, consentimento_whatsapp_em, consentimento_origem, created_at) values
  ('c5000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Marina Lima', '+5511987600001', 'Alergia a amônia', now() - interval '40 days', 'pagina_publica', now() - interval '40 days'),
  ('c5000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Velha Inativa', '+5511987600002', null, null, null, now() - interval '30 months'),
  ('c5000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Velha Recente', '+5511987600003', null, null, null, now() - interval '30 months'),
  ('c5000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'Velha Futuro', '+5511987600004', null, null, null, now() - interval '30 months'),
  ('c5000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'Nova Sem Visita', '+5511987600005', null, null, null, now());

insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco, status) values
  -- Marina: passado concluído, futuro agendado e futuro confirmado
  ('c6000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   'c5000000-0000-0000-0000-000000000001', date_trunc('hour', now()) - interval '30 days', date_trunc('hour', now()) - interval '30 days' + interval '1 hour', 90, 'concluido'),
  ('c6000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   'c5000000-0000-0000-0000-000000000001', date_trunc('hour', now()) + interval '7 days', date_trunc('hour', now()) + interval '7 days 1 hour', 90, 'agendado'),
  ('c6000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   'c5000000-0000-0000-0000-000000000001', date_trunc('hour', now()) + interval '8 days', date_trunc('hour', now()) + interval '8 days 1 hour', 90, 'confirmado'),
  -- Retenção
  ('c6000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   'c5000000-0000-0000-0000-000000000002', date_trunc('hour', now()) - interval '25 months', date_trunc('hour', now()) - interval '25 months' + interval '1 hour', 90, 'concluido'),
  ('c6000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   'c5000000-0000-0000-0000-000000000003', date_trunc('hour', now()) - interval '2 months', date_trunc('hour', now()) - interval '2 months' + interval '1 hour', 90, 'concluido'),
  ('c6000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001',
   'c5000000-0000-0000-0000-000000000004', date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 1 hour', 90, 'agendado');

set local role authenticated;

-- Recepção: edita cadastro, mas não exporta, não anonimiza nem mexe nos campos protegidos
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.exportar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'Recepção não exporta cliente'
);
select throws_ok(
  $$select public.anonimizar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'Recepção não anonimiza cliente'
);
select lives_ok(
  $$update public.clients set observacoes = 'Prefere manhã' where id = 'c5000000-0000-0000-0000-000000000005'$$,
  'Recepção continua editando o cadastro'
);
select throws_ok(
  $$update public.clients set anonimizado_em = now(), telefone = null where id = 'c5000000-0000-0000-0000-000000000005'$$,
  '42501', null, 'painel não marca anonimizado direto (só pela função)'
);
select throws_ok(
  $$update public.clients set consentimento_whatsapp_em = now() where id = 'c5000000-0000-0000-0000-000000000005'$$,
  '42501', null, 'painel não grava consentimento do WhatsApp'
);
select throws_ok(
  $$insert into public.clients (salon_id, nome, telefone, consentimento_origem)
    values ('c1000000-0000-0000-0000-000000000001', 'Com Consentimento', '+5511987600009', 'painel')$$,
  '42501', null, 'cadastro pelo painel não traz consentimento'
);

-- Profissional
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.exportar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'Profissional não exporta cliente'
);

-- Dono(a) de outro salão
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select public.exportar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'Dono(a) do salão M não exporta cliente do salão L'
);
select throws_ok(
  $$select public.anonimizar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'Dono(a) do salão M não anonimiza cliente do salão L'
);

-- Dono(a) do salão L: exporta
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  public.exportar_cliente('c5000000-0000-0000-0000-000000000001') #>> '{cliente,whatsapp}',
  '+5511987600001',
  'exportação traz o WhatsApp do cliente'
);
select is(
  public.exportar_cliente('c5000000-0000-0000-0000-000000000001') #>> '{cliente,consentimento_origem}',
  'pagina_publica',
  'exportação traz a origem do consentimento'
);
select is(
  jsonb_array_length(public.exportar_cliente('c5000000-0000-0000-0000-000000000001') -> 'agendamentos'),
  3,
  'exportação traz o histórico de agendamentos'
);
select is(
  public.exportar_cliente('c5000000-0000-0000-0000-000000000001') #>> '{controlador,nome}',
  'Salão L',
  'exportação identifica o salão como controlador'
);
select ok(
  exists (select 1 from public.audit_log where acao = 'exportar' and registro_id = 'c5000000-0000-0000-0000-000000000001'
          and user_id = 'c0000000-0000-0000-0000-000000000001'),
  'exportação fica registrada na auditoria'
);

-- Dono(a) do salão L: anonimiza
select is(
  public.anonimizar_cliente('c5000000-0000-0000-0000-000000000001'),
  2,
  'anonimizar cancela os 2 agendamentos futuros e diz quantos'
);
select results_eq(
  $$select nome, telefone, observacoes, consentimento_whatsapp_em, consentimento_origem, anonimizado_em is not null
    from public.clients where id = 'c5000000-0000-0000-0000-000000000001'$$,
  $$values ('Cliente anonimizado'::text, null::text, null::text, null::timestamptz, null::text, true)$$,
  'dados pessoais apagados e cliente marcado como anonimizado'
);
select results_eq(
  $$select status::text from public.appointments where client_id = 'c5000000-0000-0000-0000-000000000001' order by inicio$$,
  $$values ('concluido'::text), ('cancelado'), ('cancelado')$$,
  'passado continua (sem identificação); futuros cancelados'
);
select ok(
  exists (select 1 from public.audit_log where acao = 'anonimizar' and registro_id = 'c5000000-0000-0000-0000-000000000001'),
  'anonimização fica registrada na auditoria'
);
select throws_ok(
  $$select public.anonimizar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  'P0002', null, 'anonimizar de novo: cliente não encontrado'
);
select throws_ok(
  $$select public.exportar_cliente('c5000000-0000-0000-0000-000000000001')$$,
  'P0002', null, 'cliente anonimizado não é exportado'
);
select throws_ok(
  $$select app.anonimizar_inativos(24)$$,
  '42501', null, 'usuário logado não roda a retenção'
);

-- anon
reset role;
set local role anon;
select throws_ok(
  $$select public.exportar_cliente('c5000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'anon não exporta'
);

-- Retenção (roda como o dono do banco, como o pg_cron)
reset role;
select ok(app.anonimizar_inativos(24) >= 1, 'retenção anonimiza ao menos um cliente');
select results_eq(
  $$select nome, anonimizado_em is not null from public.clients
    where id in ('c5000000-0000-0000-0000-000000000002', 'c5000000-0000-0000-0000-000000000003',
                 'c5000000-0000-0000-0000-000000000004', 'c5000000-0000-0000-0000-000000000005')
    order by id$$,
  $$values ('Cliente anonimizado'::text, true), ('Velha Recente', false), ('Velha Futuro', false), ('Nova Sem Visita', false)$$,
  'retenção: só quem está há mais de 24 meses sem agendamento (nem futuro)'
);
select ok(
  exists (select 1 from public.audit_log where acao = 'anonimizar_retencao' and registro_id = 'c5000000-0000-0000-0000-000000000002' and user_id is null),
  'retenção fica registrada na auditoria'
);
select is(
  (select schedule from cron.job where jobname = 'lgpd-retencao-clientes'),
  '0 6 * * *',
  'retenção agendada todo dia no pg_cron'
);

select * from finish();
rollback;
