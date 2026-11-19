-- Notificações da equipe: agendamento novo pela página pública avisa Dono(a), Recepção e o
-- Profissional da agenda; ninguém vê aviso de outro salão nem da agenda de outro profissional.

begin;
select plan(35);

insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'dono.n@teste.local'),
  ('f0000000-0000-0000-0000-000000000002', 'recepcao.n@teste.local'),
  ('f0000000-0000-0000-0000-000000000003', 'prof.a.n@teste.local'),
  ('f0000000-0000-0000-0000-000000000004', 'prof.b.n@teste.local'),
  ('f0000000-0000-0000-0000-000000000005', 'inativo.n@teste.local'),
  ('f0000000-0000-0000-0000-000000000006', 'dono.o@teste.local');

insert into public.salons (id, nome, slug, status) values
  ('f1000000-0000-0000-0000-000000000001', 'Salão N', 'salao-notif-n', 'ativo'),
  ('f1000000-0000-0000-0000-000000000002', 'Salão O', 'salao-notif-o', 'ativo');

insert into public.members (id, salon_id, user_id, perfil, status) values
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'dono', 'ativo'),
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'recepcao', 'ativo'),
  ('f2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'profissional', 'ativo'),
  ('f2000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'profissional', 'ativo'),
  ('f2000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 'recepcao', 'inativo'),
  ('f2000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000006', 'dono', 'ativo');

insert into public.professionals (id, salon_id, nome, member_id) values
  ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Prof A', 'f2000000-0000-0000-0000-000000000003'),
  ('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Prof B', 'f2000000-0000-0000-0000-000000000004');
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('f4000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Corte N', 60, 90);
insert into public.clients (id, salon_id, nome, telefone) values
  ('f5000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Cliente N1', '+5511987900001'),
  ('f5000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Cliente N2', '+5511987900002');

-- Aparelhos com aviso ligado: Dono(a) e Prof A.
insert into public.push_inscricoes (id, salon_id, member_id, endpoint, p256dh, auth) values
  ('f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'https://push.teste/dono', 'chave', 'segredo'),
  ('f6000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000003', 'https://push.teste/prof-a', 'chave', 'segredo');

-- A fila do push começa só com este teste.
update public.notificacoes set push_status = 'expirada' where push_status = 'na_fila';

-- 1: público, agenda A. 2: painel, agenda A. 3: público, agenda B, outra pessoa atendida.
insert into public.appointments (id, salon_id, professional_id, service_id, client_id, inicio, fim, preco, origem, atendido_nome) values
  ('f7000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', '2030-04-02 12:00Z', '2030-04-02 13:00Z', 90, 'publico', null),
  ('f7000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', '2030-04-02 14:00Z', '2030-04-02 15:00Z', 90, 'painel', null),
  ('f7000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000002', 'f4000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000002', '2030-04-02 12:00Z', '2030-04-02 13:00Z', 90, 'publico', 'Filha N2');

-- Gatilho: quem recebe.
select results_eq(
  $$select member_id, push_status from public.notificacoes
    where appointment_id = 'f7000000-0000-0000-0000-000000000001' order by member_id$$,
  $$values ('f2000000-0000-0000-0000-000000000001'::uuid, 'na_fila'::text),
           ('f2000000-0000-0000-0000-000000000002'::uuid, null::text),
           ('f2000000-0000-0000-0000-000000000003'::uuid, 'na_fila'::text)$$,
  'agenda A pela página: Dono(a), Recepção e Prof A; push na fila só de quem tem aparelho');
select is(
  (select count(*)::int from public.notificacoes where appointment_id = 'f7000000-0000-0000-0000-000000000002'),
  0, 'agendamento feito no painel não avisa');
select results_eq(
  $$select member_id from public.notificacoes
    where appointment_id = 'f7000000-0000-0000-0000-000000000003' order by member_id$$,
  $$values ('f2000000-0000-0000-0000-000000000001'::uuid), ('f2000000-0000-0000-0000-000000000002'::uuid),
           ('f2000000-0000-0000-0000-000000000004'::uuid)$$,
  'agenda B: Dono(a), Recepção e Prof B (Prof A não)');
select is(
  (select count(*)::int from public.notificacoes where member_id = 'f2000000-0000-0000-0000-000000000005'),
  0, 'membro desativado não recebe');
select is(
  (select count(*)::int from public.notificacoes where member_id = 'f2000000-0000-0000-0000-000000000006'),
  0, 'Dono(a) de outro salão não recebe');

-- anon: nada.
set local role anon;
select throws_ok($$select * from public.notificacoes$$, '42501', null, 'anon não lê notificacoes');
select throws_ok($$select * from public.minhas_notificacoes(30)$$, '42501', null, 'anon não chama minhas_notificacoes');
select throws_ok($$select public.salvar_inscricao_push('https://push.teste/x', 'a', 'b')$$, '42501', null, 'anon não liga aviso');
reset role;

set local role authenticated;

-- Prof A: só a própria agenda, sem acesso às tabelas.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$select * from public.notificacoes$$, '42501', null, 'logado não lê notificacoes direto');
select throws_ok($$select * from public.push_inscricoes$$, '42501', null, 'logado não lê push_inscricoes direto');
select throws_ok(
  $$insert into public.push_inscricoes (salon_id, member_id, endpoint, p256dh, auth)
    values ('f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'https://push.teste/y', 'a', 'b')$$,
  '42501', null, 'logado não grava aparelho de outro direto');
select throws_ok($$select * from public.push_reservar(10)$$, '42501', null, 'logado não reserva push');
select results_eq(
  $$select appointment_id, cliente, servico from public.minhas_notificacoes(30)$$,
  $$values ('f7000000-0000-0000-0000-000000000001'::uuid, 'Cliente N1'::text, 'Corte N'::text)$$,
  'Prof A vê só o aviso da própria agenda, com nome e serviço');
select is(public.notificacoes_nao_lidas(), 1, 'Prof A: 1 não lida');

-- Prof B: o da agenda B, com o nome de quem será atendido.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select results_eq(
  $$select appointment_id, cliente from public.minhas_notificacoes(30)$$,
  $$values ('f7000000-0000-0000-0000-000000000003'::uuid, 'Filha N2'::text)$$,
  'Prof B vê o da agenda B, com o nome de quem será atendido');

-- Dono(a) do outro salão: nada.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
select is((select count(*)::int from public.minhas_notificacoes(30)), 0, 'Dono(a) de outro salão não vê nada');
select is(public.marcar_notificacoes_lidas(), 0, 'Dono(a) de outro salão não marca as do salão N');
select lives_ok($$select public.remover_inscricao_push('https://push.teste/dono')$$, 'remover aparelho de outro: sem erro');

-- Desativado: sem avisos e sem ligar aparelho.
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*)::int from public.minhas_notificacoes(30)), 0, 'desativado não vê avisos');
select throws_ok($$select public.salvar_inscricao_push('https://push.teste/inativo', 'a', 'b')$$, '42501', null, 'desativado não liga aviso');

-- Dono(a): vê os dois e marca como lidos (só os dele).
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.minhas_notificacoes(30)), 2, 'Dono(a) vê os dois avisos');
select is(public.marcar_notificacoes_lidas(), 2, 'Dono(a) marca os dois como lidos');
select is(public.notificacoes_nao_lidas(), 0, 'Dono(a): nenhuma não lida');

-- Recepção liga o aviso (endereço inválido não entra).
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.salvar_inscricao_push('http://push.teste/rec', 'a', 'b')$$, '22023', null, 'só https');
select lives_ok($$select public.salvar_inscricao_push('https://push.teste/rec', 'a', 'b')$$, 'Recepção liga o aviso');
reset role;

select results_eq(
  $$select salon_id, member_id from public.push_inscricoes where endpoint = 'https://push.teste/rec'$$,
  $$values ('f1000000-0000-0000-0000-000000000001'::uuid, 'f2000000-0000-0000-0000-000000000002'::uuid)$$,
  'aparelho gravado no vínculo de quem está logado');
select is(
  (select count(*)::int from public.push_inscricoes where endpoint = 'https://push.teste/dono'),
  1, 'aparelho do Dono(a) N continua (outro salão não remove)');
select is(
  (select count(*)::int from public.notificacoes where member_id = 'f2000000-0000-0000-0000-000000000003' and lida_em is null),
  1, 'Dono(a) marcar como lido não mexe nas de Prof A');

-- Servidor: reservar devolve uma linha por aparelho com nome e serviço.
set local role service_role;
select results_eq(
  $$select inscricao_id, appointment_id, cliente, servico from public.push_reservar(20) order by inscricao_id, appointment_id$$,
  $$values ('f6000000-0000-0000-0000-000000000001'::uuid, 'f7000000-0000-0000-0000-000000000001'::uuid, 'Cliente N1'::text, 'Corte N'::text),
           ('f6000000-0000-0000-0000-000000000001'::uuid, 'f7000000-0000-0000-0000-000000000003'::uuid, 'Filha N2'::text, 'Corte N'::text),
           ('f6000000-0000-0000-0000-000000000002'::uuid, 'f7000000-0000-0000-0000-000000000001'::uuid, 'Cliente N1'::text, 'Corte N'::text)$$,
  'reservar: uma linha por aparelho (Dono(a): 2 avisos; Prof A: 1), com nome e serviço');
select is((select count(*)::int from public.push_reservar(20)), 0, 'nada a reservar de novo');
select lives_ok(
  $$select public.push_resultado((select id from public.notificacoes where appointment_id = 'f7000000-0000-0000-0000-000000000001' and member_id = 'f2000000-0000-0000-0000-000000000001'), 'enviada')$$,
  'grava o resultado');
reset role;
select is(
  (select push_status from public.notificacoes where appointment_id = 'f7000000-0000-0000-0000-000000000001' and member_id = 'f2000000-0000-0000-0000-000000000001'),
  'enviada', 'push enviado');

-- Aviso antigo expira; Profissional que perdeu a agenda deixa de ver o aviso.
update public.notificacoes set push_status = 'na_fila', created_at = now() - interval '1 hour'
where appointment_id = 'f7000000-0000-0000-0000-000000000003' and member_id = 'f2000000-0000-0000-0000-000000000004';
set local role service_role;
select is((select count(*)::int from public.push_reservar(20)), 0, 'push com mais de 30 min não sai');
reset role;
select is(
  (select push_status from public.notificacoes where appointment_id = 'f7000000-0000-0000-0000-000000000003' and member_id = 'f2000000-0000-0000-0000-000000000004'),
  'expirada', 'fica como expirada');

update public.professionals set member_id = null where id = 'f3000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.minhas_notificacoes(30)), 0, 'agenda desligada do login: aviso some');
reset role;

select * from finish();
rollback;
