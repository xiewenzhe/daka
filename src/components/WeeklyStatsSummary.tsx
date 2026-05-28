"use client";

import { formatShortChineseDate } from "@/lib/date";
import type { WeeklyStats } from "@/lib/types";

type WeeklyStatsSummaryProps = {
  title?: string;
  stats: WeeklyStats;
};

export function WeeklyStatsSummary({
  title = "最近 7 天统计",
  stats
}: WeeklyStatsSummaryProps) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            连续完成 {stats.streakDays} 天
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
          {stats.completionRate}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
          <p className="text-xl font-black text-emerald-700">
            {stats.completedCount}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">完成</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center ring-1 ring-red-100">
          <p className="text-xl font-black text-red-700">{stats.missedCount}</p>
          <p className="mt-1 text-xs font-semibold text-red-700">漏打卡</p>
        </div>
        <div className="rounded-lg bg-brand-50 p-3 text-center ring-1 ring-brand-100">
          <p className="text-xl font-black text-brand-700">{stats.totalCount}</p>
          <p className="mt-1 text-xs font-semibold text-brand-700">计划</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {stats.dailySummaries.map((summary) => {
          const isFull = summary.checkedCount === summary.totalCount;

          return (
            <div
              key={summary.date}
              className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
            >
              <span className="text-sm font-medium text-slate-700">
                {formatShortChineseDate(summary.date)}
              </span>
              <div className="flex items-center gap-2">
                {summary.missedCount > 0 ? (
                  <span className="text-xs font-semibold text-red-700">
                    漏 {summary.missedCount}
                  </span>
                ) : null}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
