"use client";

import {
  formatChineseMonth,
  getMonthLocalDateStrings,
  getScheduleRuntimeStatus
} from "@/lib/date";
import type { Checkin, MedicineSchedule } from "@/lib/types";

type MonthlyCheckinCalendarProps = {
  schedules: MedicineSchedule[];
  checkins: Checkin[];
  startDate?: string | null;
};

export function MonthlyCheckinCalendar({
  schedules,
  checkins,
  startDate
}: MonthlyCheckinCalendarProps) {
  const dates = getMonthLocalDateStrings();
  const orderedSchedules = [...schedules].slice(0, 3);
  const checkinByDateSchedule = new Map(
    checkins.map((checkin) => [
      `${checkin.checkin_date}:${checkin.schedule_id}`,
      checkin
    ])
  );

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">本月打卡日历</h2>
          <p className="mt-1 text-sm text-slate-500">{formatChineseMonth()}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            完成
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            漏
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-slate-400">
            {day}
          </div>
        ))}
        {Array.from({ length: getLeadingBlankCount(dates[0]) }).map((_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {dates.map((date) => {
          const isBeforeStart = Boolean(startDate && date < startDate);
          const segments = orderedSchedules.map((schedule) => {
            const checkin = checkinByDateSchedule.get(`${date}:${schedule.id}`);
            const status = isBeforeStart
              ? "not_due"
              : getScheduleRuntimeStatus(date, schedule.reminder_time, checkin);

            return {
              id: schedule.id,
              className: getSegmentClassName(status)
            };
          });

          return (
            <div key={date} className="flex justify-center">
              <div
                className={
                  isBeforeStart
                    ? "relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 opacity-50 ring-1 ring-slate-200"
                    : "relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 ring-1 ring-brand-100"
                }
                title={date}
              >
                <div className="absolute inset-0 flex flex-col">
                  {segments.map((segment) => (
                    <div key={segment.id} className={`min-h-0 flex-1 ${segment.className}`} />
                  ))}
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900">
                  {Number(date.slice(-2))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getLeadingBlankCount(firstDateString: string) {
  const day = new Date(`${firstDateString}T00:00:00`).getDay();
  return day === 0 ? 6 : day - 1;
}

function getSegmentClassName(status: string) {
  if (status === "checked" || status === "makeup") {
    return "bg-emerald-500";
  }

  if (status === "missed") {
    return "bg-red-500";
  }

  return "bg-slate-200";
}
