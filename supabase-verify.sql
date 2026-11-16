-- Performans indeksleri ve çakışma kısıtı kurulu mu?
select 'appointment_index' as kind, indexname as name
from pg_indexes
where schemaname = 'public'
  and tablename = 'appointments'
  and indexname in (
    'idx_appointments_date_status',
    'idx_appointments_barber_date_status'
  )

union all

select 'blocked_time_index' as kind, indexname as name
from pg_indexes
where schemaname = 'public'
  and tablename = 'barber_blocked_times'
  and indexname = 'idx_barber_blocked_date_barber'

union all

select 'overlap_constraint' as kind, conname as name
from pg_constraint
where conrelid = 'public.appointments'::regclass
  and conname = 'appointments_no_overlap'

order by kind, name;
