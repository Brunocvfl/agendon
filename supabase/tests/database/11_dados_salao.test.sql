-- Dados do salão: o Dono(a) edita só as colunas de cadastro (status, plano e slug ficam de fora),
-- as regras de formato valem, a página pública devolve o endereço em partes e as logos no Storage
-- só são gravadas pelo Dono(a), na pasta do próprio salão.

begin;
select plan(19);

insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'dono.g@teste.local'),
  ('b0000000-0000-0000-0000-000000000002', 'recep.g@teste.local'),
  ('bb000000-0000-0000-0000-000000000001', 'dono.h@teste.local');

insert into public.salons (id, nome, slug) values
  ('be000000-0000-0000-0000-000000000001', 'Salão G', 'salao-dados-g'),
  ('bf000000-0000-0000-0000-000000000001', 'Salão H', 'salao-dados-h');

insert into public.members (salon_id, user_id, perfil) values
  ('be000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'dono'),
  ('be000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'recepcao'),
  ('bf000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'dono');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Cadastro
select lives_ok(
  $$update public.salons set nome = 'Salão G Novo', whatsapp = '+5511987650000', email = 'contato@g.com.br',
      instagram = 'salao.g', cep = '01001000', logradouro = 'Praça da Sé', numero = '100', bairro = 'Sé',
      cidade = 'São Paulo', uf = 'SP', fuso = 'America/Manaus'
    where id = 'be000000-0000-0000-0000-000000000001'$$,
  'Dono(a) edita contatos, endereço e fuso'
);
select throws_ok(
  $$update public.salons set status = 'ativo' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'Dono(a) não mexe no status (cobrança)'
);
select throws_ok(
  $$update public.salons set plano = 'pro' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'Dono(a) não mexe no plano (cobrança)'
);
select throws_ok(
  $$update public.salons set slug = 'outro-slug-g' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'slug não muda por aqui (link público)'
);

-- Formatos
select throws_ok($$update public.salons set uf = 'XX' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'UF inválida');
select throws_ok($$update public.salons set whatsapp = '11987650000' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'WhatsApp fora do E.164');
select throws_ok($$update public.salons set instagram = '@salao g' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Instagram com @ ou espaço');
select throws_ok($$update public.salons set cep = '01001-000' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'CEP só com dígitos');
select throws_ok($$update public.salons set fuso = 'Europe/Lisbon' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'fuso fora do Brasil');
select throws_ok(
  $$update public.salons set logo_path = 'bf000000-0000-0000-0000-000000000001/logo.png' where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'logo só na pasta do próprio salão'
);

-- Outro salão: a RLS não deixa ver nem mudar
update public.salons set nome = 'Invadido' where id = 'bf000000-0000-0000-0000-000000000001';
reset role;
select is((select nome from public.salons where id = 'bf000000-0000-0000-0000-000000000001'), 'Salão H',
  'Dono(a) não altera outro salão');
set local role authenticated;

-- Storage: logos
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('logos', 'be000000-0000-0000-0000-000000000001/logo-1.png')$$,
  'Dono(a) envia a logo na pasta do salão'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('logos', 'bf000000-0000-0000-0000-000000000001/logo-1.png')$$,
  '42501', null, 'Dono(a) não grava na pasta de outro salão'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('logos', 'sem-pasta.png')$$,
  '42501', null, 'arquivo fora de uma pasta de salão é recusado'
);
select lives_ok(
  $$update public.salons set logo_path = 'be000000-0000-0000-0000-000000000001/logo-1.png' where id = 'be000000-0000-0000-0000-000000000001'$$,
  'Dono(a) liga a logo ao salão'
);

-- Recepção: não edita o salão nem envia logo
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
update public.salons set nome = 'Pela Recepção' where id = 'be000000-0000-0000-0000-000000000001';
select is((select nome from public.salons where id = 'be000000-0000-0000-0000-000000000001'), 'Salão G Novo',
  'Recepção não edita o salão (RLS)');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('logos', 'be000000-0000-0000-0000-000000000001/logo-2.png')$$,
  '42501', null, 'Recepção não envia logo'
);

-- Página pública (como o servidor do app, com a chave secreta)
reset role;
set local role service_role;
select is(
  public.pagina_publica('salao-dados-g') -> 'salao' -> 'endereco' ->> 'cidade',
  'São Paulo',
  'pagina_publica devolve o endereço em partes'
);
select is(
  public.pagina_publica('salao-dados-g') -> 'salao' ->> 'logo_path',
  'be000000-0000-0000-0000-000000000001/logo-1.png',
  'pagina_publica devolve a logo'
);

select * from finish();
rollback;
