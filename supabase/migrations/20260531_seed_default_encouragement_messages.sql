insert into public.encouragement_messages (patient_id, type, content, enabled)
select profiles.id, defaults.type, defaults.content, true
from public.profiles
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
where profiles.role = 'patient'
  and not exists (
    select 1
    from public.encouragement_messages existing
    where existing.patient_id = profiles.id
      and existing.type = defaults.type
      and existing.content = defaults.content
  );
