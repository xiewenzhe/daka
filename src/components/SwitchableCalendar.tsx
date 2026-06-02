"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  formatClock,
  formatChineseMonth,
  getScheduleRuntimeStatus
} from "@/lib/date";
import type { Checkin, DailyMood, MedicineSchedule } from "@/lib/types";

const moodEmojis: Record<string, string> = {
  "超乖 🥰": "🥰",
  "开心 😊": "😊",
  "正常 🙂": "🙂",
  "有点累 😴": "😴",
  "烦躁 😠": "😠",
  "哭哭 😭": "😭"
};

const moodLabel: Record<string, string> = {
  "超乖 🥰": "超乖",
  "开心 😊": "开心",
  "正常 🙂": "正常",
  "有点累 😴": "有点累",
  "烦躁 😠": "烦躁",
  "哭哭 😭": "哭哭"
};

const moodKeys = [
  "超乖 🥰",
  "开心 😊",
  "正常 🙂",
  "有点累 😴",
  "烦躁 😠",
  "哭哭 😭"
];

type SwitchableCalendarProps = {
  schedules: MedicineSchedule[];
  checkins: Checkin[];
  dailyMoods?: DailyMood[];
  startDate?: string | null;
  calendarType?: "checkin" | "mood";
};

export function SwitchableCalendar({
  schedules,
  checkins,
  dailyMoods = [],
  startDate,
  calendarType = "checkin"
}: SwitchableCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [monthDate, setMonthDate] = useState(today);
  const [viewType, setViewType] = useState<"checkin" | "mood">(calendarType);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const month = monthDate.slice(0, 7); // YYYY-MM
  const dates = useMemo(() => {
    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      `${month}-${String(i + 1).padStart(2, "0")}`
    );
  }, [month]);

  const checkinByDateSchedule = useMemo(
    () =>
      new Map(
        checkins.map((checkin) => [
          `${checkin.checkin_date}:${checkin.schedule_id}`,
          checkin
        ])
      ),
    [checkins]
  );

  const moodByDate = useMemo(() => {
    const next = new Map<string, DailyMood>();
    checkins.forEach((checkin) => {
      if (checkin.mood && !next.has(checkin.checkin_date)) {
        next.set(checkin.checkin_date, {
          id: `checkin-mood-${checkin.id}`,
          user_id: checkin.user_id,
          mood_date: checkin.checkin_date,
          mood: normalizeMood(checkin.mood),
          note: null,
          created_at: checkin.created_at,
          updated_at: checkin.created_at
        });
      }
    });
    dailyMoods.forEach((dailyMood) => {
      next.set(dailyMood.mood_date, {
        ...dailyMood,
        mood: normalizeMood(dailyMood.mood)
      });
    });
    return next;
  }, [checkins, dailyMoods]);

  // 计算心情统计
  const moodStats = useMemo(() => {
    const stats = Object.fromEntries(
      moodKeys.map((moodKey) => [moodKey, 0])
    ) as Record<string, number>;
    
    dates.forEach((date) => {
      const mood = normalizeMood(moodByDate.get(date)?.mood);
      if (mood && mood in stats) {
        stats[mood]++;
      }
    });
    
    return stats;
  }, [dates, moodByDate]);

  const orderedSchedules = useMemo(() => [...schedules].slice(0, 3), [schedules]);

  const checkinStats = useMemo(() => {
    const stats = {
      checked: 0,
      makeup: 0,
      missed: 0,
      total: 0
    };

    dates.forEach((date) => {
      const isBeforeStart = Boolean(startDate && date < startDate);

      if (isBeforeStart) {
        return;
      }

      orderedSchedules.forEach((schedule) => {
        const checkin = checkinByDateSchedule.get(`${date}:${schedule.id}`);
        const status = getScheduleRuntimeStatus(
          date,
          schedule.reminder_time,
          checkin
        );

        if (status === "not_due") {
          return;
        }

        stats.total += 1;

        if (status === "checked") {
          stats.checked += 1;
        }

        if (status === "makeup") {
          stats.checked += 1;
          stats.makeup += 1;
        }

        if (status === "missed") {
          stats.missed += 1;
        }
      });
    });

    return stats;
  }, [checkinByDateSchedule, dates, orderedSchedules, startDate]);

  const handlePrevMonth = () => {
    const [year, monthNum] = month.split("-").map(Number);
    let prevYear = year;
    let prevMonth = monthNum - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }
    const nextDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    setMonthDate(nextDate);
    setSelectedDate(nextDate);
    setIsDetailOpen(false);
  };

  const handleNextMonth = () => {
    const [year, monthNum] = month.split("-").map(Number);
    let nextYear = year;
    let nextMonth = monthNum + 1;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }
    const nextDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    setMonthDate(nextDate);
    setSelectedDate(nextDate);
    setIsDetailOpen(false);
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
            const dailyMood = moodByDate.get(date);
            const emoji = dailyMood ? moodEmojis[dailyMood.mood] : "";
            const isDisabled = Boolean(startDate && date < startDate);

            return (
              <div key={date} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setIsDetailOpen(true);
                  }}
                  className={`relative h-10 w-10 flex items-center justify-center text-xs font-black ring-1 rounded-lg ${
                    isDisabled
                      ? "bg-slate-100 opacity-50 ring-slate-200"
                      : selectedDate === date
                        ? "ring-brand-600 ring-2 bg-white"
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
                </button>
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
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setIsDetailOpen(true);
                }}
                className={`relative h-10 w-10 overflow-hidden rounded-full ring-1 ${
                  isBeforeStart
                    ? "bg-slate-100 opacity-50 ring-slate-200"
                    : selectedDate === date
                      ? "ring-2 ring-brand-700 bg-slate-100"
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
              </button>
            </div>
          );
        })}
      </div>

      {viewType === "mood" && (
        <div className="mt-6 rounded-lg bg-brand-50 p-4 ring-1 ring-brand-100">
          <p className="text-sm font-bold text-slate-700 mb-3">本月心情统计</p>
          <div className="space-y-3">
            {moodKeys.map((moodKey) => {
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

      {viewType === "checkin" && (
        <div className="mt-6 rounded-lg bg-brand-50 p-4 ring-1 ring-brand-100">
          <p className="mb-3 text-sm font-bold text-slate-700">本月打卡统计</p>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="完成" value={`${checkinStats.checked}`} />
            <StatTile label="补打卡" value={`${checkinStats.makeup}`} />
            <StatTile label="漏打" value={`${checkinStats.missed}`} />
          </div>
          <div className="mt-3 rounded-lg bg-white px-3 py-3 ring-1 ring-brand-100">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700">完成率</span>
              <span className="font-black text-brand-700">
                {checkinStats.total > 0
                  ? Math.round((checkinStats.checked / checkinStats.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-brand-600"
                style={{
                  width: `${
                    checkinStats.total > 0
                      ? Math.round((checkinStats.checked / checkinStats.total) * 100)
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isDetailOpen ? (
        <CalendarDetailModal
          date={selectedDate}
          title={viewType === "mood" ? "心情详情" : "打卡详情"}
          onClose={() => setIsDetailOpen(false)}
        >
          {viewType === "mood" ? (
            <MoodDayDetail
              date={selectedDate}
              dailyMood={moodByDate.get(selectedDate)}
            />
          ) : (
            <CheckinDayDetail
              date={selectedDate}
              schedules={orderedSchedules}
              checkinByDateSchedule={checkinByDateSchedule}
              startDate={startDate}
            />
          )}
        </CalendarDetailModal>
      ) : null}

    </section>
  );
}

function CalendarDetailModal({
  date,
  title,
  children,
  onClose
}: {
  date: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5 py-8">
      <div className="max-h-[86dvh] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-4 shadow-2xl ring-1 ring-brand-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">{title}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {formatDisplayDate(date)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg font-black text-brand-700 ring-1 ring-brand-100 active:bg-brand-100"
            aria-label="关闭详情"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function MoodDayDetail({
  dailyMood
}: {
  date: string;
  dailyMood?: DailyMood;
}) {
  return (
    <div className="rounded-lg bg-brand-50 p-4 ring-1 ring-brand-100">
      {dailyMood ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-brand-100">
            <p className="text-xs font-bold text-slate-500">当天心情</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {dailyMood.mood}
            </p>
          </div>
          <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-brand-100">
            <p className="text-xs font-bold text-slate-500">随心记</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {dailyMood.note?.trim() || "这一天还没有写随心记。"}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-white px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
          这一天还没有保存心情。
        </p>
      )}
    </div>
  );
}

function CheckinDayDetail({
  date,
  schedules,
  checkinByDateSchedule,
  startDate
}: {
  date: string;
  schedules: MedicineSchedule[];
  checkinByDateSchedule: Map<string, Checkin>;
  startDate?: string | null;
}) {
  const isBeforeStart = Boolean(startDate && date < startDate);

  return (
    <div className="rounded-lg bg-brand-50 p-4 ring-1 ring-brand-100">
      {isBeforeStart ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-3 text-sm text-slate-600 ring-1 ring-brand-100">
          这一天网站还没有开始使用。
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {schedules.map((schedule) => {
            const checkin = checkinByDateSchedule.get(`${date}:${schedule.id}`);
            const status = getScheduleRuntimeStatus(
              date,
              schedule.reminder_time,
              checkin
            );

            return (
              <article
                key={schedule.id}
                className="rounded-lg bg-white px-3 py-3 ring-1 ring-brand-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {schedule.display_name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      计划 {schedule.reminder_time.slice(0, 5)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-black ${getStatusBadgeClassName(status)}`}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>
                {checkin ? (
                  <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    <p>记录时间：{formatClock(checkin.checked_at)}</p>
                    {checkin.actual_taken_at ? (
                      <p>实际喝药：{formatClock(checkin.actual_taken_at)}</p>
                    ) : null}
                    {checkin.note ? (
                      <p className="whitespace-pre-wrap">备注：{checkin.note}</p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-3 text-center ring-1 ring-brand-100">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
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

function getStatusLabel(status: string) {
  if (status === "checked") {
    return "已打卡";
  }

  if (status === "makeup") {
    return "补打卡";
  }

  if (status === "missed") {
    return "漏打";
  }

  return "未到";
}

function getStatusBadgeClassName(status: string) {
  if (status === "checked" || status === "makeup") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (status === "missed") {
    return "bg-red-50 text-red-700 ring-1 ring-red-100";
  }

  return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function normalizeMood(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  if (value.includes("超乖")) {
    return "超乖 🥰";
  }

  if (value.includes("开心")) {
    return "开心 😊";
  }

  if (value.includes("正常")) {
    return "正常 🙂";
  }

  if (value.includes("累")) {
    return "有点累 😴";
  }

  if (value.includes("烦躁")) {
    return "烦躁 😠";
  }

  if (value.includes("哭")) {
    return "哭哭 😭";
  }

  return value;
}
