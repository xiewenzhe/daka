create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint feedbacks_content_not_blank_check check (
    nullif(trim(content), '') is not null
  )
);

create index if not exists feedbacks_admin_created_idx
on public.feedbacks(admin_id, created_at desc);

create index if not exists feedbacks_patient_created_idx
on public.feedbacks(patient_id, created_at desc);

alter table public.feedbacks enable row level security;

drop policy if exists "feedbacks_select_own_or_admin" on public.feedbacks;
create policy "feedbacks_select_own_or_admin"
on public.feedbacks
for select
to authenticated
using (patient_id = auth.uid() or admin_id = auth.uid());

drop policy if exists "feedbacks_insert_linked_patient" on public.feedbacks;
create policy "feedbacks_insert_linked_patient"
on public.feedbacks
for insert
to authenticated
with check (
  patient_id = auth.uid()
  and exists (
    select 1
    from public.care_links
    where care_links.admin_id = feedbacks.admin_id
      and care_links.patient_id = auth.uid()
  )
);

drop policy if exists "feedbacks_update_admin_read_state" on public.feedbacks;
create policy "feedbacks_update_admin_read_state"
on public.feedbacks
for update
to authenticated
using (admin_id = auth.uid())
with check (admin_id = auth.uid());
