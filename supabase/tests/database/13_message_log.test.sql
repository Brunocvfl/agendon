-- message_log: agendamento só do mesmo salão (FK composta) e escrita só pelo servidor.

begin;
select plan(4);

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'dono.p@teste.local');

insert into public.salons (id, nome, slug) values
  ('d1000000-0000-0000-0000-000000000001', 'Salão P', 'salao-msg-p'),
  ('d1000000-0000-0000-0000-000000000002', 'Salão Q', 'salao-msg-q');

insert into public.members (id, salon_id, user_id, perfil) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'dono');

insert into public.professionals (id, salon_id, nome) values
  ('d3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Prof P');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('d4000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Corte P', 60, 90);
insert into public.clients (id, salon_id, nome, telefone) values
  ('d5000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Cliente P', '+5511987700001');
insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco) values
  ('d6000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001',
   'd4000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', '2030-03-05 12:00Z', '2030-03-05 13:00Z', 90);

select lives_ok(
  $$insert into public.message_log (salon_id, appointment_id, tipo)
    values ('d1000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001', 'confirmacao')$$,
  'mensagem com agendamento do mesmo salão'
);
select throws_ok(
  $$insert into public.message_log (salon_id, appointment_id, tipo)
    values ('d1000000-0000-0000-0000-000000000002', 'd6000000-0000-0000-0000-000000000001', 'lembrete_1d')$$,
  '23503', null,
  'mensagem do salão Q não aponta para agendamento do salão P'
);
select lives_ok(
  $$insert into public.message_log (salon_id, appointment_id, tipo)
    values ('d1000000-0000-0000-0000-000000000002', null, 'teste')$$,
  'mensagem sem agendamento continua possível'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.message_log (salon_id, appointment_id, tipo)
    values ('d1000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001', 'confirmacao')$$,
  '42501', null,
  'usuário logado não grava no message_log (só o servidor)'
);

select * from finish();
rollback;
