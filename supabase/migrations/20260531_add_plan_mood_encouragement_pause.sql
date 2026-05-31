alter table public.medicine_schedules
add column if not exists medicine_plan text;

alter table public.checkins
add column if not exists mood text,
add column if not exists photo_url text;

create table if not exists public.encouragement_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in ('normal', 'makeup', 'streak_3', 'streak_7', 'streak_14')
  ),
  content text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint encouragement_messages_content_not_blank_check check (
    nullif(trim(content), '') is not null
  )
);

create table if not exists public.pause_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pause_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(user_id, pause_date)
);

create index if not exists encouragement_messages_patient_type_idx
on public.encouragement_messages(patient_id, type, enabled);

create index if not exists pause_days_user_date_idx
on public.pause_days(user_id, pause_date desc);

alter table public.encouragement_messages enable row level security;
alter table public.pause_days enable row level security;

drop policy if exists "encouragement_messages_select_own_or_linked" on public.encouragement_messages;
create policy "encouragement_messages_select_own_or_linked"
on public.encouragement_messages
for select
to authenticated
using (public.can_access_patient(patient_id));

drop policy if exists "encouragement_messages_insert_linked_admin" on public.encouragement_messages;
create policy "encouragement_messages_insert_linked_admin"
on public.encouragement_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.care_links
    where care_links.admin_id = auth.uid()
      and care_links.patient_id = encouragement_messages.patient_id
  )
);

drop policy if exists "encouragement_messages_update_linked_admin" on public.encouragement_messages;
create policy "encouragement_messages_update_linked_admin"
on public.encouragement_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.care_links
    where care_links.admin_id = auth.uid()
      and care_links.patient_id = encouragement_messages.patient_id
  )
)
with check (
  exists (
    select 1
    from public.care_links
    where care_links.admin_id = auth.uid()
      and care_links.patient_id = encouragement_messages.patient_id
  )
);

drop policy if exists "encouragement_messages_delete_linked_admin" on public.encouragement_messages;
create policy "encouragement_messages_delete_linked_admin"
on public.encouragement_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.care_links
    where care_links.admin_id = auth.uid()
      and care_links.patient_id = encouragement_messages.patient_id
  )
);

drop policy if exists "pause_days_select_own_or_linked_patient" on public.pause_days;
create policy "pause_days_select_own_or_linked_patient"
on public.pause_days
for select
to authenticated
using (public.can_access_patient(user_id));

drop policy if exists "pause_days_insert_own" on public.pause_days;
create policy "pause_days_insert_own"
on public.pause_days
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pause_days_update_own" on public.pause_days;
create policy "pause_days_update_own"
on public.pause_days
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "pause_days_delete_own" on public.pause_days;
create policy "pause_days_delete_own"
on public.pause_days
for delete
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do nothing;

drop policy if exists "checkin_photos_authenticated_upload" on storage.objects;
create policy "checkin_photos_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'checkin-photos' and owner = auth.uid());

drop policy if exists "checkin_photos_authenticated_read" on storage.objects;
create policy "checkin_photos_authenticated_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'checkin-photos');
