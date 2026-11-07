-- Onboarding: cria o salão, o vínculo do Dono(a) e o plano inicial em uma só chamada.
-- É a única forma de criar um salão pelo app (a tabela não aceita insert direto).

create function public.create_salon(p_nome text, p_slug text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_salon uuid;
begin
  if v_user is null then
    raise exception 'não autenticado' using errcode = '28000';
  end if;

  insert into public.salons (nome, slug)
  values (trim(p_nome), lower(trim(p_slug)))
  returning id into v_salon;

  insert into public.members (salon_id, user_id, perfil)
  values (v_salon, v_user, 'dono');

  insert into public.subscriptions (salon_id) values (v_salon);

  return v_salon;
end;
$$;

revoke execute on function public.create_salon(text, text) from public, anon;
grant execute on function public.create_salon(text, text) to authenticated;
