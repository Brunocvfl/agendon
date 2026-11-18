-- Agendar para outra pessoa e nome digitado guardado no agendamento (appointments.atendido_nome):
-- agendar_publico, leitura em agenda()/agendamento(), exportação e anonimização.

begin;
select plan(18);

create function pg_temp.dia() returns date language sql stable as
  $$ select (now() at time zone 'America/Sao_Paulo')::date + 7 $$;
create function pg_temp.as_local(h text) returns timestamp language sql stable as
  $$ select pg_temp.dia() + h::time $$;
create function pg_temp.atendido(h text) returns text language sql stable as $$
  select a.atendido_nome from public.appointments a
  where a.salon_id = 'e1000000-0000-0000-0000-000000000001'
    and a.inicio = pg_temp.as_local(h) at time zone 'America/Sao_Paulo'
$$;

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'dono.op@teste.local'),
  ('e0000000-0000-0000-0000-000000000002', 'prof.op@teste.local');

insert into public.salons (id, nome, slug, status) values
  ('e1000000-0000-0000-0000-000000000001', 'Salão OP', 'salao-outra-pessoa', 'ativo');

insert into public.members (id, salon_id, user_id, perfil) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'dono'),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'profissional');

insert into public.professionals (id, salon_id, member_id, nome) values
  ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'Prof OP');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Corte OP', 60, 70);

insert into public.professional_services (salon_id, professional_id, service_id) values
  ('e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001');

insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim)
select 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', d, '09:00', '18:00'
from generate_series(0, 6) d;

-- Página pública (service_role)
set local role service_role;

-- Sem p_atendido (chamada antiga, 8 argumentos): o nome digitado vai para o agendamento.
select public.agendar_publico('salao-outra-pessoa', 'e4000000-0000-0000-0000-000000000001', null,
  pg_temp.as_local('10:00'), 'Carla Nova', '+5511977700001', false, 'origem-op-1');
select is(pg_temp.atendido('10:00'), 'Carla Nova', 'sem outra pessoa: guarda o nome digitado');

-- Mesmo WhatsApp com outro nome: o cliente não troca de nome, o agendamento guarda o digitado.
select public.agendar_publico('salao-outra-pessoa', 'e4000000-0000-0000-0000-000000000001', null,
  pg_temp.as_local('11:00'), 'Carlinha', '+5511977700001', false, 'origem-op-2');
select is(pg_temp.atendido('11:00'), 'Carlinha', 'mesmo WhatsApp: guarda o nome digitado agora');
select is((select c.nome from public.clients c where c.telefone = '+5511977700001'), 'Carla Nova',
  'mesmo WhatsApp: o cliente mantém o nome do cadastro');

-- Para outra pessoa: o cliente continua sendo o dono do WhatsApp.
select public.agendar_publico('salao-outra-pessoa', 'e4000000-0000-0000-0000-000000000001', null,
  pg_temp.as_local('12:00'), 'Carla Nova', '+5511977700001', false, 'origem-op-3', '  Júlia   Filha ');
select is(pg_temp.atendido('12:00'), 'Júlia Filha', 'outra pessoa: guarda o nome dela, sem espaços sobrando');
select is(
  (select count(distinct a.client_id)::int from public.appointments a where a.salon_id = 'e1000000-0000-0000-0000-000000000001'),
  1, 'outra pessoa: o agendamento fica no cliente dono do WhatsApp');

-- Nome da outra pessoa em branco = sem outra pessoa; curto demais = erro.
select public.agendar_publico('salao-outra-pessoa', 'e4000000-0000-0000-0000-000000000001', null,
  pg_temp.as_local('13:00'), 'Dora Sozinha', '+5511977700002', false, 'origem-op-4', '   ');
select is(pg_temp.atendido('13:00'), 'Dora Sozinha', 'outra pessoa em branco: vale o nome de quem agenda');
select throws_ok(
  $$select public.agendar_publico('salao-outra-pessoa', 'e4000000-0000-0000-0000-000000000001', null,
    pg_temp.as_local('14:00'), 'Dora Sozinha', '+5511977700002', false, 'origem-op-5', 'J')$$,
  '22023', 'atendido_invalido', 'outra pessoa com nome curto: atendido_invalido');
reset role;

select throws_ok(
  $$update public.appointments set atendido_nome = repeat('x', 81)
    where salon_id = 'e1000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'o banco limita o nome de quem é atendido');

-- Painel: Dono(a)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is(
  (select a.atendido from public.agenda('e1000000-0000-0000-0000-000000000001', pg_temp.dia(), pg_temp.dia()) a
   where a.inicio = pg_temp.as_local('12:00') at time zone 'America/Sao_Paulo'),
  'Júlia Filha', 'agenda() devolve quem será atendido');
select is(
  (select a.cliente_nome from public.agenda('e1000000-0000-0000-0000-000000000001', pg_temp.dia(), pg_temp.dia()) a
   where a.inicio = pg_temp.as_local('12:00') at time zone 'America/Sao_Paulo'),
  'Carla Nova', 'agenda() continua devolvendo o cliente (quem agendou)');
select is(
  (select g.atendido from public.appointments a, public.agendamento(a.id) g
   where a.inicio = pg_temp.as_local('12:00') at time zone 'America/Sao_Paulo'
     and a.salon_id = 'e1000000-0000-0000-0000-000000000001'),
  'Júlia Filha', 'agendamento() devolve quem será atendido');

select is(
  (select jsonb_agg(x ->> 'atendido' order by x ->> 'inicio')
   from jsonb_array_elements(public.exportar_cliente(
     (select c.id from public.clients c where c.telefone = '+5511977700001')) -> 'agendamentos') x),
  '["Carla Nova", "Carlinha", "Júlia Filha"]'::jsonb, 'a exportação inclui quem foi atendido');

-- Painel: Profissional vê o nome de quem será atendido, nunca o telefone.
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(
  (select a.atendido from public.agenda('e1000000-0000-0000-0000-000000000001', pg_temp.dia(), pg_temp.dia()) a
   where a.inicio = pg_temp.as_local('12:00') at time zone 'America/Sao_Paulo'),
  'Júlia Filha', 'Profissional vê quem será atendido');
select is(
  (select a.cliente_telefone from public.agenda('e1000000-0000-0000-0000-000000000001', pg_temp.dia(), pg_temp.dia()) a
   where a.inicio = pg_temp.as_local('12:00') at time zone 'America/Sao_Paulo'),
  null, 'Profissional continua sem o telefone');

-- Anonimizar apaga o nome de quem foi atendido.
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  public.anonimizar_cliente((select c.id from public.clients c where c.telefone = '+5511977700001')),
  3, 'anonimizar cancela os 3 agendamentos futuros');
select is(
  (select a.atendido from public.agenda('e1000000-0000-0000-0000-000000000001', pg_temp.dia(), pg_temp.dia()) a
   where a.inicio = pg_temp.as_local('12:00') at time zone 'America/Sao_Paulo'),
  null, 'depois de anonimizar, agenda() não devolve o nome');
reset role;

select is(
  (select count(*)::int from public.appointments a
   join public.clients c on c.id = a.client_id
   where c.anonimizado_em is not null and a.atendido_nome is not null
     and a.salon_id = 'e1000000-0000-0000-0000-000000000001'),
  0, 'anonimizar apaga atendido_nome de todos os agendamentos do cliente');
select is(pg_temp.atendido('13:00'), 'Dora Sozinha', 'os agendamentos de outros clientes ficam como estão');

select * from finish();
rollback;
