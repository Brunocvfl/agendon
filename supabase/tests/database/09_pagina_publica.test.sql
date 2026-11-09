-- Página pública: só o servidor (service_role) chama as funções; anon e authenticated não.
-- Salão P (ativo) e Q (suspenso). As datas são relativas a hoje (a página só mostra até hoje + 60).

begin;
select plan(25);

-- Dia de teste: daqui a 7 dias (no fuso do salão); expediente todos os dias das 09:00 às 18:00.
create function pg_temp.dia() returns date language sql stable as
  $$ select (now() at time zone 'America/Sao_Paulo')::date + 7 $$;
create function pg_temp.as_local(h text) returns timestamp language sql stable as
  $$ select pg_temp.dia() + h::time $$;

insert into public.salons (id, nome, slug, status) values
  ('9a000000-0000-0000-0000-000000000001', 'Salão P', 'salao-publico-p', 'ativo'),
  ('9b000000-0000-0000-0000-000000000001', 'Salão Q', 'salao-publico-q', 'suspenso');

insert into public.professionals (id, salon_id, nome, ativo) values
  ('91000000-0000-0000-0000-00000000000a', '9a000000-0000-0000-0000-000000000001', 'Ana P', true),
  ('91000000-0000-0000-0000-00000000000b', '9a000000-0000-0000-0000-000000000001', 'Bia P', true),
  ('91000000-0000-0000-0000-00000000000c', '9a000000-0000-0000-0000-000000000001', 'Sem Horário', true),
  ('91000000-0000-0000-0000-00000000000d', '9a000000-0000-0000-0000-000000000001', 'Inativa', false),
  ('91000000-0000-0000-0000-0000000000ff', '9b000000-0000-0000-0000-000000000001', 'Profissional Q', true);

insert into public.services (id, salon_id, nome, duracao_min, preco, ativo) values
  ('92000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', 'Corte P', 60, 80, true),
  ('92000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001', 'Serviço Desativado', 30, 40, false),
  ('92000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000001', 'Sem Profissional', 30, 40, true),
  ('92000000-0000-0000-0000-0000000000ff', '9b000000-0000-0000-0000-000000000001', 'Corte Q', 60, 80, true);

insert into public.professional_services (salon_id, professional_id, service_id, preco) values
  ('9a000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-00000000000a', '92000000-0000-0000-0000-000000000001', null),
  ('9a000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-00000000000b', '92000000-0000-0000-0000-000000000001', 95),
  ('9a000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-00000000000b', '92000000-0000-0000-0000-000000000002', null),
  ('9a000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-00000000000c', '92000000-0000-0000-0000-000000000003', null),
  ('9b000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-0000000000ff', '92000000-0000-0000-0000-0000000000ff', null);

insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim)
select p.salon_id, p.id, d, '09:00', '18:00'
from public.professionals p, generate_series(0, 6) d
where p.id in ('91000000-0000-0000-0000-00000000000a', '91000000-0000-0000-0000-00000000000b',
               '91000000-0000-0000-0000-00000000000d', '91000000-0000-0000-0000-0000000000ff');

-- Ana já tem um agendamento no dia (às 15h): "qualquer profissional" deve preferir a Bia.
insert into public.clients (id, salon_id, nome, telefone) values
  ('93000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', 'Cliente Antiga', '+5511900000001');
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco)
values ('9a000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-00000000000a',
        '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001',
        pg_temp.as_local('15:00') at time zone 'America/Sao_Paulo',
        pg_temp.as_local('16:00') at time zone 'America/Sao_Paulo', 80);

-- Permissões: anon e authenticated não chamam nada.
set local role anon;
select throws_ok($$select public.pagina_publica('salao-publico-p')$$, '42501', null, 'anon não lê a página');
select throws_ok(
  $$select public.horarios_publicos('salao-publico-p', '92000000-0000-0000-0000-000000000001', null, current_date)$$,
  '42501', null, 'anon não lê horários');
select throws_ok(
  $$select public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001', null,
    pg_temp.as_local('10:00'), 'Teste', '+5511900000099', false, 'x')$$,
  '42501', null, 'anon não agenda');
select throws_ok($$select count(*) from app.agendamentos_publicos_por_origem$$, '42501', null,
  'anon não lê o registro de origens');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$select public.pagina_publica('salao-publico-p')$$, '42501', null, 'authenticated não lê a página');
reset role;

set local role service_role;

-- Leitura da página
select is((public.pagina_publica('salao-publico-p') -> 'salao' ->> 'nome'), 'Salão P', 'página traz o salão');
select is(
  (select jsonb_agg(s ->> 'nome' order by s ->> 'nome') from jsonb_array_elements(public.pagina_publica('salao-publico-p') -> 'servicos') s),
  '["Corte P"]'::jsonb,
  'só serviços ativos com profissional que tem horário'
);
select is(
  (select jsonb_agg(p ->> 'nome' order by p ->> 'nome') from jsonb_array_elements(public.pagina_publica('salao-publico-p') -> 'profissionais') p),
  '["Ana P", "Bia P"]'::jsonb,
  'só profissionais ativos com horário (sem inativa e sem quem não tem horário)'
);
select is(
  (select s ->> 'preco' from jsonb_array_elements(public.pagina_publica('salao-publico-p') -> 'profissionais') p,
     jsonb_array_elements(p -> 'servicos') s where p ->> 'nome' = 'Bia P'),
  '95.00',
  'preço próprio do profissional'
);
select is(public.pagina_publica('salao-publico-q'), null, 'salão suspenso não tem página');
select is(public.pagina_publica('nao-existe'), null, 'slug inexistente devolve null');

-- Horários
select ok(
  (pg_temp.as_local('15:00') at time zone 'America/Sao_Paulo') not in (
    select * from public.horarios_publicos('salao-publico-p', '92000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-00000000000a', pg_temp.dia())),
  'horário ocupado da Ana não aparece para ela'
);
select ok(
  (pg_temp.as_local('15:00') at time zone 'America/Sao_Paulo') in (
    select * from public.horarios_publicos('salao-publico-p', '92000000-0000-0000-0000-000000000001', null, pg_temp.dia())),
  'com qualquer profissional, 15h aparece (a Bia está livre)'
);
select is(
  (select count(*)::int from public.horarios_publicos('salao-publico-p', '92000000-0000-0000-0000-000000000001', null, pg_temp.dia() + 54)),
  0,
  'depois de hoje + 60 não há horários'
);
select is(
  (select count(*)::int from public.horarios_publicos('salao-publico-q', '92000000-0000-0000-0000-0000000000ff', null, pg_temp.dia())),
  0,
  'salão suspenso não tem horários'
);

-- Agendar
select is(
  (select profissional from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001', null,
     pg_temp.as_local('10:00'), '  Carla   Nova ', '+5511900000002', true, 'origem-1')),
  'Bia P',
  'qualquer profissional escolhe quem tem menos agendamentos no dia'
);
select results_eq(
  $$select nome, consentimento_origem, (consentimento_whatsapp_em is not null) from public.clients
    where salon_id = '9a000000-0000-0000-0000-000000000001' and telefone = '+5511900000002'$$,
  $$values ('Carla Nova'::text, 'pagina_publica'::text, true)$$,
  'cliente novo com nome limpo e opt-in do WhatsApp'
);
select is(
  (select preco from public.appointments a join public.clients c on c.id = a.client_id
   where c.telefone = '+5511900000002' and a.origem = 'publico'),
  95.00,
  'agendamento com preço da profissional e origem pública'
);
select throws_ok(
  $$select * from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-00000000000a', pg_temp.as_local('15:30'), 'Outra', '+5511900000003', false, 'origem-1')$$,
  '23P01', 'horario_indisponivel',
  'horário ocupado responde 23P01'
);
select lives_ok(
  $$select * from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-00000000000a', pg_temp.as_local('11:00'), 'Nome Diferente', '+5511900000001', false, 'origem-2')$$,
  'WhatsApp já cadastrado agenda'
);
select is(
  (select nome from public.clients where id = '93000000-0000-0000-0000-000000000001'),
  'Cliente Antiga',
  'cliente existente não tem o nome trocado'
);
select throws_ok(
  $$select * from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-0000000000ff',
    null, pg_temp.as_local('12:00'), 'Intrusa', '+5511900000004', false, 'origem-3')$$,
  '22023', 'servico_nao_atendido',
  'serviço de outro salão é recusado'
);
select throws_ok(
  $$select * from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001',
    null, pg_temp.as_local('12:00'), 'Teste', '11900000004', false, 'origem-3')$$,
  '22023', 'telefone_invalido',
  'telefone fora do E.164 é recusado'
);

-- Limite por origem: 5 por hora.
reset role;
insert into app.agendamentos_publicos_por_origem (chave) select 'origem-cheia' from generate_series(1, 5);
set local role service_role;
select throws_ok(
  $$select * from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001',
    null, pg_temp.as_local('13:00'), 'Teste', '+5511900000005', false, 'origem-cheia')$$,
  'P0001', 'muitos_agendamentos',
  'origem com 5 agendamentos na última hora é barrada'
);

-- Limite por WhatsApp: 3 agendamentos futuros ativos no salão.
reset role;
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco)
select '9a000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-00000000000a',
       '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001',
       (pg_temp.as_local('09:00') + make_interval(days => d)) at time zone 'America/Sao_Paulo',
       (pg_temp.as_local('10:00') + make_interval(days => d)) at time zone 'America/Sao_Paulo', 80
from generate_series(1, 2) d;
set local role service_role;
select throws_ok(
  $$select * from public.agendar_publico('salao-publico-p', '92000000-0000-0000-0000-000000000001',
    null, pg_temp.as_local('16:00'), 'Cliente Antiga', '+5511900000001', false, 'origem-4')$$,
  'P0001', 'muitos_agendamentos',
  'WhatsApp com 3 agendamentos futuros ativos é barrado'
);

select * from finish();
rollback;
