"use client";

import { formatShortChineseDate } from "@/lib/date";
import type { DailyCheckinSummary } from "@/lib/types";

type AdminHistorySummaryProps = {
  sevenDaySummaries: DailyCheckinSummary[];
  thirtyDayRate: number;
  totalThirtyDayCheckins: number;
  totalThirtyDaySlots: number;
};

export function AdminHistorySummary({
  sevenDaySummaries,
  thirtyDayRate,
  totalThirtyDayCheckins,
  totalThirtyDaySlots
}: AdminHistorySummaryProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
        <h2 className="text-lg font-bold text-slate-950">最近 7 天</h2>
        <div className="mt-4 space-y-2">
          {sevenDaySummaries.map((summary) => {
            const isFull = summary.checkedCount === summary.totalCount;

            return (
              <div
                key={summary.date}
                className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
              >
                <span className="text-sm font-medium text-slate-700">
                  {formatShortChineseDate(summary.date)}
                </span>
                <span
                  className={
                    isFull
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"
                      : "rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 ring-1 ring-amber-200"
                  }
                >
                  {summary.checkedCount}/{summary.totalCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
        <h2 className="text-lg font-bold text-slate-950">最近 30 天完成率</h2>
        <div className="mt-4 flex items-end justify-between gap-4">
          <p className="text-4xl font-black tracking-normal text-slate-950">
            {thirtyDayRate}%
          </p>
          <p className="pb-1 text-sm text-slate-500">
            {totalThirtyDayCheckins}/{totalThirtyDaySlots}
          </p>
        </div>
        <div className="mt-4 h-3 rounded-full bg-brand-100">
          <div
            className="h-3 rounded-full bg-emerald-500"
            style={{ width: `${thirtyDayRate}%` }}
          />
        </div>
      </div>
    </section>
  );
}
