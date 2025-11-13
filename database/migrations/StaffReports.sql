-- Staff Reports table for storing daily clinic reports
create table if not exists public.staff_reports (
  id bigserial primary key,
  clinic_id varchar not null,
  report_date date not null,
  patients_seen integer not null default 0,
  average_waiting_time_minutes numeric(10, 2),
  no_show_rate numeric(5, 2), -- percentage (0-100)
  total_appointments integer not null default 0,
  no_show_count integer not null default 0,
  pdf_file_path varchar,
  generated_at timestamptz not null default now(),
  generated_by varchar not null, -- staff user ID
  unique (clinic_id, report_date)
);

create index if not exists idx_staff_reports_clinic_date on public.staff_reports (clinic_id, report_date desc);

