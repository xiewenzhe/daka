-- Repair default encouragement messages that may have been assigned to the
-- wrong type by an earlier admin UI.

update public.encouragement_messages
set type = 'normal',
    updated_at = now()
where content in (
  '今天也按时完成啦，嘉嘉棒棒棒！',
  '嘉嘉今天又认真照顾自己了，奖励亲亲，muamua！',
  '按时打卡成功，今天的嘉嘉很让人放心~',
  '打卡成功，乖乖的嘉嘉~',
  '完成打卡！对嘉嘉来说都是小case~',
  '嘉嘉公主驾到，统统闪开！'
);

update public.encouragement_messages
set type = 'makeup',
    updated_at = now()
where content in (
  '虽迟但到，嘉嘉可不会忘！',
  '晚了一丢丢啦，哲哲莫怪~',
  '谢谢嘉嘉没有放弃这次打卡'
);

update public.encouragement_messages
set type = 'streak_3',
    updated_at = now()
where content = '已经连续 3 天啦，嘉嘉开始进入稳定节奏了，真棒！';

update public.encouragement_messages
set type = 'streak_7',
    updated_at = now()
where content = '连续 7 天完成打卡，一整周都在认真照顾自己，真的很厉害！';

update public.encouragement_messages
set type = 'streak_14',
    updated_at = now()
where content = '连续 14 天啦，这已经不是偶然，是嘉嘉很认真、很努力的证明。继续温柔地坚持下去吧。';

update public.encouragement_messages
set enabled = true,
    updated_at = now();
