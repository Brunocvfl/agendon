-- Onboarding: regras de slug e um salão por usuário no MVP.

-- Slug: 3 a 40 caracteres e fora da lista de rotas do app (agendon.com.br/<slug> é a página pública).
create function app.slug_reservado(p_slug text)
returns boolean
language sql immutable set search_path = ''
as $$
  select p_slug = any (array[
    'admin', 'agendon', 'ajuda', 'api', 'app', 'auth', 'blog', 'cadastro', 'cadastrar',
    'conta', 'contato', 'criar-salao', 'dashboard', 'entrar', 'login', 'logout', 'painel',
    'planos', 'precos', 'privacidade', 'sair', 'salao', 'signup', 'static', 'status',
    'suporte', 'termos', 'webhook', 'webhooks', 'www'
  ])
$$;

alter table public.salons
  add constraint salons_slug_tamanho check (char_length(slug) between 3 and 40),
  add constraint salons_slug_reservado check (not app.slug_reservado(slug)),
  add constraint salons_nome_tamanho check (char_length(trim(nome)) between 2 and 80);

-- create_salon com validação de entrada e mensagens estáveis para o app traduzir:
--   nao_autenticado (28000), ja_tem_salao (P0001), nome_invalido (22023), slug_invalido (22023),
--   slug_reservado (22023) e slug em uso (23505, vindo da restrição unique).
create or replace function public.create_salon(p_nome text, p_slug text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_nome text := trim(coalesce(p_nome, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_salon uuid;
begin
  if v_user is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  -- MVP: cada login pertence a um único salão.
  if exists (select 1 from public.members m where m.user_id = v_user) then
    raise exception 'ja_tem_salao' using errcode = 'P0001';
  end if;

  if char_length(v_nome) not between 2 and 80 then
    raise exception 'nome_invalido' using errcode = '22023';
  end if;

  if char_length(v_slug) not between 3 and 40 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'slug_invalido' using errcode = '22023';
  end if;

  if app.slug_reservado(v_slug) then
    raise exception 'slug_reservado' using errcode = '22023';
  end if;

  insert into public.salons (nome, slug)
  values (v_nome, v_slug)
  returning id into v_salon;

  insert into public.members (salon_id, user_id, perfil)
  values (v_salon, v_user, 'dono');

  insert into public.subscriptions (salon_id) values (v_salon);

  return v_salon;
end;
$$;

revoke execute on function public.create_salon(text, text) from public, anon;
grant execute on function public.create_salon(text, text) to authenticated;

-- A restrição salons_slug_reservado chama esta função com o papel de quem altera o salão:
-- o Dono(a) (authenticated) e o servidor (service_role) precisam executá-la.
revoke execute on function app.slug_reservado(text) from public, anon;
grant usage on schema app to service_role;
grant execute on function app.slug_reservado(text) to authenticated, service_role;
