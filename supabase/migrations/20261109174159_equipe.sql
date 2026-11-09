-- Equipe e acessos: o Dono(a) convida Recepção, Profissional ou outro Dono(a) por e-mail, edita o
-- perfil e a agenda ligada e desativa o acesso.
--
-- Fluxo do convite (no servidor do app): auth.admin.inviteUserByEmail cria o login e envia o e-mail;
-- o app grava o vínculo em members com status 'convidado' (RLS: só Dono(a)). A pessoa abre o link,
-- cria a senha e chama aceitar_convite(), que passa o vínculo para 'ativo'. Enquanto 'convidado'
-- ou 'inativo', app.my_salon_ids() não devolve o salão: a RLS não mostra nada.

-- Nome de quem foi convidado (quem criou o salão não tem nome: a tela mostra o e-mail).
alter table public.members
  add column nome text,
  add constraint members_nome_tamanho check (nome is null or char_length(nome) between 2 and 80);

-- Regras que a RLS sozinha não garante. Valem para pedidos de usuários logados (auth.uid() não nulo);
-- o seed, os testes como postgres e o servidor com a chave secreta não passam por elas.
--   membro_imutavel  : salão e login de um vínculo não mudam.
--   convite_pendente : só a própria pessoa ativa um convite (aceitar_convite); ninguém cria vínculo
--                      já ativo para outra pessoa.
--   proprio_acesso   : ninguém muda o próprio perfil nem desativa o próprio acesso.
--   ultimo_dono      : o salão sempre fica com pelo menos um Dono(a) ativo.
--   membro_nao_apaga : só convite pendente é apagado (cancelar convite); quem já entrou é desativado.
-- Todas com errcode 22023 (valor inválido).
create function app.members_guarda()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'ativo' and new.user_id <> v_uid then
      raise exception 'convite_pendente' using errcode = '22023';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Apagar em cascata (salão ou login removido) não é decisão do usuário: só o delete direto conta.
    if pg_trigger_depth() = 1 and old.status <> 'convidado' then
      raise exception 'membro_nao_apaga' using errcode = '22023';
    end if;
    return old;
  end if;

  -- UPDATE
  if new.salon_id <> old.salon_id or new.user_id <> old.user_id then
    raise exception 'membro_imutavel' using errcode = '22023';
  end if;
  if old.status = 'convidado' and new.status <> 'convidado' and (new.status <> 'ativo' or old.user_id <> v_uid) then
    raise exception 'convite_pendente' using errcode = '22023';
  end if;
  if old.user_id = v_uid and old.status = 'ativo' and (new.perfil <> old.perfil or new.status <> old.status) then
    raise exception 'proprio_acesso' using errcode = '22023';
  end if;
  if old.perfil = 'dono' and old.status = 'ativo' and (new.perfil <> 'dono' or new.status <> 'ativo')
     and not exists (
       select 1 from public.members m
       where m.salon_id = old.salon_id and m.id <> old.id and m.perfil = 'dono' and m.status = 'ativo'
     ) then
    raise exception 'ultimo_dono' using errcode = '22023';
  end if;
  return new;
end
$$;
revoke execute on function app.members_guarda() from public, anon, authenticated;

create trigger members_guarda
  before insert or update or delete on public.members
  for each row execute function app.members_guarda();

-- Equipe do salão com e-mail e situação do login (auth.users não é visível pela API): só Dono(a).
create function public.equipe(p_salon uuid)
returns table (
  id uuid,
  user_id uuid,
  nome text,
  email text,
  perfil public.member_role,
  status text,
  convidado_em timestamptz,
  ultimo_acesso timestamptz,
  profissional_id uuid,
  profissional_nome text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not app.has_role(p_salon, array['dono']::public.member_role[]) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    select m.id, m.user_id, m.nome, u.email::text, m.perfil, m.status, u.invited_at, u.last_sign_in_at,
           p.id, p.nome
    from public.members m
    join auth.users u on u.id = m.user_id
    left join public.professionals p on p.member_id = m.id and p.salon_id = m.salon_id
    where m.salon_id = p_salon
    order by case m.status when 'ativo' then 0 when 'convidado' then 1 else 2 end,
             case m.perfil when 'dono' then 0 when 'recepcao' then 1 else 2 end,
             coalesce(m.nome, u.email);
end
$$;
revoke execute on function public.equipe(uuid) from public, anon;
grant execute on function public.equipe(uuid) to authenticated;

-- Acesso do usuário logado, em qualquer situação (convidado e inativo não leem salons pela RLS).
-- Serve para mandar o convidado ao aceite e explicar ao inativo por que não entra.
create function public.meu_acesso()
returns table (salao_nome text, perfil public.member_role, status text, nome text)
language sql stable security definer set search_path = ''
as $$
  select s.nome, m.perfil, m.status, m.nome
  from public.members m
  join public.salons s on s.id = m.salon_id
  where m.user_id = (select auth.uid())
  order by case m.status when 'ativo' then 0 when 'convidado' then 1 else 2 end
  limit 1
$$;
revoke execute on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated;

-- A pessoa convidada aceita o convite (já com sessão e senha criada): o vínculo passa para 'ativo'.
create function public.aceitar_convite()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_salon uuid;
begin
  update public.members
     set status = 'ativo'
   where user_id = (select auth.uid()) and status = 'convidado'
  returning salon_id into v_salon;
  if v_salon is null then
    raise exception 'sem_convite' using errcode = 'P0002';
  end if;
  return v_salon;
end
$$;
revoke execute on function public.aceitar_convite() from public, anon;
grant execute on function public.aceitar_convite() to authenticated;

-- O e-mail já tem login no AgendOn? O convite só cria login novo (MVP: um salão por login), então o
-- app confere antes de convidar. Só quem é Dono(a) ativo de algum salão pode perguntar.
create function public.email_em_uso(p_email text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid()) and m.perfil = 'dono' and m.status = 'ativo'
  ) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)));
end
$$;
revoke execute on function public.email_em_uso(text) from public, anon;
grant execute on function public.email_em_uso(text) to authenticated;

-- Rota do aceite (/convite) entra na lista de slugs reservados.
do $$
begin
  if exists (select 1 from public.salons where slug in ('convite', 'convites', 'equipe')) then
    raise exception 'Há salão usando um slug que passa a ser reservado';
  end if;
end
$$;

create or replace function app.slug_reservado(p_slug text)
returns boolean
language sql immutable set search_path = ''
as $$
  select p_slug = any (array[
    'admin', 'agendon', 'ajuda', 'api', 'app', 'auth', 'blog', 'cadastro', 'cadastrar',
    'conta', 'contato', 'convite', 'convites', 'criar-salao', 'dashboard', 'entrar', 'equipe',
    'esqueci-senha', 'login', 'logout', 'nova-senha', 'painel', 'planos', 'precos', 'privacidade',
    'sair', 'salao', 'senha', 'signup', 'static', 'status', 'suporte', 'termos', 'webhook',
    'webhooks', 'www'
  ])
$$;
