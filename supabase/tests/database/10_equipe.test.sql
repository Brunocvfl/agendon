-- Equipe e acessos: equipe() só para Dono(a) e só do próprio salão; convite (status 'convidado')
-- não dá acesso; aceitar_convite(); regras do gatilho members_guarda.

begin;
select plan(27);

insert into auth.users (id, email, invited_at) values
  ('a0000000-0000-0000-0000-000000000001', 'dono.e@teste.local', null),
  ('a0000000-0000-0000-0000-000000000002', 'recep.e@teste.local', null),
  ('a0000000-0000-0000-0000-000000000003', 'convidada.e@teste.local', now()),
  ('a0000000-0000-0000-0000-000000000004', 'prof.e@teste.local', null),
  ('a0000000-0000-0000-0000-000000000005', 'nova.e@teste.local', now()),
  ('aa000000-0000-0000-0000-000000000001', 'dono.f@teste.local', null);

insert into public.salons (id, nome, slug) values
  ('ae000000-0000-0000-0000-000000000001', 'Salão E', 'salao-equipe-e'),
  ('af000000-0000-0000-0000-000000000001', 'Salão F', 'salao-equipe-f');

insert into public.members (id, salon_id, user_id, perfil, status, nome) values
  ('a7000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dono', 'ativo', null),
  ('a7000000-0000-0000-0000-000000000002', 'ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'recepcao', 'ativo', 'Rita Recepção'),
  ('a7000000-0000-0000-0000-000000000003', 'ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'profissional', 'convidado', 'Cora Convidada'),
  ('a7000000-0000-0000-0000-000000000004', 'ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'profissional', 'ativo', 'Paula Prof'),
  ('a7000000-0000-0000-0000-0000000000f1', 'af000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'dono', 'ativo', null);

insert into public.professionals (id, salon_id, member_id, nome) values
  ('a1000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000004', 'Paula Prof'),
  ('a1000000-0000-0000-0000-000000000002', 'ae000000-0000-0000-0000-000000000001', null, 'Sem Login');

set local role authenticated;

-- Dono(a) do salão E
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.equipe('ae000000-0000-0000-0000-000000000001')), 4, 'Dono(a) vê a equipe toda, com convites');
select is(
  (select email from public.equipe('ae000000-0000-0000-0000-000000000001') where id = 'a7000000-0000-0000-0000-000000000003'),
  'convidada.e@teste.local',
  'equipe() traz o e-mail do login'
);
select is(
  (select profissional_nome from public.equipe('ae000000-0000-0000-0000-000000000001') where id = 'a7000000-0000-0000-0000-000000000004'),
  'Paula Prof',
  'equipe() traz a agenda ligada'
);
select throws_ok(
  $$select * from public.equipe('af000000-0000-0000-0000-000000000001')$$,
  '42501', 'sem_permissao', 'Dono(a) não vê a equipe de outro salão'
);

select ok(public.email_em_uso(' Prof.E@teste.local '), 'email_em_uso: acha o login (sem diferenciar maiúsculas)');
select ok(not public.email_em_uso('ninguem@teste.local'), 'email_em_uso: e-mail livre');

-- Convidar: vínculo novo entra como 'convidado' (nunca já ativo para outra pessoa)
select lives_ok(
  $$insert into public.members (salon_id, user_id, perfil, status, nome)
    values ('ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'recepcao', 'convidado', 'Nina Nova')$$,
  'Dono(a) convida (status convidado)'
);
select throws_ok(
  $$update public.members set status = 'ativo' where id = 'a7000000-0000-0000-0000-000000000003'$$,
  '22023', 'convite_pendente', 'Dono(a) não ativa o convite de outra pessoa'
);
select throws_ok(
  $$insert into public.members (salon_id, user_id, perfil, status)
    values ('af000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'recepcao', 'convidado')$$,
  '42501', null, 'Dono(a) não convida para outro salão (RLS)'
);

-- Editar e desativar
select lives_ok(
  $$update public.members set perfil = 'recepcao', nome = 'Paula Recepção' where id = 'a7000000-0000-0000-0000-000000000004'$$,
  'Dono(a) muda o perfil de alguém'
);
select lives_ok(
  $$update public.members set status = 'inativo' where id = 'a7000000-0000-0000-0000-000000000004'$$,
  'Dono(a) desativa o acesso'
);
select lives_ok(
  $$update public.members set status = 'ativo' where id = 'a7000000-0000-0000-0000-000000000004'$$,
  'Dono(a) reativa o acesso'
);
select throws_ok(
  $$update public.members set perfil = 'recepcao' where id = 'a7000000-0000-0000-0000-000000000001'$$,
  '22023', 'proprio_acesso', 'Dono(a) não rebaixa a si mesmo'
);
select throws_ok(
  $$update public.members set status = 'inativo' where id = 'a7000000-0000-0000-0000-000000000001'$$,
  '22023', 'proprio_acesso', 'Dono(a) não desativa a si mesmo'
);
select throws_ok(
  $$update public.members set user_id = 'a0000000-0000-0000-0000-000000000005' where id = 'a7000000-0000-0000-0000-000000000002'$$,
  '22023', 'membro_imutavel', 'login do vínculo não muda'
);

-- Apagar: só convite pendente
select throws_ok(
  $$delete from public.members where id = 'a7000000-0000-0000-0000-000000000002'$$,
  '22023', 'membro_nao_apaga', 'quem já entrou não é apagado (só desativado)'
);
select lives_ok(
  $$delete from public.members where user_id = 'a0000000-0000-0000-0000-000000000005'$$,
  'convite pendente pode ser cancelado'
);

-- Segundo Dono(a): com dois, um pode rebaixar o outro; o último nunca sai
select lives_ok(
  $$update public.members set perfil = 'dono' where id = 'a7000000-0000-0000-0000-000000000002'$$,
  'promove a Recepção a Dono(a)'
);

-- Recepção não gerencia a equipe
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.equipe('ae000000-0000-0000-0000-000000000001')$$,
  '42501', 'sem_permissao', 'quem não é Dono(a) não vê equipe()'
);
select throws_ok(
  $$select public.email_em_uso('dono.e@teste.local')$$,
  '42501', 'sem_permissao', 'quem não é Dono(a) não pergunta se um e-mail tem conta'
);
update public.members set perfil = 'dono' where id = 'a7000000-0000-0000-0000-000000000004';
select is(
  (select perfil::text from public.members where id = 'a7000000-0000-0000-0000-000000000004'),
  'recepcao',
  'quem não é Dono(a) não muda perfis (RLS: o update não pega nenhuma linha)'
);

-- Convidada: sem acesso até aceitar
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.salons), 0, 'convite pendente não dá acesso ao salão');
select results_eq(
  $$select salao_nome, status from public.meu_acesso()$$,
  $$values ('Salão E'::text, 'convidado'::text)$$,
  'meu_acesso() mostra o convite pendente'
);
select is(public.aceitar_convite(), 'ae000000-0000-0000-0000-000000000001'::uuid, 'aceitar_convite() ativa o vínculo');
select is((select count(*)::int from public.salons), 1, 'depois do aceite, vê o salão');
select throws_ok($$select public.aceitar_convite()$$, 'P0002', 'sem_convite', 'sem convite pendente: erro');

-- Com dois Donos(as), um rebaixa o outro
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$update public.members set perfil = 'recepcao' where id = 'a7000000-0000-0000-0000-000000000001'$$,
  'um Dono(a) rebaixa o outro'
);

select * from finish();
rollback;
