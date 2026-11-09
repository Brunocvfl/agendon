-- message_log: o agendamento citado tem que ser do mesmo salão (FK composta, como nas outras tabelas).
-- Agendamento nunca é apagado; se um dia for, o registro da mensagem fica sem o agendamento.

alter table public.appointments
  add constraint appointments_id_salon_key unique (id, salon_id);

alter table public.message_log
  drop constraint message_log_appointment_id_fkey,
  add constraint message_log_appointment_fkey
    foreign key (appointment_id, salon_id) references public.appointments (id, salon_id)
    on delete set null (appointment_id);

create index message_log_appointment_idx on public.message_log (appointment_id);
