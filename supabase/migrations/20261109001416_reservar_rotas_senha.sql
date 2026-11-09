-- Rotas de recuperação de senha (/esqueci-senha e /nova-senha) entram na lista de slugs reservados.
-- A função é usada pela restrição salons_slug_reservado; salões existentes não são revalidados,
-- então a migration confere antes que nenhum salão usa os slugs novos.
do $$
begin
  if exists (select 1 from public.salons where slug in ('esqueci-senha', 'nova-senha', 'senha')) then
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
    'conta', 'contato', 'criar-salao', 'dashboard', 'entrar', 'esqueci-senha', 'login',
    'logout', 'nova-senha', 'painel', 'planos', 'precos', 'privacidade', 'sair', 'salao',
    'senha', 'signup', 'static', 'status', 'suporte', 'termos', 'webhook', 'webhooks', 'www'
  ])
$$;
