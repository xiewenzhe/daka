"use client";

import type { AdminAnalysis } from "@/lib/analytics";

type AdminAnalyticsProps = {
  analysis: AdminAnalysis;
};

export function AdminAnalytics({ analysis }: AdminAnalyticsProps) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-brand-700">数据分析</p>
      <h2 className="mt-1 text-lg font-bold text-slate-950">
        最近 {analysis.days} 天
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="漏打总数" value={`${analysis.totalMissed} 次`} />
        <Metric label="补打总数" value={`${analysis.totalMakeup} 次`} />
        <Metric label="最容易漏" value={analysis.mostMissedSlot} />
        <Metric label="补打最多" value={analysis.mostMakeupSlot} />
      </div>

      <div className="mt-3 rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100">
        <p className="text-sm text-slate-500">补打最多的星期</p>
        <p className="mt-1 text-base font-bold text-slate-950">
          {analysis.mostMakeupWeekday}
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-brand-50 px-3 py-3 ring-1 ring-brand-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}
