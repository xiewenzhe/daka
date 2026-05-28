alter table public.checkins
add column if not exists checkin_type text not null default 'normal',
add column if not exists actual_taken_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkins_checkin_type_check'
  ) then
    alter table public.checkins
    add constraint checkins_checkin_type_check
    check (checkin_type in ('normal', 'makeup'));
  end if;
end $$;

create or replace function public.validate_checkin_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_schedule public.medicine_schedules%rowtype;
  scheduled_at timestamptz;
  starts_at timestamptz;
  ends_at timestamptz;
begin
  select *
  into target_schedule
  from public.medicine_schedules
  where id = new.schedule_id
    and user_id = new.user_id
    and enabled = true;

  if not found then
    raise exception 'Invalid or disabled schedule for this user';
  end if;

  scheduled_at := (new.checkin_date + target_schedule.reminder_time) at time zone 'Asia/Shanghai';
  starts_at := scheduled_at - interval '1 hour';
  ends_at := scheduled_at + interval '1 hour';

  if new.status = 'checked' and new.checkin_type = 'normal' and (new.checked_at < starts_at or new.checked_at > ends_at) then
    raise exception 'Normal check-in is only allowed within one hour before or after the scheduled time';
  end if;

  if new.status = 'checked' and new.checkin_type = 'makeup' and new.actual_taken_at is null then
    raise exception 'Makeup check-in requires actual taken time';
  end if;

  if new.status = 'missed' then
    if nullif(trim(coalesce(new.note, '')), '') is null then
      raise exception 'Missed check-in requires a reason';
    end if;

    if new.checked_at <= ends_at then
      raise exception 'Missed reason can only be submitted after the check-in window has ended';
    end if;
  end if;

  return new;
end;
$$;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_admin_created_idx
on public.admin_notifications(admin_id, created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "admin_notifications_select_own" on public.admin_notifications;
create policy "admin_notifications_select_own"
on public.admin_notifications
for select
to authenticated
using (admin_id = auth.uid());

drop policy if exists "admin_notifications_update_own" on public.admin_notifications;
create policy "admin_notifications_update_own"
on public.admin_notifications
for update
to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

drop policy if exists "admin_notifications_insert_linked_patient" on public.admin_notifications;
create policy "admin_notifications_insert_linked_patient"
on public.admin_notifications
for insert
to authenticated
with check (
  patient_id = auth.uid()
  and exists (
    select 1
    from public.care_links
    where care_links.admin_id = admin_notifications.admin_id
      and care_links.patient_id = auth.uid()
  )
);
