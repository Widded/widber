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

select 'slot_unique_index' as kind, indexname as name
from pg_indexes
where schemaname = 'public'
  and tablename = 'appointments'
  and indexname = 'appointments_unique_active_slot'

order by kind, name;
