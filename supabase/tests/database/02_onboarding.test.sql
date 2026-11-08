-- Testes do onboarding (create_salon): validação de entrada, slugs reservados e um salão por usuário.

begin;
select plan(11);

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'dona.um@teste.local'),
  ('d0000000-0000-0000-0000-000000000002', 'dona.dois@teste.local');

set local role authenticated;

-- Sem login
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok(
  $$select public.create_salon('Sem Login', 'sem-login')$$,
  '28000', 'nao_autenticado',
  'create_salon exige login'
);

-- Primeira usuária
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_salon('Studio', 'painel')$$,
  '22023', 'slug_reservado',
  'slug reservado é recusado'
);
select throws_ok(
  $$select public.create_salon('Studio', 'ab')$$,
  '22023', 'slug_invalido',
  'slug curto demais é recusado'
);
select throws_ok(
  $$select public.create_salon('Studio', 'Studio Bela!')$$,
  '22023', 'slug_invalido',
  'slug com espaço ou símbolo é recusado'
);
select throws_ok(
  $$select public.create_salon('  ', 'studio-vazio')$$,
  '22023', 'nome_invalido',
  'nome em branco é recusado'
);
select lives_ok(
  $$select public.create_salon('  Studio Bela Vida  ', '  Studio-Bela-Vida ')$$,
  'salão válido é criado'
);
select results_eq(
  $$select nome, slug from public.salons$$,
  $$values ('Studio Bela Vida'::text, 'studio-bela-vida'::text)$$,
  'nome e slug são normalizados (trim e minúsculas)'
);
select is(
  (select perfil::text from public.members where user_id = 'd0000000-0000-0000-0000-000000000001'),
  'dono',
  'quem cria vira Dono(a)'
);
select throws_ok(
  $$select public.create_salon('Outro Salão', 'outro-salao')$$,
  'P0001', 'ja_tem_salao',
  'um usuário só cria um salão no MVP'
);

-- Segunda usuária tenta o mesmo slug
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_salon('Bela Vida 2', 'studio-bela-vida')$$,
  '23505', null,
  'slug já usado por outro salão é recusado'
);

-- Anônimo não executa a função
reset role;
set local role anon;
select throws_ok(
  $$select public.create_salon('Anon', 'anon-salao')$$,
  '42501', null,
  'anon não chama create_salon'
);

select * from finish();
rollback;
