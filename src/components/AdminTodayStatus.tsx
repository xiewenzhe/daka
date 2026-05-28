"use client";

import { formatDateTime, formatTime, getScheduleRuntimeStatus } from "@/lib/date";
import type { ScheduleWithCheckin } from "@/lib/types";

type AdminTodayStatusProps = {
  patientName: string;
  checkinDate: string;
  items: ScheduleWithCheckin[];
};

export function AdminTodayStatus({
  patientName,
  checkinDate,
  items
}: AdminTodayStatusProps) {
  const checkedCount = items.filter(
    (item) => item.checkin?.status === "checked"
  ).length;

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">今天状态</h2>
          <p className="mt-1 text-sm text-slate-500">{patientName}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {checkedCount}/{items.length || 3}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const runtimeStatus = getScheduleRuntimeStatus(
            checkinDate,
            item.reminder_time,
            item.checkin
          );
          const isDone = runtimeStatus === "checked" || runtimeStatus === "makeup";
          const isMissed = runtimeStatus === "missed";
          const isMakeup = item.checkin?.checkin_type === "makeup";

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
            >
              <div>
                <p className="font-semibold text-slate-900">{item.display_name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  计划 {formatTime(item.reminder_time)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={
                    isDone
                      ? "text-sm font-bold text-emerald-700"
                      : isMissed
                        ? "text-sm font-bold text-red-700"
                        : "text-sm font-bold text-amber-700"
                  }
                >
                  {isDone
                    ? isMakeup
                      ? "补打卡"
                      : "正常打卡"
                    : isMissed
                      ? "已超时未打卡"
                      : "未到时间"}
                </p>
                {isDone && item.checkin ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(
                      item.checkin.actual_taken_at ?? item.checkin.checked_at
                    )}
                  </p>
                ) : null}
                {item.checkin?.note ? (
                  <p className="mt-1 max-w-36 text-sm leading-5 text-slate-500">
                    {item.checkin.note}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
