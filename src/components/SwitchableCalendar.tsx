"use client";

import { useState, useMemo } from "react";
import {
  formatChineseMonth,
  getScheduleRuntimeStatus
} from "@/lib/date";
import type { Checkin, MedicineSchedule } from "@/lib/types";

const moodEmojis: Record<string, string> = {
  "开心 😊": "😊",
  "一般 🙂": "🙂",
  "有点累 😴": "😴",
  "烦躁 😠": "😠"
};

const moodLabel: Record<string, string> = {
  "开心 😊": "开心",
  "一般 🙂": "一般",
  "有点累 😴": "有点累",
  "烦躁 😠": "烦躁"
};

type SwitchableCalendarProps = {
  schedules: MedicineSchedule[];
  checkins: Checkin[];
  startDate?: string | null;
  calendarType?: "checkin" | "mood";
};

export function SwitchableCalendar({
  schedules,
  checkins,
  startDate,
  calendarType = "checkin"
}: SwitchableCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [monthDate, setMonthDate] = useState(today);
  const [viewType, setViewType] = useState<"checkin" | "mood">(calendarType);

  const month = monthDate.slice(0, 7); // YYYY-MM
  const dates = useMemo(() => {
    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      `${month}-${String(i + 1).padStart(2, "0")}`
    );
  }, [month]);

  const checkinByDateSchedule = new Map(
    checkins.map((checkin) => [
      `${checkin.checkin_date}:${checkin.schedule_id}`,
      checkin
    ])
  );

  const moodByDate = new Map(
    checkins.map((checkin) => [checkin.checkin_date, checkin.mood])
  );

  // 计算心情统计
  const moodStats = useMemo(() => {
    const stats: Record<string, number> = {
      "开心 😊": 0,
      "一般 🙂": 0,
      "有点累 😴": 0,
      "烦躁 😠": 0
    };
    
    dates.forEach((date) => {
      const mood = moodByDate.get(date);
      if (mood && mood in stats) {
        stats[mood]++;
      }
    });
    
    return stats;
  }, [dates, moodByDate]);

  const orderedSchedules = [...schedules].slice(0, 3);

  const handlePrevMonth = () => {
    const [year, monthNum] = month.split("-").map(Number);
    let prevYear = year;
    let prevMonth = monthNum - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }
    setMonthDate(
      `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`
    );
  };

  const handleNextMonth = () => {
    const [year, monthNum] = month.split("-").map(Number);
    let nextYear = year;
    let nextMonth = monthNum + 1;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }
    setMonthDate(
      `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
    );
  };

  const monthStr = formatChineseMonth(new Date(`${month}-01T00:00:00`));

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            {viewType === "checkin" ? "打卡日历" : "心情日历"}
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-2">
            <button
              onClick={handlePrevMonth}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-white text-sm font-bold text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200"
            >
              ←
            </button>
            <span className="min-w-32 text-center text-sm font-bold text-slate-700">
              {monthStr}
            </span>
            <button
              onClick={handleNextMonth}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-white text-sm font-bold text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200"
            >
              →
            </button>
          </div>
          {viewType === "checkin" && (
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
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setViewType("checkin")}
          className={`px-3 py-2 text-sm font-bold transition-colors ${
            viewType === "checkin"
              ? "border-b-2 border-brand-600 text-brand-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          打卡日历
        </button>
        <button
          onClick={() => setViewType("mood")}
          className={`px-3 py-2 text-sm font-bold transition-colors ${
            viewType === "mood"
              ? "border-b-2 border-brand-600 text-brand-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          心情日历
        </button>
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
          const isToday = date === today;

          if (viewType === "mood") {
            // 心情日历视图：用表情表示，每天要么显示对应表情，要么显示日期序号
            const mood = moodByDate.get(date);
            const emoji = mood ? moodEmojis[mood] : "";
            const isDisabled = Boolean(startDate && date < startDate);

            return (
              <div key={date} className="flex justify-center">
                <div
                  className={`relative h-10 w-10 flex items-center justify-center text-xs font-black ring-1 rounded-lg ${
                    isDisabled
                      ? "bg-slate-100 opacity-50 ring-slate-200"
                      : isToday
                        ? "ring-brand-600 ring-2 bg-white"
                        : "bg-slate-50 ring-brand-100"
                  }`}
                  title={date}
                >
                  {emoji ? (
                    <span className="text-2xl">{emoji}</span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {Number(date.slice(-2))}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // 打卡日历视图
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
                className={`relative h-10 w-10 overflow-hidden rounded-full ring-1 ${
                  isBeforeStart
                    ? "bg-slate-100 opacity-50 ring-slate-200"
                    : isToday
                      ? "ring-2 ring-brand-600 bg-slate-100"
                      : "bg-slate-100 ring-brand-100"
                }`}
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

      {viewType === "mood" && (
        <div className="mt-6 rounded-lg bg-brand-50 p-4 ring-1 ring-brand-100">
          <p className="text-sm font-bold text-slate-700 mb-3">本月心情统计</p>
          <div className="space-y-3">
            {["开心 😊", "一般 🙂", "有点累 😴", "烦躁 😠"].map((moodKey) => {
              const count = moodStats[moodKey] ?? 0;
              const pct = dates.length ? Math.round((count / dates.length) * 100) : 0;
              return (
                <div key={moodKey} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{moodEmojis[moodKey]}</span>
                    <span className="text-sm text-slate-700">{moodLabel[moodKey]}</span>
                  </div>
                  <div className="flex items-center gap-3 w-1/2">
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-slate-700 w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
