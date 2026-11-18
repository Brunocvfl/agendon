-- Foto do profissional: aparece na página pública e no painel.
-- professionals.foto_path: caminho no bucket público `fotos`, sempre na pasta do salão. Quem grava é
-- quem edita o cadastro do profissional (Dono(a), policy professionals_update); o arquivo vai do
-- navegador direto ao Storage, onde só o Dono(a) grava na pasta do próprio salão.

alter table public.professionals
  add column foto_path text,
  add constraint professionals_foto_na_pasta
    check (foto_path is null or (foto_path like salon_id::text || '/%' and char_length(foto_path) <= 200));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]))
  with check (bucket_id = 'fotos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));
-- Leitura pela API (listar, apagar) só na própria pasta; a imagem em si sai pela URL pública.
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and app.has_role(app.salao_da_pasta(name), array['dono']::public.member_role[]));

-- pagina_publica devolve a foto de cada profissional.
create or replace function public.pagina_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with salao as (
    select s.* from public.salons s where s.slug = p_slug and s.status = 'ativo'
  ),
  atende as (
    -- (profissional, serviço) que podem ser agendados: ambos ativos e o profissional tem horário.
    select p.id as professional_id, p.nome as profissional, p.foto_path, sv.id as service_id,
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
      select jsonb_agg(jsonb_build_object('id', x.professional_id, 'nome', x.profissional, 'foto_path', x.foto_path, 'servicos', x.servicos)
                       order by x.profissional)
      from (
        select a.professional_id, a.profissional, a.foto_path,
               jsonb_agg(jsonb_build_object('id', a.service_id, 'duracao_min', a.duracao_min, 'preco', a.preco)) as servicos
        from atende a
        group by a.professional_id, a.profissional, a.foto_path
      ) x
    ), '[]'::jsonb)
  )
  from salao s
$$;
