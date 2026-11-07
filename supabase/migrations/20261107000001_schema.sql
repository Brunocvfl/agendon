-- AgendOn: schema inicial (multi-tenant por salon_id)
-- Datas em timestamptz (UTC). O fuso de exibição é o do salão.

create extension if not exists btree_gist;

create type public.member_role as enum ('dono', 'recepcao', 'profissional');
create type public.appointment_status as enum ('agendado', 'confirmado', 'concluido', 'faltou', 'cancelado');
create type public.appointment_origin as enum ('publico', 'painel');

-- Salão (o tenant)
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  endereco text,
  fuso text not null default 'America/Sao_Paulo',
  plano text not null default 'solo',
  status text not null default 'ativo' check (status in ('ativo', 'suspenso', 'cancelado')),
  created_at timestamptz not null default now()
);

-- Liga o login (auth.users) ao salão e define o perfil
create table public.members (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  perfil public.member_role not null,
  status text not null default 'ativo' check (status in ('ativo', 'convidado', 'inativo')),
  created_at timestamptz not null default now(),
  unique (salon_id, user_id),
  unique (id, salon_id)
);
create index members_user_id_idx on public.members (user_id);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, salon_id)
);
create index professionals_salon_idx on public.professionals (salon_id);
create index professionals_member_idx on public.professionals (member_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  nome text not null,
  duracao_min integer not null check (duracao_min > 0),
  preco numeric(10, 2) not null check (preco >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, salon_id)
);
create index services_salon_idx on public.services (salon_id);

-- Quem faz o quê (preço e duração próprios são opcionais)
create table public.professional_services (
  salon_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  preco numeric(10, 2) check (preco >= 0),
  duracao_min integer check (duracao_min > 0),
  primary key (professional_id, service_id),
  foreign key (professional_id, salon_id) references public.professionals (id, salon_id) on delete cascade,
  foreign key (service_id, salon_id) references public.services (id, salon_id) on delete cascade
);
create index professional_services_salon_idx on public.professional_services (salon_id);

-- Horário de trabalho semanal (0 = domingo). Intervalos = várias linhas no mesmo dia.
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null,
  professional_id uuid not null,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  inicio time not null,
  fim time not null,
  check (fim > inicio),
  foreign key (professional_id, salon_id) references public.professionals (id, salon_id) on delete cascade
);
create index working_hours_prof_idx on public.working_hours (salon_id, professional_id);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null,
  professional_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text,
  check (fim > inicio),
  foreign key (professional_id, salon_id) references public.professionals (id, salon_id) on delete cascade
);
create index time_off_prof_idx on public.time_off (salon_id, professional_id);

-- Dado pessoal (LGPD): telefone em E.164; anonimização limpa os campos pessoais
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  nome text not null,
  telefone text check (telefone is null or telefone ~ '^\+[1-9][0-9]{7,14}$'),
  consentimento_whatsapp_em timestamptz,
  consentimento_origem text,
  optout_em timestamptz,
  observacoes text,
  anonimizado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (salon_id, telefone),
  unique (id, salon_id)
);
create index clients_salon_idx on public.clients (salon_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  client_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  status public.appointment_status not null default 'agendado',
  origem public.appointment_origin not null default 'painel',
  created_at timestamptz not null default now(),
  check (fim > inicio),
  foreign key (professional_id, salon_id) references public.professionals (id, salon_id),
  foreign key (service_id, salon_id) references public.services (id, salon_id),
  foreign key (client_id, salon_id) references public.clients (id, salon_id),
  -- Dois agendamentos ativos do mesmo profissional não podem se sobrepor.
  -- Faltou e cancelado liberam o horário.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status in ('agendado', 'confirmado', 'concluido'))
);
create index appointments_salon_inicio_idx on public.appointments (salon_id, inicio);
create index appointments_professional_idx on public.appointments (professional_id, inicio);
create index appointments_client_idx on public.appointments (client_id);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  tipo text not null check (tipo in ('confirmacao', 'lembrete_1d', 'lembrete_2h', 'cancelamento')),
  texto text not null,
  status_meta text not null default 'rascunho' check (status_meta in ('rascunho', 'em_analise', 'aprovado', 'rejeitado')),
  ativo boolean not null default true,
  unique (salon_id, tipo)
);

create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  tipo text not null,
  status text not null default 'na_fila',
  meta_message_id text,
  custo_estimado numeric(8, 4),
  created_at timestamptz not null default now()
);
create index message_log_salon_idx on public.message_log (salon_id, created_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  salon_id uuid not null references public.salons (id) on delete cascade,
  user_id uuid,
  acao text not null,
  tabela text not null,
  registro_id uuid,
  created_at timestamptz not null default now()
);
create index audit_log_salon_idx on public.audit_log (salon_id, created_at);

create table public.subscriptions (
  salon_id uuid primary key references public.salons (id) on delete cascade,
  plano text not null default 'solo',
  max_agendas integer not null default 1,
  max_agendamentos_mes integer not null default 150,
  ciclo_inicio date not null default current_date
);
