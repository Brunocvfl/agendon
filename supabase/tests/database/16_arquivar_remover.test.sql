-- Excluir (arquivar) profissional e remover alguém da equipe: só Dono(a), só do próprio salão,
-- nada é apagado, o histórico continua e as regras do members_guarda valem.

begin;
select plan(26);

insert into auth.users (id, email) values
  ('b6000000-0000-0000-0000-000000000001', 'dono.ar@teste.local'),
  ('b6000000-0000-0000-0000-000000000002', 'recep.ar@teste.local'),
  ('b6000000-0000-0000-0000-000000000003', 'prof.ar@teste.local'),
  ('b6000000-0000-0000-0000-000000000004', 'dono2.ar@teste.local'),
  ('b6000000-0000-0000-0000-000000000005', 'dono.outro.ar@teste.local');

insert into public.salons (id, nome, slug) values
  ('b6a00000-0000-0000-0000-000000000001', 'Salão AR', 'salao-arquivar-ar'),
  ('b6b00000-0000-0000-0000-000000000001', 'Salão Outro AR', 'salao-arquivar-outro');

insert into public.members (id, salon_id, user_id, perfil, status) values
  ('b6e00000-0000-0000-0000-000000000001', 'b6a00000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'dono', 'ativo'),
  ('b6e00000-0000-0000-0000-000000000002', 'b6a00000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000002', 'recepcao', 'ativo'),
  ('b6e00000-0000-0000-0000-000000000003', 'b6a00000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000003', 'profissional', 'ativo'),
  ('b6e00000-0000-0000-0000-000000000004', 'b6a00000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000004', 'dono', 'ativo'),
  ('b6e00000-0000-0000-0000-000000000005', 'b6b00000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000005', 'dono', 'ativo');

insert into public.professionals (id, salon_id, member_id, nome) values
  ('b6f00000-0000-0000-0000-000000000001', 'b6a00000-0000-0000-0000-000000000001', null, 'Ana Antiga'),
  ('b6f00000-0000-0000-0000-000000000002', 'b6a00000-0000-0000-0000-000000000001', null, 'Bia Futura'),
  ('b6f00000-0000-0000-0000-000000000003', 'b6a00000-0000-0000-0000-000000000001', 'b6e00000-0000-0000-0000-000000000003', 'Paula Login'),
  ('b6f00000-0000-0000-0000-000000000004', 'b6a00000-0000-0000-0000-000000000001', 'b6e00000-0000-0000-0000-000000000001', 'Dona Atende'),
  ('b6f00000-0000-0000-0000-000000000005', 'b6b00000-0000-0000-0000-000000000001', null, 'De Outro Salão');

insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('b6c00000-0000-0000-0000-000000000001', 'b6a00000-0000-0000-0000-000000000001', 'Corte AR', 30, 50);
insert into public.clients (id, salon_id, nome, telefone) values
  ('b6d00000-0000-0000-0000-000000000001', 'b6a00000-0000-0000-0000-000000000001', 'Cliente AR', '+5511900000616');

-- Ana: só agendamento antigo (concluído). Bia: um agendamento futuro marcado.
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, status) values
  ('b6a00000-0000-0000-0000-000000000001', 'b6f00000-0000-0000-0000-000000000001', 'b6c00000-0000-0000-0000-000000000001',
   'b6d00000-0000-0000-0000-000000000001', now() - interval '10 days', now() - interval '10 days' + interval '30 minutes', 'concluido'),
  ('b6a00000-0000-0000-0000-000000000001', 'b6f00000-0000-0000-0000-000000000002', 'b6c00000-0000-0000-0000-000000000001',
   'b6d00000-0000-0000-0000-000000000001', now() + interval '3 days', now() + interval '3 days' + interval '30 minutes', 'agendado');

set local role authenticated;

-- Recepção não arquiva nem remove
select set_config('request.jwt.claims', '{"sub":"b6000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000001')$$, '42501', 'sem_permissao', 'Recepção não arquiva profissional');
select throws_ok($$select public.remover_membro('b6e00000-0000-0000-0000-000000000003')$$, '42501', 'sem_permissao', 'Recepção não remove ninguém');

-- Dono(a) do Salão AR
select set_config('request.jwt.claims', '{"sub":"b6000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000005')$$, '42501', 'sem_permissao', 'Dono(a) não arquiva profissional de outro salão');
select throws_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000002')$$, 'P0001', 'tem_agendamentos_futuros', 'Com agendamento futuro marcado, não arquiva');
select throws_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000003')$$, 'P0001', 'agenda_de_login', 'Agenda de um login Profissional com acesso não é arquivada');

select lives_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000001')$$, 'Dono(a) arquiva profissional só com histórico');
select is(
  (select (not ativo and arquivado_em is not null) from public.professionals where id = 'b6f00000-0000-0000-0000-000000000001'),
  true, 'Arquivado fica inativo, com a data'
);
select is(
  (select count(*)::int from public.appointments where professional_id = 'b6f00000-0000-0000-0000-000000000001'),
  1, 'O agendamento antigo continua'
);
select throws_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000001')$$, 'P0002', 'nao_encontrado', 'Não arquiva duas vezes');
select lives_ok(
  $$insert into public.professionals (salon_id, nome) values ('b6a00000-0000-0000-0000-000000000001', 'Ana Antiga')$$,
  'O nome do arquivado fica livre para um cadastro novo'
);
select throws_ok(
  $$update public.professionals set ativo = true where id = 'b6f00000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Arquivado não volta a ficar ativo'
);

-- Agenda da Dono(a) ("sou eu"): arquiva e solta o login
select lives_ok($$select public.arquivar_profissional('b6f00000-0000-0000-0000-000000000004')$$, 'Agenda ligada a Dono(a) é arquivada');
select is((select member_id from public.professionals where id = 'b6f00000-0000-0000-0000-000000000004'), null, 'e fica sem login');

select is(
  (select count(*)::int from public.audit_log where salon_id = 'b6a00000-0000-0000-0000-000000000001' and acao = 'arquivar'),
  2, 'Cada arquivamento vai para o audit_log'
);

-- Remover da equipe
select throws_ok($$select public.remover_membro('b6e00000-0000-0000-0000-000000000005')$$, '42501', 'sem_permissao', 'Dono(a) não remove alguém de outro salão');
select throws_ok($$select public.remover_membro('b6e00000-0000-0000-0000-000000000001')$$, '22023', 'proprio_acesso', 'Ninguém remove a si mesmo');

select lives_ok($$select public.remover_membro('b6e00000-0000-0000-0000-000000000003')$$, 'Dono(a) remove a Profissional');
select is(
  (select status from public.members where id = 'b6e00000-0000-0000-0000-000000000003'),
  'inativo', 'Removida perde o acesso'
);
select is(
  (select count(*)::int from public.equipe('b6a00000-0000-0000-0000-000000000001') where id = 'b6e00000-0000-0000-0000-000000000003'),
  0, 'Removida some da equipe()'
);
select is((select member_id from public.professionals where id = 'b6f00000-0000-0000-0000-000000000003'), null, 'A agenda dela fica livre');
select throws_ok(
  $$update public.members set status = 'ativo' where id = 'b6e00000-0000-0000-0000-000000000003'$$,
  '23514', null, 'Removida não é reativada direto'
);

-- Convidar de novo: volta desativada
select is(public.restaurar_membro('b6a00000-0000-0000-0000-000000000001', ' PROF.AR@teste.local '), 'b6e00000-0000-0000-0000-000000000003'::uuid, 'restaurar_membro traz a removida de volta');
select is(
  (select status from public.equipe('b6a00000-0000-0000-0000-000000000001') where id = 'b6e00000-0000-0000-0000-000000000003'),
  'inativo', 'e ela volta à lista desativada'
);
select is(public.restaurar_membro('b6a00000-0000-0000-0000-000000000001', 'ninguem.ar@teste.local'), null, 'E-mail sem removido: null');

-- Dois Donos: remover um deles é permitido (sobra um ativo)
select lives_ok($$select public.remover_membro('b6e00000-0000-0000-0000-000000000004')$$, 'Remove outro Dono(a) quando sobra um');

-- Outro salão não restaura nem vê
select set_config('request.jwt.claims', '{"sub":"b6000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select throws_ok(
  $$select public.restaurar_membro('b6a00000-0000-0000-0000-000000000001', 'dono2.ar@teste.local')$$,
  '42501', 'sem_permissao', 'Dono(a) de outro salão não restaura'
);

select * from finish();
rollback;
