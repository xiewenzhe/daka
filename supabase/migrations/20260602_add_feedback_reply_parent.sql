alter table public.feedback_replies
add column if not exists parent_reply_id uuid references public.feedback_replies(id) on delete set null;

create index if not exists feedback_replies_parent_idx
on public.feedback_replies(parent_reply_id);

create or replace function public.validate_feedback_reply_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_feedback public.feedbacks%rowtype;
  parent_reply public.feedback_replies%rowtype;
begin
  select *
  into target_feedback
  from public.feedbacks
  where id = new.feedback_id;

  if not found then
    raise exception 'Feedback does not exist';
  end if;

  if new.sender_role = 'patient' and new.sender_id <> target_feedback.patient_id then
    raise exception 'Patient reply sender mismatch';
  end if;

  if new.sender_role = 'admin' and new.sender_id <> target_feedback.admin_id then
    raise exception 'Admin reply sender mismatch';
  end if;

  if new.sender_role = 'patient' and new.parent_reply_id is null then
    raise exception 'Patient can only reply to an admin reply';
  end if;

  if new.parent_reply_id is not null then
    select *
    into parent_reply
    from public.feedback_replies
    where id = new.parent_reply_id
      and feedback_id = new.feedback_id;

    if not found then
      raise exception 'Parent reply does not belong to this feedback';
    end if;

    if new.sender_role = 'patient' and parent_reply.sender_role <> 'admin' then
      raise exception 'Patient can only reply to an admin reply';
    end if;

    if new.sender_role = 'admin' and parent_reply.sender_role <> 'patient' then
      raise exception 'Admin can only reply to a patient reply';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_feedback_reply_target_trigger on public.feedback_replies;
create trigger validate_feedback_reply_target_trigger
before insert on public.feedback_replies
for each row
execute function public.validate_feedback_reply_target();
