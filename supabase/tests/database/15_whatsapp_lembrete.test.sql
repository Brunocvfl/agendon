-- WhatsApp: lembrete antes do horário (salons.lembrete_horas, app.enfileirar_lembretes, job do pg_cron).
-- Datas relativas a now() (constante na transação), porque a janela é contada a partir de agora.

begin;
select plan(24);

insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'dono.l@teste.local'),
  ('f0000000-0000-0000-0000-000000000002', 'recepcao.l@teste.local');

-- L: padrão (24 h); M: lembrete desligado; N: 2 h.
insert into public.salons (id, nome, slug, status) values
  ('f1000000-0000-0000-0000-000000000001', 'Salão L', 'salao-lembrete-l', 'ativo'),
  ('f1000000-0000-0000-0000-000000000002', 'Salão M', 'salao-lembrete-m', 'ativo'),
  ('f1000000-0000-0000-0000-000000000003', 'Salão N', 'salao-lembrete-n', 'ativo');
update public.salons set lembrete_horas = null where id = 'f1000000-0000-0000-0000-000000000002';
update public.salons set lembrete_horas = 2 where id = 'f1000000-0000-0000-0000-000000000003';

insert into public.members (salon_id, user_id, perfil) values
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'dono'),
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'recepcao');

insert into public.professionals (id, salon_id, nome) values
  ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Prof L'),
  ('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'Prof M'),
  ('f3000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 'Prof N');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('f4000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Corte L', 30, 50),
  ('f4000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'Corte M', 30, 50),
  ('f4000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 'Corte N', 30, 50);

-- Clientes: L1, M1 e N1 com opt-in; L2 sem opt-in; L3 respondeu SAIR.
insert into public.clients (id, salon_id, nome, telefone, consentimento_whatsapp_em, consentimento_origem, optout_em) values
  ('f5000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Cliente L1', '+5511987900001', now() - interval '10 days', 'pagina_publica', null),
  ('f5000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Cliente L2', '+5511987900002', null, null, null),
  ('f5000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'Cliente L3', '+5511987900003', now() - interval '10 days', 'pagina_publica', now() - interval '1 day'),
  ('f5000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000002', 'Cliente M1', '+5511987900004', now() - interval '10 days', 'pagina_publica', null),
  ('f5000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000003', 'Cliente N1', '+5511987900005', now() - interval '10 days', 'pagina_publica', null);

-- Agendamentos (um profissional por salão, horários sem sobreposição). "antigo" = criado 3 dias antes.
insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco, status, created_at) values
  -- L, 24 h: dentro da janela, criado antes dela -> lembrete
  ('f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', now() + interval '10 hours', now() + interval '10.5 hours', 50, 'agendado', now() - interval '3 days'),
  -- L: ainda fora da janela (30 h)
  ('f6000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', now() + interval '30 hours', now() + interval '30.5 hours', 50, 'agendado', now() - interval '3 days'),
  -- L: criado já dentro da janela (1 h atrás, começa em 11 h)
  ('f6000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', now() + interval '11 hours', now() + interval '11.5 hours', 50, 'agendado', now() - interval '1 hour'),
  -- L: cancelado
  ('f6000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', now() + interval '12 hours', now() + interval '12.5 hours', 50, 'cancelado', now() - interval '3 days'),
  -- L: cliente sem opt-in
  ('f6000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000002', now() + interval '13 hours', now() + interval '13.5 hours', 50, 'agendado', now() - interval '3 days'),
  -- L: cliente que respondeu SAIR
  ('f6000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000003', now() + interval '14 hours', now() + interval '14.5 hours', 50, 'agendado', now() - interval '3 days'),
  -- L: confirmado também recebe
  ('f6000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', now() + interval '15 hours', now() + interval '15.5 hours', 50, 'confirmado', now() - interval '3 days'),
  -- L: já começou
  ('f6000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', now() - interval '10 minutes', now() + interval '20 minutes', 50, 'agendado', now() - interval '3 days'),
  -- M (desligado): nada
  ('f6000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000002', 'f4000000-0000-0000-0000-000000000002', 'f5000000-0000-0000-0000-000000000004', now() + interval '1 hour', now() + interval '1.5 hours', 50, 'agendado', now() - interval '3 days'),
  -- N, 2 h: dentro (1 h) e fora (3 h)
  ('f6000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000003', 'f4000000-0000-0000-0000-000000000003', 'f5000000-0000-0000-0000-000000000005', now() + interval '1 hour', now() + interval '1.5 hours', 50, 'agendado', now() - interval '3 days'),
  ('f6000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000003', 'f4000000-0000-0000-0000-000000000003', 'f5000000-0000-0000-0000-000000000005', now() + interval '3 hours', now() + interval '3.5 hours', 50, 'agendado', now() - interval '3 days');

-- Enfileirar.
select app.enfileirar_lembretes();

select results_eq(
  $$select appointment_id from public.message_log
    where tipo = 'lembrete' and salon_id in ('f1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000003')
    order by appointment_id$$,
  $$values ('f6000000-0000-0000-0000-000000000001'::uuid), ('f6000000-0000-0000-0000-000000000007'::uuid), ('f6000000-0000-0000-0000-000000000010'::uuid)$$,
  'só entram os agendamentos dentro da janela, criados antes dela, ativos e com opt-in');
select results_eq(
  $$select status, template, client_id, tentativas from public.message_log
    where tipo = 'lembrete' and appointment_id = 'f6000000-0000-0000-0000-000000000001'$$,
  $$values ('na_fila'::text, 'lembrete_agendamento'::text, 'f5000000-0000-0000-0000-000000000001'::uuid, 0)$$,
  'lembrete na fila com o template e o cliente (sem telefone nem nome)');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000002' and tipo = 'lembrete'),
  0, 'fora da janela: ainda não');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000003' and tipo = 'lembrete'),
  0, 'criado já dentro da janela: só a confirmação');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000004' and tipo = 'lembrete'),
  0, 'cancelado: sem lembrete');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000005' and tipo = 'lembrete'),
  0, 'sem opt-in: sem lembrete');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000006' and tipo = 'lembrete'),
  0, 'respondeu SAIR: sem lembrete');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000008' and tipo = 'lembrete'),
  0, 'já começou: sem lembrete');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000009' and tipo = 'lembrete'),
  0, 'salão com lembrete desligado: sem lembrete');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000011' and tipo = 'lembrete'),
  0, 'salão de 2 h: agendamento daqui a 3 h ainda não');

-- Rodar de novo não duplica.
select is(app.enfileirar_lembretes(), 0, 'segunda passada não enfileira nada');
select is((select count(*)::int from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000001' and tipo = 'lembrete'),
  1, 'um lembrete por agendamento');

-- Reservar: entrega o lembrete; descarta o de quem desligou o lembrete depois de enfileirar.
delete from public.message_log where tipo <> 'lembrete' or salon_id not in
  ('f1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003');
update public.salons set lembrete_horas = null where id = 'f1000000-0000-0000-0000-000000000001';
set local role service_role;
select results_eq(
  $$select tipo, template, telefone, cliente_nome, salao, servico, profissional from public.whatsapp_reservar(50)$$,
  $$values ('lembrete'::text, 'lembrete_agendamento'::text, '+5511987900005'::text, 'Cliente N1'::text, 'Salão N'::text, 'Corte N'::text, 'Prof N'::text)$$,
  'reservar devolve o lembrete com os dados do envio');
reset role;
select is(
  (select count(*)::int from public.message_log
   where salon_id = 'f1000000-0000-0000-0000-000000000001' and status = 'falhou' and erro = 'cancelada_antes_do_envio'),
  2, 'lembrete de salão que desligou o lembrete não é enviado');

-- Lembrete de horário que já passou também é descartado.
update public.salons set lembrete_horas = 24 where id = 'f1000000-0000-0000-0000-000000000001';
insert into public.message_log (salon_id, appointment_id, client_id, tipo, template) values
  ('f1000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000008', 'f5000000-0000-0000-0000-000000000001', 'lembrete', 'lembrete_agendamento');
set local role service_role;
select is((select count(*)::int from public.whatsapp_reservar(50)), 0, 'nada a enviar: o horário já começou');
reset role;
select results_eq(
  $$select status, erro from public.message_log where appointment_id = 'f6000000-0000-0000-0000-000000000008' and tipo = 'lembrete'$$,
  $$values ('falhou'::text, 'cancelada_antes_do_envio'::text)$$,
  'lembrete vencido vira falha sem envio');

-- Permissões da coluna: Dono(a) escolhe a antecedência; valores fora da lista são recusados.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$update public.salons set lembrete_horas = 4 where id = 'f1000000-0000-0000-0000-000000000001'$$,
  'Dono(a) muda a antecedência');
select throws_ok(
  $$update public.salons set lembrete_horas = 5 where id = 'f1000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'antecedência fora da lista é recusada');
select lives_ok(
  $$update public.salons set lembrete_horas = null where id = 'f1000000-0000-0000-0000-000000000001'$$,
  'Dono(a) desliga o lembrete');
select throws_ok(
  $$select app.enfileirar_lembretes()$$, '42501', null, 'usuário logado não roda o enfileiramento');
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
update public.salons set lembrete_horas = 48 where id = 'f1000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select lembrete_horas from public.salons where id = 'f1000000-0000-0000-0000-000000000001'),
  null::smallint, 'Recepção não muda a antecedência');

-- Job: agendado a cada 15 min; sem URL/segredo no Vault, só enfileira (não chama a rota).
select is(
  (select schedule from cron.job where jobname = 'whatsapp-lembretes-e-fila'),
  '*/15 * * * *', 'job do lembrete a cada 15 minutos');
select is(
  (select count(*)::int from vault.decrypted_secrets where name in ('whatsapp_processar_url', 'whatsapp_processar_segredo')),
  0, 'local: sem URL nem segredo no Vault');
select lives_ok($$select app.whatsapp_tique()$$, 'o job roda sem a rota configurada');

select * from finish();
rollback;
