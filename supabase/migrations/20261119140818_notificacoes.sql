-- Notificações da equipe: aviso de agendamento novo feito pela página pública.
-- - Quem recebe: Dono(a) e Recepção ativos (todo o salão) e o Profissional ativo ligado à agenda
--   do agendamento (só a própria). Mesma regra de quem vê a agenda.
-- - notificacoes não guarda dado pessoal: nome e serviço são lidos na hora (cliente anonimizado
--   aparece como "Cliente anonimizado").
-- - push_inscricoes: os aparelhos (navegadores) de cada membro que ativaram o aviso (Web Push).
--   Gravação só por função; ninguém lê a tabela pelo painel.
-- - O envio do push é do servidor (service_role), pelas funções push_*: reservar, resultado e
--   remover o aparelho que não existe mais. Push com mais de 30 min na fila não sai (perdeu o sentido).

-- 1) Tabelas.
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  member_id uuid not null,
  appointment_id uuid not null,
  tipo text not null default 'novo_agendamento' check (tipo in ('novo_agendamento')),
  lida_em timestamptz,
  -- Nulo = sem aparelho com aviso ligado quando a notificação nasceu.
  push_status text check (push_status in ('na_fila', 'enviando', 'enviada', 'falhou', 'expirada')),
  created_at timestamptz not null default now(),
  foreign key (member_id, salon_id) references public.members (id, salon_id) on delete cascade,
  foreign key (appointment_id, salon_id) references public.appointments (id, salon_id),
  unique (appointment_id, member_id, tipo)
);
create index notificacoes_membro_idx on public.notificacoes (member_id, created_at desc);
create index notificacoes_push_fila_idx on public.notificacoes (created_at) where push_status = 'na_fila';

create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  member_id uuid not null,
  endpoint text not null unique
    check (char_length(endpoint) between 12 and 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (member_id, salon_id) references public.members (id, salon_id) on delete cascade
);
create index push_inscricoes_membro_idx on public.push_inscricoes (member_id);

alter table public.notificacoes enable row level security;
alter table public.push_inscricoes enable row level security;

-- Painel: só funções. Nenhuma leitura ou escrita direta.
revoke all on public.notificacoes from anon, authenticated;
revoke all on public.push_inscricoes from anon, authenticated;

-- 2) Este membro pode ver o aviso deste agendamento agora? (ativo; Dono(a)/Recepção, ou a própria agenda)
create function app.membro_ve_agenda(p_member uuid, p_professional uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.id = p_member
      and m.status = 'ativo'
      and (
        m.perfil in ('dono', 'recepcao')
        or exists (select 1 from public.professionals p where p.id = p_professional and p.member_id = m.id)
      )
  )
$$;
revoke execute on function app.membro_ve_agenda(uuid, uuid) from public, anon, authenticated;

-- 3) Gatilho: agendamento novo pela página pública avisa a equipe.
create function app.notificar_equipe()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.origem = 'publico' then
    insert into public.notificacoes (salon_id, member_id, appointment_id, tipo, push_status)
    select new.salon_id, m.id, new.id, 'novo_agendamento',
           case when exists (select 1 from public.push_inscricoes i where i.member_id = m.id) then 'na_fila' end
    from public.members m
    where m.salon_id = new.salon_id
      and app.membro_ve_agenda(m.id, new.professional_id)
    on conflict (appointment_id, member_id, tipo) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function app.notificar_equipe() from public, anon, authenticated;

create trigger appointments_notificar_equipe
  after insert on public.appointments
  for each row execute function app.notificar_equipe();

-- 4) Painel: o vínculo ativo de quem está logado (um salão por login no MVP).
create function app.meu_membro()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.id from public.members m
  where m.user_id = (select auth.uid()) and m.status = 'ativo'
  order by m.created_at
  limit 1
$$;
revoke execute on function app.meu_membro() from public, anon, authenticated;

-- Avisos de quem está logado, mais novos primeiro. Some o que a pessoa não pode mais ver
-- (desativada, virou Profissional, agenda desligada).
create function public.minhas_notificacoes(p_limite int default 30)
returns table (
  id uuid,
  appointment_id uuid,
  cliente text,
  servico text,
  criada_em timestamptz,
  lida_em timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select n.id, n.appointment_id,
         case when c.anonimizado_em is not null then c.nome else coalesce(a.atendido_nome, c.nome) end,
         s.nome, n.created_at, n.lida_em
  from public.notificacoes n
  join public.appointments a on a.id = n.appointment_id and a.salon_id = n.salon_id
  join public.clients c on c.id = a.client_id and c.salon_id = a.salon_id
  join public.services s on s.id = a.service_id and s.salon_id = a.salon_id
  where n.member_id = app.meu_membro()
    and app.membro_ve_agenda(n.member_id, a.professional_id)
  order by n.created_at desc
  limit greatest(least(coalesce(p_limite, 30), 100), 1)
$$;

create function public.notificacoes_nao_lidas()
returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int
  from public.notificacoes n
  join public.appointments a on a.id = n.appointment_id and a.salon_id = n.salon_id
  where n.member_id = app.meu_membro()
    and n.lida_em is null
    and app.membro_ve_agenda(n.member_id, a.professional_id)
$$;

-- Marca todas como lidas. Devolve quantas mudaram.
create function public.marcar_notificacoes_lidas()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_n int;
begin
  update public.notificacoes n set lida_em = now()
  where n.member_id = app.meu_membro() and n.lida_em is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 5) Aparelhos. Liga o aviso neste navegador (o mesmo endereço passa para quem entrou agora nele).
--    No máximo 10 aparelhos por pessoa: o mais antigo sai.
create function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_membro uuid := app.meu_membro();
  v_salao uuid;
begin
  if v_membro is null then
    raise exception 'sem_vinculo' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://\S{4,}$' or char_length(p_endpoint) > 1000
     or p_p256dh is null or char_length(p_p256dh) not between 1 and 200
     or p_auth is null or char_length(p_auth) not between 1 and 100 then
    raise exception 'inscricao_invalida' using errcode = '22023';
  end if;
  select m.salon_id into v_salao from public.members m where m.id = v_membro;

  insert into public.push_inscricoes (salon_id, member_id, endpoint, p256dh, auth)
  values (v_salao, v_membro, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set salon_id = excluded.salon_id, member_id = excluded.member_id,
        p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();

  delete from public.push_inscricoes i
  where i.member_id = v_membro
    and i.id not in (
      select j.id from public.push_inscricoes j where j.member_id = v_membro order by j.created_at desc limit 10
    );
end;
$$;

-- Desliga o aviso neste navegador (só o próprio aparelho).
create function public.remover_inscricao_push(p_endpoint text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_inscricoes i
  where i.endpoint = p_endpoint and i.member_id = app.meu_membro()
$$;

revoke execute on function public.minhas_notificacoes(int) from public, anon;
revoke execute on function public.notificacoes_nao_lidas() from public, anon;
revoke execute on function public.marcar_notificacoes_lidas() from public, anon;
revoke execute on function public.salvar_inscricao_push(text, text, text) from public, anon;
revoke execute on function public.remover_inscricao_push(text) from public, anon;
grant execute on function public.minhas_notificacoes(int) to authenticated;
grant execute on function public.notificacoes_nao_lidas() to authenticated;
grant execute on function public.marcar_notificacoes_lidas() to authenticated;
grant execute on function public.salvar_inscricao_push(text, text, text) to authenticated;
grant execute on function public.remover_inscricao_push(text) to authenticated;

-- 6) Servidor: envio do push.
-- Reserva até p_limite avisos e devolve uma linha por aparelho, com o texto (nome e serviço).
-- Antes: expira o que tem mais de 30 min e dá como falha o que ficou sem aparelho ou sem acesso.
create function public.push_reservar(p_limite int default 20)
returns table (
  notificacao_id uuid,
  inscricao_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  appointment_id uuid,
  cliente text,
  servico text
)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.notificacoes n set push_status = 'expirada'
  where n.push_status = 'na_fila' and n.created_at < now() - interval '30 minutes';

  update public.notificacoes n set push_status = 'falhou'
  where n.push_status = 'na_fila'
    and (
      not exists (select 1 from public.push_inscricoes i where i.member_id = n.member_id)
      or not exists (
        select 1 from public.appointments a
        where a.id = n.appointment_id and a.salon_id = n.salon_id
          and app.membro_ve_agenda(n.member_id, a.professional_id)
      )
    );

  return query
  with pegas as (
    select n.id
    from public.notificacoes n
    where n.push_status = 'na_fila'
    order by n.created_at
    limit greatest(least(coalesce(p_limite, 20), 50), 1)
    for update skip locked
  ),
  marcadas as (
    update public.notificacoes n set push_status = 'enviando'
    from pegas
    where n.id = pegas.id
    returning n.id, n.member_id, n.salon_id, n.appointment_id
  )
  select ma.id, i.id, i.endpoint, i.p256dh, i.auth, ma.appointment_id,
         case when c.anonimizado_em is not null then c.nome else coalesce(a.atendido_nome, c.nome) end,
         s.nome
  from marcadas ma
  join public.push_inscricoes i on i.member_id = ma.member_id
  join public.appointments a on a.id = ma.appointment_id and a.salon_id = ma.salon_id
  join public.clients c on c.id = a.client_id and c.salon_id = a.salon_id
  join public.services s on s.id = a.service_id and s.salon_id = a.salon_id
  order by ma.id, i.created_at;
end;
$$;

-- Resultado: enviada (chegou a pelo menos um aparelho) ou falhou.
create function public.push_resultado(p_notificacao uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_status is null or p_status not in ('enviada', 'falhou') then
    raise exception 'status_invalido' using errcode = '22023';
  end if;
  update public.notificacoes n set push_status = p_status
  where n.id = p_notificacao and n.push_status = 'enviando';
end;
$$;

-- O serviço de push respondeu que o aparelho não existe mais (404/410).
create function public.push_remover_inscricao(p_inscricao uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_inscricoes i where i.id = p_inscricao
$$;

revoke execute on function public.push_reservar(int) from public, anon, authenticated;
revoke execute on function public.push_resultado(uuid, text) from public, anon, authenticated;
revoke execute on function public.push_remover_inscricao(uuid) from public, anon, authenticated;
grant execute on function public.push_reservar(int) to service_role;
grant execute on function public.push_resultado(uuid, text) to service_role;
grant execute on function public.push_remover_inscricao(uuid) to service_role;
