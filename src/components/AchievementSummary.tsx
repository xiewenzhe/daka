"use client";

import type { WeeklyStats } from "@/lib/types";

type AchievementSummaryProps = {
  stats: WeeklyStats;
};

export function AchievementSummary({ stats }: AchievementSummaryProps) {
  const achievements = [
    {
      label: "连续 3 天",
      unlocked: stats.streakDays >= 3
    },
    {
      label: "连续 7 天",
      unlocked: stats.streakDays >= 7
    },
    {
      label: "连续 14 天",
      unlocked: stats.streakDays >= 14
    }
  ];

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-brand-100">
      <p className="text-sm font-semibold text-brand-700">成就徽章</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">
        已连续完成 {stats.streakDays} 天
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.label}
            className={`rounded-lg px-2 py-3 text-center ring-1 ${
              achievement.unlocked
                ? "bg-brand-50 text-brand-700 ring-brand-100"
                : "bg-slate-50 text-slate-400 ring-slate-100"
            }`}
          >
            <div className="text-2xl">{achievement.unlocked ? "★" : "☆"}</div>
            <p className="mt-1 text-xs font-bold">{achievement.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
