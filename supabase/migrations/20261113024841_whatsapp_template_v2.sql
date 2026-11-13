-- Template da confirmação: confirmacao_agendamento -> confirmacao_agendamento_v2.
-- A Meta reclassificou o primeiro como marketing (por causa do "responda SAIR") e não deixa trocar a
-- categoria. O v2 é utilidade e não fala de descadastro; o SAIR continua valendo pelo webhook.

create or replace function app.enfileirar_confirmacao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'agendado' and exists (
    select 1 from public.clients c
    where c.id = new.client_id and c.salon_id = new.salon_id
      and c.telefone is not null
      and c.consentimento_whatsapp_em is not null
      and c.optout_em is null
      and c.anonimizado_em is null
  ) then
    insert into public.message_log (salon_id, appointment_id, client_id, tipo, template)
    values (new.salon_id, new.id, new.client_id, 'confirmacao', 'confirmacao_agendamento_v2')
    on conflict (appointment_id, tipo) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function app.enfileirar_confirmacao() from public, anon, authenticated;

-- O que ainda está na fila com o nome antigo passa a usar o v2 (o antigo nunca foi aprovado).
update public.message_log
set template = 'confirmacao_agendamento_v2'
where template = 'confirmacao_agendamento' and status = 'na_fila';
