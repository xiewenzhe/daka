create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin', 'patient')),
  created_at timestamptz not null default now()
);

create table if not exists public.care_links (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(admin_id, patient_id),
  check (admin_id <> patient_id)
);

create table if not exists public.medicine_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  display_name text not null,
  reminder_time time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, label)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid not null references public.medicine_schedules(id) on delete cascade,
  checkin_date date not null,
  status text not null default 'checked',
  checkin_type text not null default 'normal',
  actual_taken_at timestamptz,
  checked_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  constraint checkins_status_check check (status in ('checked', 'missed')),
  constraint checkins_missed_note_check check (
    status = 'checked' or nullif(trim(note), '') is not null
  ),
  constraint checkins_checkin_type_check check (checkin_type in ('normal', 'makeup')),
  unique(user_id, schedule_id, checkin_date)
);

alter table public.checkins
add column if not exists status text not null default 'checked',
add column if not exists checkin_type text not null default 'normal',
add column if not exists actual_taken_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkins_status_check'
  ) then
    alter table public.checkins
    add constraint checkins_status_check
    check (status in ('checked', 'missed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkins_missed_note_check'
  ) then
    alter table public.checkins
    add constraint checkins_missed_note_check
    check (status = 'checked' or nullif(trim(note), '') is not null);
  end if;

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

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text,
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_tokens_user_id_token_key'
  ) then
    alter table public.notification_tokens
    add constraint notification_tokens_user_id_token_key
    unique (user_id, token);
  end if;
end $$;

create index if not exists care_links_admin_id_idx on public.care_links(admin_id);
create index if not exists care_links_patient_id_idx on public.care_links(patient_id);
create index if not exists medicine_schedules_user_id_idx on public.medicine_schedules(user_id);
create index if not exists checkins_user_date_idx on public.checkins(user_id, checkin_date desc);
create index if not exists checkins_schedule_date_idx on public.checkins(schedule_id, checkin_date desc);
create index if not exists admin_notifications_admin_created_idx on public.admin_notifications(admin_id, created_at desc);

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

drop trigger if exists validate_checkin_rules_before_write on public.checkins;
create trigger validate_checkin_rules_before_write
before insert or update on public.checkins
for each row execute function public.validate_checkin_rules();

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.can_access_patient(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    target_user_id = auth.uid()
    or exists (
      select 1
      from public.care_links
      where admin_id = auth.uid()
        and patient_id = target_user_id
    )
$$;

alter table public.profiles enable row level security;
alter table public.care_links enable row level security;
alter table public.medicine_schedules enable row level security;
alter table public.checkins enable row level security;
alter table public.notification_tokens enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists "profiles_select_own_or_linked_patient" on public.profiles;
create policy "profiles_select_own_or_linked_patient"
on public.profiles
for select
to authenticated
using (public.can_access_patient(id));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "care_links_select_related" on public.care_links;
create policy "care_links_select_related"
on public.care_links
for select
to authenticated
using (admin_id = auth.uid() or patient_id = auth.uid());

drop policy if exists "medicine_schedules_select_own_or_linked_patient" on public.medicine_schedules;
create policy "medicine_schedules_select_own_or_linked_patient"
on public.medicine_schedules
for select
to authenticated
using (public.can_access_patient(user_id));

drop policy if exists "medicine_schedules_insert_own" on public.medicine_schedules;
create policy "medicine_schedules_insert_own"
on public.medicine_schedules
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "medicine_schedules_update_own" on public.medicine_schedules;
create policy "medicine_schedules_update_own"
on public.medicine_schedules
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.care_links
    where admin_id = auth.uid()
      and patient_id = user_id
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.care_links
    where admin_id = auth.uid()
      and patient_id = user_id
  )
);

drop policy if exists "medicine_schedules_delete_own" on public.medicine_schedules;
create policy "medicine_schedules_delete_own"
on public.medicine_schedules
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "checkins_select_own_or_linked_patient" on public.checkins;
create policy "checkins_select_own_or_linked_patient"
on public.checkins
for select
to authenticated
using (public.can_access_patient(user_id));

drop policy if exists "checkins_insert_own" on public.checkins;
create policy "checkins_insert_own"
on public.checkins
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.medicine_schedules
    where id = schedule_id
      and user_id = auth.uid()
      and enabled = true
  )
);

drop policy if exists "checkins_update_own" on public.checkins;
create policy "checkins_update_own"
on public.checkins
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notification_tokens_manage_own" on public.notification_tokens;
create policy "notification_tokens_manage_own"
on public.notification_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

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
