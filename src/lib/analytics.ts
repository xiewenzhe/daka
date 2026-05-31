import { getRecentLocalDateStrings, getScheduleRuntimeStatus } from "@/lib/date";
import type { Checkin, MedicineSchedule } from "@/lib/types";

export type AdminAnalysis = {
  days: number;
  totalMissed: number;
  totalMakeup: number;
  mostMissedSlot: string;
  mostMakeupSlot: string;
  mostMakeupWeekday: string;
};

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "long"
});

export function buildAdminAnalysis(
  schedules: MedicineSchedule[],
  checkins: Checkin[],
  options?: {
    days?: number;
    baseDate?: Date;
    startDate?: string | null;
    pauseDates?: string[];
  }
): AdminAnalysis {
  const days = options?.days ?? 30;
  const baseDate = options?.baseDate ?? new Date();
  const dates = getRecentLocalDateStrings(days, baseDate).filter(
    (date) => !options?.startDate || date >= options.startDate
  );
  const pauseDateSet = new Set(options?.pauseDates ?? []);
  const checkinByDateSchedule = new Map(
    checkins.map((checkin) => [
      `${checkin.checkin_date}:${checkin.schedule_id}`,
      checkin
    ])
  );
  const missedBySchedule = new Map<string, number>();
  const makeupBySchedule = new Map<string, number>();
  const makeupByWeekday = new Map<string, number>();

  dates.forEach((date) => {
    if (pauseDateSet.has(date)) {
      return;
    }

    schedules.forEach((schedule) => {
      const checkin = checkinByDateSchedule.get(`${date}:${schedule.id}`);
      const runtimeStatus = getScheduleRuntimeStatus(
        date,
        schedule.reminder_time,
        checkin,
        baseDate
      );

      if (runtimeStatus === "missed") {
        missedBySchedule.set(
          schedule.display_name,
          (missedBySchedule.get(schedule.display_name) ?? 0) + 1
        );
      }

      if (checkin?.checkin_type === "makeup") {
        makeupBySchedule.set(
          schedule.display_name,
          (makeupBySchedule.get(schedule.display_name) ?? 0) + 1
        );
        const weekday = weekdayFormatter.format(new Date(`${date}T00:00:00`));
        makeupByWeekday.set(weekday, (makeupByWeekday.get(weekday) ?? 0) + 1);
      }
    });
  });

  return {
    days,
    totalMissed: sumMap(missedBySchedule),
    totalMakeup: sumMap(makeupBySchedule),
    mostMissedSlot: getTopLabel(missedBySchedule),
    mostMakeupSlot: getTopLabel(makeupBySchedule),
    mostMakeupWeekday: getTopLabel(makeupByWeekday)
  };
}

function sumMap(source: Map<string, number>) {
  return Array.from(source.values()).reduce((sum, value) => sum + value, 0);
}

function getTopLabel(source: Map<string, number>) {
  const top = Array.from(source.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]}（${top[1]} 次）` : "暂无数据";
}
