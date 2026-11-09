-- Dados do salão (Configurações → Dados do salão): contatos, endereço em partes, fuso e logo.
-- Só o Dono(a) edita, e só estas colunas: status e plano (cobrança) e slug (link público) ficam de fora.

-- 1) Contatos e endereço em partes. O antigo `endereco` (texto livre) vira `logradouro`.
alter table public.salons
  add column whatsapp text,
  add column email text,
  add column instagram text,
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column uf text,
  add column logo_path text;

update public.salons set logradouro = left(trim(endereco), 120) where nullif(trim(endereco), '') is not null;
alter table public.salons drop column endereco;

alter table public.salons
  add constraint salons_whatsapp_e164 check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint salons_email_formato check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add constraint salons_instagram_formato check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint salons_cep_formato check (cep ~ '^[0-9]{8}$'),
  add constraint salons_logradouro_tamanho check (char_length(logradouro) between 2 and 120),
  add constraint salons_numero_tamanho check (char_length(numero) between 1 and 20),
  add constraint salons_complemento_tamanho check (char_length(complemento) between 1 and 60),
  add constraint salons_bairro_tamanho check (char_length(bairro) between 2 and 80),
  add constraint salons_cidade_tamanho check (char_length(cidade) between 2 and 80),
  add constraint salons_uf_valida check (uf in (
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
    'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  -- A logo fica na pasta do próprio salão no bucket `logos`.
  add constraint salons_logo_na_pasta check (logo_path like id::text || '/%' and char_length(logo_path) <= 200),
  -- Fusos do Brasil (sem horário de verão desde 2019, mas o banco usa as regras da IANA).
  add constraint salons_fuso_brasil check (fuso in (
    'America/Sao_Paulo', 'America/Noronha', 'America/Manaus', 'America/Cuiaba',
    'America/Porto_Velho', 'America/Boa_Vista', 'America/Rio_Branco'));

-- 2) O Dono(a) atualiza só as colunas de cadastro (a policy salons_update já exige Dono(a)).
revoke update on public.salons from authenticated;
grant update (nome, whatsapp, email, instagram, cep, logradouro, numero, complemento, bairro, cidade, uf, fuso, logo_path)
  on public.salons to authenticated;

-- 3) Página pública: devolve os contatos, o endereço em partes e a logo.
create or replace function public.pagina_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with salao as (
    select s.* from public.salons s where s.slug = p_slug and s.status = 'ativo'
  ),
  atende as (
    -- (profissional, serviço) que podem ser agendados: ambos ativos e o profissional tem horário.
    select p.id as professional_id, p.nome as profissional, sv.id as service_id,
           coalesce(ps.duracao_min, sv.duracao_min) as duracao_min, coalesce(ps.preco, sv.preco) as preco
    from salao s
    join public.professionals p on p.salon_id = s.id and p.ativo
    join public.professional_services ps on ps.professional_id = p.id
    join public.services sv on sv.id = ps.service_id and sv.ativo
    where exists (select 1 from public.working_hours wh where wh.professional_id = p.id)
  )
  select jsonb_build_object(
    'salao', jsonb_build_object(
      'nome', s.nome, 'fuso', s.fuso, 'whatsapp', s.whatsapp, 'instagram', s.instagram, 'logo_path', s.logo_path,
      'endereco', jsonb_build_object(
        'logradouro', s.logradouro, 'numero', s.numero, 'complemento', s.complemento,
        'bairro', s.bairro, 'cidade', s.cidade, 'uf', s.uf, 'cep', s.cep)),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', sv.id, 'nome', sv.nome, 'duracao_min', sv.duracao_min, 'preco', sv.preco)
                       order by sv.nome)
      from public.services sv
      where sv.salon_id = s.id and sv.ativo and exists (select 1 from atende a where a.service_id = sv.id)
    ), '[]'::jsonb),
    'profissionais', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.professional_id, 'nome', x.profissional, 'servicos', x.servicos)
                       order by x.profissional)
      from (
        select a.professional_id, a.profissional,
               jsonb_agg(jsonb_build_object('id', a.service_id, 'duracao_min', a.duracao_min, 'preco', a.preco)) as servicos
        from atende a
        group by a.professional_id, a.profissional
      ) x
    ), '[]'::jsonb)
  )
  from salao s
$$;

-- 4) Logos no Storage: bucket público (a logo aparece na página pública), até 1 MB, PNG/JPEG/WebP.
--    Caminho: <salon_id>/<arquivo>. Só o Dono(a) do salão grava, troca e apaga na pasta dele.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Pasta do objeto como uuid (null se não for um uuid), sem erro de conversão.
create function app.salao_da_pasta(p_nome text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(p_nome, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_nome, '/', 1)::uuid
  end
$$;
revoke execute on function app.salao_da_pasta(text) from public, anon;
grant execute on function app.salao_da_pasta(text) to authenticated;

create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]))
  with check (bucket_id = 'logos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
-- Leitura pela API (listar, apagar) também só na própria pasta; a imagem em si sai pela URL pública.
create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
