import type { EncouragementMessage, EncouragementType } from "@/lib/types";

export const defaultEncouragements: Record<EncouragementType, string[]> = {
  normal: [
    "今天也按时完成啦，嘉嘉棒棒棒！",
    "嘉嘉今天又认真照顾自己了，奖励亲亲，muamua！",
    "按时打卡成功，今天的嘉嘉很让人放心~",
    "打卡成功，乖乖的嘉嘉~",
    "完成打卡！对嘉嘉来说都是小case~",
    "嘉嘉公主驾到，统统闪开！"
  ],
  makeup: [
    "虽迟但到，嘉嘉可不会忘！",
    "晚了一丢丢啦，哲哲莫怪~",
    "谢谢嘉嘉没有放弃这次打卡"
  ],
  streak_3: [
    "已经连续 3 天啦，嘉嘉开始进入稳定节奏了，真棒！"
  ],
  streak_7: [
    "连续 7 天完成打卡，一整周都在认真照顾自己，真的很厉害！"
  ],
  streak_14: [
    "连续 14 天啦，这已经不是偶然，是嘉嘉很认真、很努力的证明。继续温柔地坚持下去吧。"
  ]
};

export const encouragementTypeLabels: Record<EncouragementType, string> = {
  normal: "正常打卡",
  makeup: "补打卡",
  streak_3: "连续 3 天",
  streak_7: "连续 7 天",
  streak_14: "连续 14 天"
};

export const encouragementTypes: EncouragementType[] = [
  "normal",
  "makeup",
  "streak_3",
  "streak_7",
  "streak_14"
];

export function pickEncouragement(
  type: EncouragementType,
  customMessages: EncouragementMessage[] = []
) {
  const custom = customMessages
    .filter((message) => message.type === type)
    .map((message) => message.content.trim())
    .filter(Boolean);

  const pool = custom.length > 0 ? custom : defaultEncouragements[type];

  return pool[Math.floor(Math.random() * pool.length)] ?? "";
}
