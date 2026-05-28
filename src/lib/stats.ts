import {
  getLocalDateString,
  getRecentLocalDateStrings,
  getScheduleRuntimeStatus
} from "@/lib/date";
import type {
  Checkin,
  DailyCheckinSummary,
  MedicineSchedule,
  WeeklyStats
} from "@/lib/types";

export function buildWeeklyStats(
  schedules: MedicineSchedule[],
  checkins: Checkin[],
  options?: {
    baseDate?: Date;
    startDate?: string | null;
  }
): WeeklyStats {
  const baseDate = options?.baseDate ?? new Date();
  const today = getLocalDateString(baseDate);
  const recentDates = getRecentLocalDateStrings(7, baseDate).filter(
    (date) => !options?.startDate || date >= options.startDate
  );
  const checkinByDateSchedule = new Map(
    checkins.map((checkin) => [
      `${checkin.checkin_date}:${checkin.schedule_id}`,
      checkin
    ])
  );
  const totalPerDay = schedules.length || 3;

  const dailySummaries: DailyCheckinSummary[] = recentDates.map((date) => {
    const checkedCount = schedules.filter((schedule) => {
      const checkin = checkinByDateSchedule.get(`${date}:${schedule.id}`);
      return checkin?.status === "checked";
    }).length;
    const missedCount = schedules.filter((schedule) => {
      const checkin = checkinByDateSchedule.get(`${date}:${schedule.id}`);
      return (
        getScheduleRuntimeStatus(
          date,
          schedule.reminder_time,
          checkin,
          baseDate
        ) === "missed"
      );
    }).length;

    return {
      date,
      checkedCount,
      missedCount,
      totalCount: totalPerDay
    };
  });

  const completedCount = dailySummaries.reduce(
    (sum, summary) => sum + summary.checkedCount,
    0
  );
  const missedCount = dailySummaries.reduce(
    (sum, summary) => sum + summary.missedCount,
    0
  );
  const totalCount = dailySummaries.length * totalPerDay;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  let streakDays = 0;

  for (const summary of [...dailySummaries].reverse()) {
    if (summary.date > today) {
      continue;
    }

    if (summary.checkedCount === summary.totalCount) {
      streakDays += 1;
      continue;
    }

    break;
  }

  return {
    completedCount,
    missedCount,
    totalCount,
    completionRate,
    streakDays,
    dailySummaries
  };
}
