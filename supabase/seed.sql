-- Dados de teste do ambiente LOCAL (rodam em `npm run db:reset`; o `db push` não envia seed).
-- Um salão com os três perfis para testar o painel. Senha de todos os logins: agendon-local
--   dono@agendon.test · recepcao@agendon.test · profissional@agendon.test
-- Os testes pgTAP não dependem destes dados (usam ids e slugs próprios).

-- Logins (Auth local, e-mail já confirmado)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('agendon-local', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'dono@agendon.test'),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'recepcao@agendon.test'),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'profissional@agendon.test')
) as u (id, email);

insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, 'email', u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u
where u.email like '%@agendon.test';

-- Salão e vínculos
insert into public.salons (id, nome, slug) values
  ('00000000-0000-4000-b000-000000000001', 'Studio Teste', 'studio-teste');

insert into public.members (id, salon_id, user_id, perfil) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'dono'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002', 'recepcao'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000003', 'profissional');

-- Serviços, profissionais e horários
insert into public.services (id, salon_id, nome, duracao_min, preco) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000001', 'Corte feminino', 60, 90),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000001', 'Escova', 45, 60);

insert into public.professionals (id, salon_id, member_id, nome) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000001', null, 'Ana Lima'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000003', 'Carla Souza');

insert into public.professional_services (salon_id, professional_id, service_id)
select '00000000-0000-4000-b000-000000000001', p.id, s.id
from public.professionals p cross join public.services s
where p.salon_id = '00000000-0000-4000-b000-000000000001';

-- Terça a sábado, 09:00–12:00 e 13:00–18:00 (pausa para o almoço)
insert into public.working_hours (salon_id, professional_id, dia_semana, inicio, fim)
select '00000000-0000-4000-b000-000000000001', p.id, d, f.inicio, f.fim
from public.professionals p
cross join generate_series(2, 6) as d
cross join (values ('09:00'::time, '12:00'::time), ('13:00'::time, '18:00'::time)) as f (inicio, fim)
where p.salon_id = '00000000-0000-4000-b000-000000000001';

-- Clientes (telefones fictícios)
insert into public.clients (id, salon_id, nome, telefone, observacoes) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-b000-000000000001', 'Marina Prado', '+5511987650001', 'Prefere horários pela manhã.'),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-b000-000000000001', 'Júlia Ramos', '+5511987650002', null),
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-b000-000000000001', 'Lucas Faria', '+5511987650003', null);

-- Histórico (passado) para a lista e a página do cliente
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, status, preco) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000001',
   '00000000-0000-4000-f000-000000000001', '2026-10-06 12:00Z', '2026-10-06 13:00Z', 'concluido', 90),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000002',
   '00000000-0000-4000-f000-000000000001', '2026-11-03 13:00Z', '2026-11-03 13:45Z', 'concluido', 60),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000001',
   '00000000-0000-4000-f000-000000000003', '2026-10-20 17:00Z', '2026-10-20 18:00Z', 'faltou', 90);

-- Agenda de hoje e de amanhã (relativa à data do reset, no fuso do salão)
insert into public.appointments (salon_id, professional_id, service_id, client_id, inicio, fim, preco, status)
select '00000000-0000-4000-b000-000000000001', a.prof, a.serv, a.cli,
       ((now() at time zone 'America/Sao_Paulo')::date + a.dia + a.hora) at time zone 'America/Sao_Paulo',
       ((now() at time zone 'America/Sao_Paulo')::date + a.dia + a.hora + a.dur) at time zone 'America/Sao_Paulo',
       a.preco, a.status::public.appointment_status
from (values
  ('00000000-0000-4000-e000-000000000001'::uuid, '00000000-0000-4000-d000-000000000001'::uuid, '00000000-0000-4000-f000-000000000001'::uuid, 0, time '09:00', interval '60 min', 90, 'confirmado'),
  ('00000000-0000-4000-e000-000000000001'::uuid, '00000000-0000-4000-d000-000000000002'::uuid, '00000000-0000-4000-f000-000000000002'::uuid, 0, time '10:30', interval '45 min', 60, 'agendado'),
  ('00000000-0000-4000-e000-000000000002'::uuid, '00000000-0000-4000-d000-000000000001'::uuid, '00000000-0000-4000-f000-000000000003'::uuid, 0, time '14:00', interval '60 min', 90, 'agendado'),
  ('00000000-0000-4000-e000-000000000002'::uuid, '00000000-0000-4000-d000-000000000002'::uuid, '00000000-0000-4000-f000-000000000001'::uuid, 1, time '11:00', interval '45 min', 60, 'agendado')
) as a (prof, serv, cli, dia, hora, dur, preco, status);
