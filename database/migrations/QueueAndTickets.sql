-- Queue state per clinic (tracks now-serving pointer)
create table if not exists public.queue_state (
  clinic_id varchar primary key,
  now_serving int not null default 0,
  updated_at timestamptz not null default now()
);

-- Ticket per appointment in a clinic queue
create table if not exists public.queue_ticket (
  id bigserial primary key,
  clinic_id varchar not null,
  appointment_id uuid not null,
  patient_id uuid,
  position int not null,
  status varchar not null default 'WAITING',  -- WAITING | SKIPPED | SERVED
  created_at timestamptz not null default now(),
  unique (clinic_id, appointment_id)
);

create index if not exists idx_queue_ticket_clinic_pos on public.queue_ticket (clinic_id, position);
create index if not exists idx_queue_ticket_clinic_status on public.queue_ticket (clinic_id, status);
