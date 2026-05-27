-- 1. Create the admin and patient users in Supabase Auth first.
-- 2. The app maps account "admin" to admin@daka.local
--    and account "jiajia" to jiajia@daka.local when Supabase is enabled.
--    Replace these emails if you use different Auth emails.

with selected_users as (
  select
    (select id from auth.users where email = 'admin@daka.local') as admin_id,
    (select id from auth.users where email = 'jiajia@daka.local') as patient_id
)
insert into public.profiles (id, display_name, role)
select admin_id, '管理员', 'admin'
from selected_users
where admin_id is not null
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

with selected_users as (
  select
    (select id from auth.users where email = 'admin@daka.local') as admin_id,
    (select id from auth.users where email = 'jiajia@daka.local') as patient_id
)
insert into public.profiles (id, display_name, role)
select patient_id, '嘉嘉', 'patient'
from selected_users
where patient_id is not null
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

with selected_users as (
  select
    (select id from auth.users where email = 'admin@daka.local') as admin_id,
    (select id from auth.users where email = 'jiajia@daka.local') as patient_id
)
insert into public.care_links (admin_id, patient_id)
select admin_id, patient_id
from selected_users
where admin_id is not null
  and patient_id is not null
on conflict (admin_id, patient_id) do nothing;

with selected_users as (
  select id as patient_id
  from auth.users
  where email = 'jiajia@daka.local'
)
insert into public.medicine_schedules (user_id, label, display_name, reminder_time)
select patient_id, label, display_name, reminder_time::time
from selected_users
cross join (
  values
    ('morning', '早上', '09:00'),
    ('noon', '中午', '15:00'),
    ('evening', '晚上', '21:00')
) as schedules(label, display_name, reminder_time)
on conflict (user_id, label) do update
set display_name = excluded.display_name,
    reminder_time = excluded.reminder_time,
    enabled = true;
