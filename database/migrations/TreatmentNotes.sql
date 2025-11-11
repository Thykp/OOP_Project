-- Treatment Notes table for storing doctor notes and treatment summaries
create table if not exists public.treatment_notes (
  id bigserial primary key,
  appointment_id uuid not null references public.appointment(appointment_id) on delete cascade,
  note_type varchar not null default 'TREATMENT_SUMMARY', -- TREATMENT_SUMMARY | FOLLOW_UP | PRESCRIPTION | OTHER
  notes text not null,
  created_by varchar not null, -- staff_id or doctor_id who created the note
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_appointment foreign key (appointment_id) references public.appointment(appointment_id) on delete cascade
);

