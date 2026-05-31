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

  if new.status = 'checked' and new.checkin_type = 'makeup' then
    if new.actual_taken_at is null then
      raise exception 'Makeup check-in requires actual taken time';
    end if;

    if nullif(trim(coalesce(new.note, '')), '') is null then
      raise exception 'Makeup check-in requires a reason';
    end if;
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
