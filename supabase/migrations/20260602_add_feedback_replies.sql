create table if not exists public.feedback_replies (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedbacks(id) on delete cascade,
  parent_reply_id uuid references public.feedback_replies(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'patient')),
  content text not null,
  created_at timestamptz not null default now(),
  constraint feedback_replies_content_not_blank_check check (
    nullif(trim(content), '') is not null
  )
);

create index if not exists feedback_replies_feedback_created_idx
on public.feedback_replies(feedback_id, created_at asc);

create index if not exists feedback_replies_parent_idx
on public.feedback_replies(parent_reply_id);

alter table public.feedback_replies enable row level security;

drop policy if exists "feedback_replies_select_related" on public.feedback_replies;
create policy "feedback_replies_select_related"
on public.feedback_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.feedbacks
    where feedbacks.id = feedback_replies.feedback_id
      and (feedbacks.patient_id = auth.uid() or feedbacks.admin_id = auth.uid())
  )
);

drop policy if exists "feedback_replies_insert_related_sender" on public.feedback_replies;
create policy "feedback_replies_insert_related_sender"
on public.feedback_replies
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.feedbacks
    where feedbacks.id = feedback_replies.feedback_id
      and (
        (feedback_replies.sender_role = 'patient' and feedbacks.patient_id = auth.uid())
        or
        (feedback_replies.sender_role = 'admin' and feedbacks.admin_id = auth.uid())
      )
  )
);
