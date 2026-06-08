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
        <MetricCard
          tone="green"
          label="完成"
          value={stats.completedCount}
        />
        <MetricCard tone="red" label="漏打卡" value={stats.missedCount} />
        <MetricCard tone="brand" label="计划" value={stats.totalCount} />
      </div>

      <div className="mt-4 space-y-2">
        {stats.dailySummaries.map((summary) => {
          const isPaused = Boolean(summary.paused);
          const isFull =
            summary.totalCount > 0 && summary.checkedCount === summary.totalCount;

          return (
            <div
              key={summary.date}
              className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100"
            >
              <span className="text-sm font-medium text-slate-700">
                {formatShortChineseDate(summary.date)}
              </span>
              <div className="flex items-center gap-2">
                {isPaused ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
                    暂停
                  </span>
                ) : null}
                {!isPaused && summary.missedCount > 0 ? (
                  <span className="text-xs font-semibold text-red-700">
                    漏 {summary.missedCount}
                  </span>
                ) : null}
                {!isPaused ? (
                  <span
                    className={
                      isFull
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"
                        : "rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 ring-1 ring-amber-200"
                    }
                  >
                    {summary.checkedCount}/{summary.totalCount}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({
  tone,
  label,
  value
}: {
  tone: "green" | "red" | "brand";
  label: string;
  value: number;
}) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "red"
        ? "bg-red-50 text-red-700 ring-red-100"
        : "bg-brand-50 text-brand-700 ring-brand-100";

  return (
    <div className={`rounded-lg p-3 text-center ring-1 ${className}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  );
}
