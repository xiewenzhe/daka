create table if not exists public.daily_moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood_date date not null,
  mood text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, mood_date),
  constraint daily_moods_mood_not_blank_check check (
    nullif(trim(mood), '') is not null
  )
);

create index if not exists daily_moods_user_date_idx
on public.daily_moods(user_id, mood_date desc);

alter table public.daily_moods enable row level security;

drop policy if exists "daily_moods_select_own_or_linked_patient" on public.daily_moods;
create policy "daily_moods_select_own_or_linked_patient"
on public.daily_moods
for select
to authenticated
using (public.can_access_patient(user_id));

drop policy if exists "daily_moods_insert_own" on public.daily_moods;
create policy "daily_moods_insert_own"
on public.daily_moods
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "daily_moods_update_own" on public.daily_moods;
create policy "daily_moods_update_own"
on public.daily_moods
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
