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
insert into public.medicine_schedules (
  user_id,
  label,
  display_name,
  reminder_time,
  medicine_plan
)
select patient_id, label, display_name, reminder_time::time, medicine_plan
from selected_users
cross join (
  values
    ('morning', '早上', '09:00', '早餐后按医嘱喝药'),
    ('noon', '中午', '15:00', '午后按医嘱喝药'),
    ('evening', '晚上', '21:00', '睡前按医嘱喝药')
) as schedules(label, display_name, reminder_time, medicine_plan)
on conflict (user_id, label) do update
set display_name = excluded.display_name,
    reminder_time = excluded.reminder_time,
    medicine_plan = excluded.medicine_plan,
    enabled = true;

with selected_users as (
  select id as patient_id
  from auth.users
  where email = 'jiajia@daka.local'
)
insert into public.encouragement_messages (patient_id, type, content, enabled)
select patient_id, type, content, true
from selected_users
cross join (
  values
    ('normal', '今天也按时完成啦，嘉嘉棒棒棒！'),
    ('normal', '嘉嘉今天又认真照顾自己了，奖励亲亲，muamua！'),
    ('normal', '按时打卡成功，今天的嘉嘉很让人放心~'),
    ('normal', '打卡成功，乖乖的嘉嘉~'),
    ('normal', '完成打卡！对嘉嘉来说都是小case~'),
    ('normal', '嘉嘉公主驾到，统统闪开！'),
    ('makeup', '虽迟但到，嘉嘉可不会忘！'),
    ('makeup', '晚了一丢丢啦，哲哲莫怪~'),
    ('makeup', '谢谢嘉嘉没有放弃这次打卡'),
    ('streak_3', '已经连续 3 天啦，嘉嘉开始进入稳定节奏了，真棒！'),
    ('streak_7', '连续 7 天完成打卡，一整周都在认真照顾自己，真的很厉害！'),
    ('streak_14', '连续 14 天啦，这已经不是偶然，是嘉嘉很认真、很努力的证明。继续温柔地坚持下去吧。')
) as defaults(type, content)
where not exists (
  select 1
  from public.encouragement_messages existing
  where existing.patient_id = selected_users.patient_id
    and existing.type = defaults.type
    and existing.content = defaults.content
);
